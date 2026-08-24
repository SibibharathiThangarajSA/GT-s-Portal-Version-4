import React, { useEffect, useState } from 'react';
import { Session, StudyMaterial, Quiz, SessionAssignment, PersonalNote, User } from '../../types';
import { InteractiveRoadmap } from './InteractiveRoadmap';
import { fetchStudyMaterialsApi, fetchAssignmentsApi, fetchQuizzesApi, createStudyMaterialApi, summarizeMaterialAiApi, fetchSessionById, fetchUserPersonalNotesApi, saveUserPersonalNotesApi } from '../../services/api';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useToast } from '../../context/ToastContext';
import { openDocument, downloadDocument } from '../../services/documentAccess';
import { UploadProgressOverlay } from '../UploadProgressOverlay';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Video,
  HelpCircle,
  MessageSquare,
  Award,
  Star,
  Play,
  Download,
  ExternalLink,
  Sparkles,
  Plus,
  Send,
  Bookmark,
  CheckCircle2,
  Clock,
  Layers,
  Edit3,
  X,
  Upload,
  Search,
  Filter,
  Presentation,
  FileSpreadsheet,
  Link as LinkIcon,
  FileCode,
  ShieldCheck,
  ClipboardList,
  FolderPlus,
  Lock,
  Pin,
  Trash2,
  Copy,
  Check
} from 'lucide-react';

interface CustomMaterialItem {
  id: string;
  title: string;
  type: 'Doc (PDF/Word)' | 'PowerPoint (PPT)' | 'Video Link' | 'Video File (MP4)' | 'Notes / Guide' | 'Spreadsheet';
  url: string;
  category?: 'Provided' | 'Additional';
  file?: File;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  webUrl?: string;
  downloadUrl?: string;
  topicId?: string;
  topicTitle?: string;
  author?: string;
  dateAdded?: string;
  description: string;
  updatedAt?: string;
  sourceOrAuthor?: string;
  tags?: string[];
  fileSizeOrDuration?: string;
}

interface SessionDetailViewProps {
  session: Session & { studyMaterials: StudyMaterial[]; quizzes: Quiz[] };
  onBack: () => void;
  onStartQuiz: (quiz: Quiz) => void;
  initialTab?: string;
  initialTopicId?: string;
  onStateChange?: (tab: string, topicId?: string) => void;
  currentUser?: User;
}

const providedMaterialMocks: Record<string, CustomMaterialItem[]> = {};
const additionalMaterialMocks: Record<string, CustomMaterialItem[]> = {};

const getMaterialDisplayType = (material: Partial<StudyMaterial> & { type?: string; urlType?: string }): CustomMaterialItem['type'] => {
  const normalizedType = (material.type || '').toLowerCase();
  const normalizedUrlType = (material.urlType || '').toLowerCase();

  if (normalizedType.includes('powerpoint') || normalizedType.includes('ppt')) {
    return 'PowerPoint (PPT)';
  }
  if (normalizedType.includes('video') || normalizedType.includes('youtube') || normalizedUrlType === 'video') {
    return normalizedType.includes('youtube') ? 'Video Link' : 'Video File (MP4)';
  }
  if (normalizedType.includes('excel') || normalizedType.includes('spreadsheet')) {
    return 'Spreadsheet';
  }
  if (normalizedType.includes('word') || normalizedType === 'pdf' || normalizedType.includes('pdf')) {
    return 'Doc (PDF/Word)';
  }
  if (normalizedType.includes('note') || normalizedType.includes('markdown')) {
    return 'Notes / Guide';
  }
  return 'Notes / Guide';
};

const getMaterialCategory = (material: Partial<StudyMaterial> & { materialCategory?: string; materialType?: string; category?: string }) => {
  const cat = (material.materialCategory || material.category || '').toString().toLowerCase();
  const typeVal = (material.materialType || '').toString().toLowerCase();
  if (cat === 'additional' || cat === 'extra' || cat === 'external' || typeVal === 'additional' || typeVal === 'extra') {
    return 'Additional';
  }
  return 'Provided';
};

const isValidMaterialUrl = (value?: string) => {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed !== '' && trimmed !== '#';
};

const resolveMaterialUrl = (material: Partial<StudyMaterial> | { url?: string; webUrl?: string; downloadUrl?: string }) => {
  const candidate = material.downloadUrl || material.webUrl || material.url || '';
  return isValidMaterialUrl(candidate) ? candidate.trim() : '';
};

const normalizeMaterialKey = (material: Partial<StudyMaterial>) => {
  if (!material || typeof material !== 'object') return '';
  if (material.id) return `id:${material.id}`;
  const url = resolveMaterialUrl(material).toLowerCase();
  const title = (material.title || '').trim().toLowerCase();
  const type = (material.type || material.urlType || material.materialCategory || material.materialType || '').toString().trim().toLowerCase();
  return `key:${url}|${title}|${type}`;
};

const buildMaterialItemsFromSession = (sessionData: Session & { studyMaterials?: StudyMaterial[]; providedMaterials?: StudyMaterial[]; additionalMaterials?: StudyMaterial[]; assignments?: any[] }) => {
  // studyMaterials is the authoritative list from the API; providedMaterials and
  // additionalMaterials are filtered views of that same list, built in normalizeSessionPayload.
  // Concatenating all three therefore listed every material twice - once from the full list and
  // once from whichever category view it also belonged to - which is where the duplicate cards
  // came from. The category split happens below, from this single source.
  const allMaterials = sessionData.studyMaterials?.length
    ? sessionData.studyMaterials
    : [...(sessionData.providedMaterials || []), ...(sessionData.additionalMaterials || [])];

  const providedItems = allMaterials
    .filter(m => (m.materialCategory || m.materialType || 'Provided').toLowerCase() !== 'additional')
    .map((material, idx) => ({
      id: `prov-${material.id || idx}`,
      title: material.title,
      type: getMaterialDisplayType(material),
      url: resolveMaterialUrl(material),
      webUrl: material.webUrl,
      downloadUrl: material.downloadUrl,
      file: material.file,
      fileName: material.fileName,
      fileType: material.fileType,
      description: material.description || 'Official study material provided for this session.',
      updatedAt: material.versions?.[0]?.updatedAt || 'Live from portal',
      sourceOrAuthor: material.versions?.[0]?.updatedBy || 'Portal',
      tags: material.tags || ['Official'],
      fileSizeOrDuration: material.durationOrPages || 'Live file'
    }));

  const additionalItems = allMaterials
    .filter(m => (m.materialCategory || m.materialType || '').toLowerCase() === 'additional')
    .map((material, idx) => ({
      id: `add-${material.id || idx}`,
      title: material.title,
      type: getMaterialDisplayType(material),
      url: resolveMaterialUrl(material),
      webUrl: material.webUrl,
      downloadUrl: material.downloadUrl,
      file: material.file,
      fileName: material.fileName,
      fileType: material.fileType,
      description: material.description || 'Supplementary reference material for this session.',
      updatedAt: material.versions?.[0]?.updatedAt || 'Live from portal',
      sourceOrAuthor: material.versions?.[0]?.updatedBy || 'Portal',
      tags: material.tags || ['Reference'],
      fileSizeOrDuration: material.durationOrPages || 'Live file'
    }));

  return { provided: providedItems, additional: additionalItems };
};

const DEFAULT_SESSION_SAMPLE_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const getEmbedUrl = (url: string): { type: 'youtube' | 'vimeo' | 'loom' | 'gdrive' | 'html5'; embedUrl: string } => {
  if (!url) return { type: 'html5', embedUrl: '' };

  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0` };
  }

  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
  if (loomMatch && loomMatch[1]) {
    return { type: 'loom', embedUrl: `https://www.loom.com/embed/${loomMatch[1]}` };
  }

  const gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
  if (gdriveMatch && gdriveMatch[1]) {
    return { type: 'gdrive', embedUrl: `https://drive.google.com/file/d/${gdriveMatch[1]}/preview` };
  }

  return { type: 'html5', embedUrl: url };
};

export const SessionDetailView: React.FC<SessionDetailViewProps> = ({
  session,
  onBack,
  onStartQuiz,
  initialTab,
  initialTopicId,
  onStateChange,
  currentUser
}) => {
  // 3 Primary Fields / Tabs: 'roadmap' (Road Map), 'provided-materials' (Provided Materials), 'additional-materials' (Additional Materials)
  const [activeTab, setActiveTab] = useState<'roadmap' | 'provided-materials' | 'additional-materials' | 'assignments' | 'quiz' | 'notes'>(
    (initialTab as any) || 'roadmap'
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId || '');

  const handleTabSelect = (tab: typeof activeTab) => {
    setActiveTab(tab);
    onStateChange?.(tab, selectedTopicId);
  };
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const { isUploading, progress, uploadingFileName, uploadFile } = useFileUpload();
  const { addToast } = useToast();

  // Overview Video State
  const [overviewVideoUrl, setOverviewVideoUrl] = useState<string>(
    (session as any).videoUrl || (session as any).featuredVideoUrl || DEFAULT_SESSION_SAMPLE_VIDEO
  );
  const [overviewVideoTitle, setOverviewVideoTitle] = useState<string>('Final overview');
  const [overviewVideoDesc, setOverviewVideoDesc] = useState<string>(
    `Comprehensive attendee video walkthrough covering key architectural concepts, trainer expectations, and session prerequisites for ${session.name}.`
  );

  useEffect(() => {
    const vid = (session as any).videoUrl || (session as any).featuredVideoUrl || DEFAULT_SESSION_SAMPLE_VIDEO;
    setOverviewVideoUrl(vid);
  }, [session.id, (session as any).videoUrl, (session as any).featuredVideoUrl]);

  const [isUploadingVideoModalOpen, setIsUploadingVideoModalOpen] = useState<boolean>(false);
  const [videoInputTitle, setVideoInputTitle] = useState<string>('');
  const [videoInputDesc, setVideoInputDesc] = useState<string>('');
  const [videoInputUrl, setVideoInputUrl] = useState<string>('');
  const [selectedVideoFileName, setSelectedVideoFileName] = useState<string>('');

  // Search & Filter State for Provided Materials
  const [providedSearch, setProvidedSearch] = useState('');
  const [providedFilterType, setProvidedFilterType] = useState<string>('All');

  // Search & Filter State for Additional Materials
  const [additionalSearch, setAdditionalSearch] = useState('');
  const [additionalFilterType, setAdditionalFilterType] = useState<string>('All');

  const [isMaterialsLoading, setIsMaterialsLoading] = useState(true);

  // Independent Content Types State
  const [providedMaterialsList, setProvidedMaterialsList] = useState<CustomMaterialItem[]>(() => {
    const initialMaterials = buildMaterialItemsFromSession(session);
    return initialMaterials.provided;
  });

  const [additionalMaterialsList, setAdditionalMaterialsList] = useState<CustomMaterialItem[]>(() => {
    const initialMaterials = buildMaterialItemsFromSession(session);
    return initialMaterials.additional;
  });

  const [assignmentsList, setAssignmentsList] = useState<SessionAssignment[]>(session.assignments || []);
  const [quizzesList, setQuizzesList] = useState<Quiz[]>(session.quizzes || []);

  useEffect(() => {
    const vid = (session as any).videoUrl || (session as any).featuredVideoUrl || '';
    if (vid) {
      setOverviewVideoUrl(vid);
    }
  }, [session.id, (session as any).videoUrl, (session as any).featuredVideoUrl]);

  useEffect(() => {
    let isActive = true;

    const loadSessionContent = async () => {
      setIsMaterialsLoading(true);
      try {
        const [freshSession, prov, add, assigns, qz] = await Promise.all([
          fetchSessionById(session.id).catch(() => null),
          fetchStudyMaterialsApi(session.id, 'Provided').catch(() => []),
          fetchStudyMaterialsApi(session.id, 'Additional').catch(() => []),
          fetchAssignmentsApi(session.id).catch(() => []),
          fetchQuizzesApi(session.id).catch(() => [])
        ]);

        if (!isActive) return;

        if (freshSession) {
          const freshVid = (freshSession as any).videoUrl || (freshSession as any).featuredVideoUrl || '';
          if (freshVid) {
            setOverviewVideoUrl(freshVid);
          }
        }

        const mapMaterial = (material: StudyMaterial, idx: number): CustomMaterialItem => ({
          id: material.id || `mat-${idx}`,
          title: material.title,
          type: getMaterialDisplayType(material),
          url: resolveMaterialUrl(material),
          webUrl: material.webUrl,
          downloadUrl: material.downloadUrl,
          file: material.file,
          fileName: material.fileName,
          fileType: material.fileType,
          description: material.description || (material.materialCategory === 'Additional' ? 'Supplementary reference material.' : 'Official study material.'),
          updatedAt: material.versions?.[0]?.updatedAt || 'Live from portal',
          sourceOrAuthor: material.versions?.[0]?.updatedBy || 'Portal',
          tags: material.tags && material.tags.length > 0 ? material.tags : [material.materialCategory || 'Provided'],
          fileSizeOrDuration: material.durationOrPages || 'Live file'
        });

        setProvidedMaterialsList(prov.map(mapMaterial));
        setAdditionalMaterialsList(add.map(mapMaterial));
        setAssignmentsList(assigns || []);
        setQuizzesList(qz || []);
      } catch (error) {
        console.error('Failed to load session content from API', error);
      } finally {
        if (isActive) {
          setIsMaterialsLoading(false);
        }
      }
    };

    loadSessionContent();

    return () => {
      isActive = false;
    };
  }, [session.id]);

  // Modals for Uploading Materials
  const [isUploadProvidedModalOpen, setIsUploadProvidedModalOpen] = useState(false);
  const [isUploadAdditionalModalOpen, setIsUploadAdditionalModalOpen] = useState(false);

  // New Material Form Fields
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState<CustomMaterialItem['type']>('Doc (PDF/Word)');
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matFileName, setMatFileName] = useState('');
  const [matSource, setMatSource] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matTags, setMatTags] = useState('');

  // User Scoping for Private Notes
  const userKey = (currentUser?.email || currentUser?.id || 'guest').trim().toLowerCase();
  const userName = currentUser?.name || currentUser?.email || 'Associate';
  const userEmail = currentUser?.email || userKey;

  // Notes state - Scoped strictly to currentUser and this session
  const [personalNotesList, setPersonalNotesList] = useState<PersonalNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [noteTopicId, setNoteTopicId] = useState<string>(initialTopicId || '');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [noteSearchQuery, setNoteSearchQuery] = useState<string>('');
  const [noteTopicFilter, setNoteTopicFilter] = useState<string>('All');

  // Load user-scoped personal notes on mount and whenever userKey or session.id changes
  useEffect(() => {
    let isMounted = true;
    const loadUserNotes = async () => {
      try {
        const stored = await fetchUserPersonalNotesApi(userKey, session.id);
        if (isMounted) {
          setPersonalNotesList(stored);
        }
      } catch (err) {
        console.warn('Failed to load notes for user:', userKey, err);
      }
    };
    loadUserNotes();
    return () => {
      isMounted = false;
    };
  }, [userKey, session.id]);

  const selectedTopic = (session?.topics || []).find(t => t.id === selectedTopicId) || (session?.topics || [])[0];
  const activeQuiz = quizzesList[0] || (session?.quizzes || [])[0];
  const assignmentsCount = assignmentsList.length;

  const handleSummarize = async (matId: string, title: string, desc: string) => {
    setSummarizingId(matId);
    try {
      const res = await summarizeMaterialAiApi(title, desc);
      setSummaries(prev => ({ ...prev, [matId]: res.summary }));
    } catch (err) {
      console.error(err);
    } finally {
      setSummarizingId(null);
    }
  };

  const handleSaveOverviewVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInputTitle.trim()) return;
    setOverviewVideoTitle(videoInputTitle);
    if (videoInputDesc.trim()) setOverviewVideoDesc(videoInputDesc);
    if (videoInputUrl.trim()) setOverviewVideoUrl(videoInputUrl);
    setIsUploadingVideoModalOpen(false);
    setVideoInputTitle('');
    setVideoInputDesc('');
    setVideoInputUrl('');
    setSelectedVideoFileName('');
  };

  const handleAddProvidedMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) return;
    const resolvedUrl = matFile ? URL.createObjectURL(matFile) : '';
    const newItem: CustomMaterialItem = {
      id: `prov-new-${Date.now()}`,
      title: matTitle,
      type: matType,
      url: resolvedUrl,
      file: matFile || undefined,
      fileName: matFileName || matFile?.name,
      fileType: matFile?.type,
      fileSizeOrDuration: matFileName ? `Uploaded: ${matFileName}` : 'Uploaded Document',
      description: matDesc || 'Uploaded organization study material.',
      updatedAt: 'Just now',
      tags: matTags ? matTags.split(',').map(t => t.trim()) : ['Provided', 'Official']
    };
    setProvidedMaterialsList([newItem, ...providedMaterialsList]);
    setIsUploadProvidedModalOpen(false);
    resetMatForm();
  };

  const handleAddAdditionalMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) return;
    const resolvedUrl = matFile ? URL.createObjectURL(matFile) : '';
    const newItem: CustomMaterialItem = {
      id: `add-new-${Date.now()}`,
      title: matTitle,
      type: matType,
      url: resolvedUrl,
      file: matFile || undefined,
      fileName: matFileName || matFile?.name,
      fileType: matFile?.type,
      description: matDesc || 'User uploaded additional reference material.',
      sourceOrAuthor: matSource || 'GT Trainee',
      updatedAt: 'Just now',
      tags: matTags ? matTags.split(',').map(t => t.trim()) : ['Additional', 'Reference'],
      fileSizeOrDuration: matFileName ? `Uploaded: ${matFileName}` : 'Uploaded Document'
    };
    setAdditionalMaterialsList([newItem, ...additionalMaterialsList]);
    setIsUploadAdditionalModalOpen(false);
    resetMatForm();
  };

  const resetMatForm = () => {
    setMatTitle('');
    setMatType('Doc (PDF/Word)');
    setMatFile(null);
    setMatFileName('');
    setMatSource('');
    setMatDesc('');
    setMatTags('');
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const targetTopicId = noteTopicId || selectedTopicId || (session?.topics || [])[0]?.id || 'general';
    const targetTopicTitle = (session?.topics || []).find(t => t.id === targetTopicId)?.title || 'General Session Note';
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newNote: PersonalNote = {
      id: `note-${userKey}-${session.id}-${Date.now()}`,
      userId: userKey,
      userEmail: userEmail,
      sessionId: session.id,
      topicId: targetTopicId,
      topicTitle: targetTopicTitle,
      content: newNoteText.trim(),
      isPinned: false,
      createdAt: formattedDate,
      updatedAt: formattedDate
    };

    const updatedList = [newNote, ...personalNotesList];
    setPersonalNotesList(updatedList);
    saveUserPersonalNotesApi(userKey, session.id, updatedList);
    setNewNoteText('');
    addToast('success', 'Private note saved securely to your profile!');
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedList = personalNotesList.filter(n => n.id !== noteId);
    setPersonalNotesList(updatedList);
    saveUserPersonalNotesApi(userKey, session.id, updatedList);
    addToast('info', 'Personal note removed.');
  };

  const handleTogglePinNote = (noteId: string) => {
    const updatedList = personalNotesList.map(n => n.id === noteId ? { ...n, isPinned: !n.isPinned } : n);
    setPersonalNotesList(updatedList);
    saveUserPersonalNotesApi(userKey, session.id, updatedList);
  };

  const handleStartEditNote = (note: PersonalNote) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.content);
  };

  const handleSaveEditNote = (noteId: string) => {
    if (!editingNoteText.trim()) return;
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const updatedList = personalNotesList.map(n => n.id === noteId ? { ...n, content: editingNoteText.trim(), updatedAt: formattedDate } : n);
    setPersonalNotesList(updatedList);
    saveUserPersonalNotesApi(userKey, session.id, updatedList);
    setEditingNoteId(null);
    setEditingNoteText('');
    addToast('success', 'Note updated successfully!');
  };

  const handleCopyNote = (note: PersonalNote) => {
    const text = `[${note.topicTitle}]\n${note.content}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
      addToast('success', 'Note copied to clipboard!');
    });
  };

  const handleExportAllNotes = () => {
    if (personalNotesList.length === 0) return;
    const header = `# Personal Notes: ${session.name}\nAssociate: ${userName} (${userEmail})\nExported: ${new Date().toLocaleString()}\nTotal Notes: ${personalNotesList.length}\n\n=========================================\n\n`;
    const body = personalNotesList.map((n, i) => `## Note ${i + 1}: ${n.topicTitle}\n**Created:** ${n.createdAt}\n\n${n.content}\n\n-----------------------------------------`).join('\n\n');
    const blob = new Blob([header + body], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Personal_Notes_${session.name.replace(/[^a-zA-Z0-9]/g, '_')}_${userName.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('success', 'Notes exported successfully!');
  };

  // View opens the stored document and does nothing else. It previously opened a blob URL when an
  // in-memory File was present - unreadable to anyone but the tab that made it - and, when no URL
  // resolved, generated a text file from the title and description and handed that over, which
  // reads as a corrupted document rather than a missing one.
  const handleOpenMaterial = (material: CustomMaterialItem) => {
    if (!openDocument(material)) {
      addToast('error', `No document is attached to "${material.title}" yet.`);
    }
  };

  // Download saves the document, and stays separate from View. A material with nothing attached
  // reports that rather than producing a text file built from its own description.
  const handleDownloadMaterial = async (material: CustomMaterialItem) => {
    if (!(await downloadDocument(material))) {
      addToast('error', `No document is attached to "${material.title}" yet.`);
    }
  };

  // Helper function for material type icon
  const renderTypeIcon = (type: CustomMaterialItem['type']) => {
    switch (type) {
      case 'Doc (PDF/Word)':
        return <FileText className="w-4 h-4 text-rose-500" />;
      case 'PowerPoint (PPT)':
        return <Presentation className="w-4 h-4 text-amber-500" />;
      case 'Video File (MP4)':
        return <Video className="w-4 h-4 text-purple-500" />;
      case 'Video Link':
        return <LinkIcon className="w-4 h-4 text-blue-500" />;
      case 'Notes / Guide':
        return <Edit3 className="w-4 h-4 text-emerald-500" />;
      default:
        return <FileText className="w-4 h-4 text-blue-500" />;
    }
  };

  const filteredProvided = providedMaterialsList.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(providedSearch.toLowerCase()) || item.description.toLowerCase().includes(providedSearch.toLowerCase());
    const matchesType = providedFilterType === 'All' || item.type.includes(providedFilterType);
    return matchesSearch && matchesType;
  });

  const filteredAdditional = additionalMaterialsList.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(additionalSearch.toLowerCase()) || item.description.toLowerCase().includes(additionalSearch.toLowerCase());
    const matchesType = additionalFilterType === 'All' || item.type.includes(additionalFilterType);
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 animate-fadeIn text-slate-900 dark:text-slate-100">
      <UploadProgressOverlay isUploading={isUploading} progress={progress} fileName={uploadingFileName} />

      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-blue-700 bg-slate-100 hover:bg-slate-200/80 px-4 py-2.5 rounded-xl border border-slate-200 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-blue-600" />
          <span>Back to Learning Sessions</span>
        </button>

        <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-3.5 py-1.5 rounded-lg border border-blue-200 shadow-sm">
          Learning Track – {session.category}
        </span>
      </div>

      {/* ======================================================== */}
      {/* SESSION OVERVIEW VIDEO SECTION                           */}
      {/* ======================================================== */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 relative overflow-hidden">
        <div className="space-y-1.5 pb-3 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono font-bold">
            <Video className="w-3.5 h-3.5 text-blue-600" />
            <span>Session Overview Video</span>
          </div>
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900">{session.name}</h2>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">{overviewVideoDesc}</p>
        </div>

        {/* Video Player Box - Fills available area in 16:9 aspect ratio */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/90 shadow-md flex items-center justify-center">
          {overviewVideoUrl ? (() => {
            const videoInfo = getEmbedUrl(overviewVideoUrl);
            if (['youtube', 'vimeo', 'loom', 'gdrive'].includes(videoInfo.type)) {
              return (
                <iframe
                  src={videoInfo.embedUrl}
                  title="Session Overview Video"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              );
            }
            return (
              <video
                controls
                playsInline
                key={overviewVideoUrl}
                src={overviewVideoUrl}
                className="w-full h-full object-contain bg-black"
                poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80"
              />
            );
          })() : (
            <div className="text-center space-y-2 px-6">
              <Video className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-slate-200">No overview video yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
                Once an overview video is uploaded for this session, it plays here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* THREE CORE FIELDS (Road Map, Provided Materials, Additional Materials) */}
      {/* ======================================================== */}
      <div className="bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">

        {/* Field 1: Road Map */}
        <button
          onClick={() => handleTabSelect('roadmap')}
          className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'roadmap'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'text-slate-700 hover:text-blue-700 hover:bg-slate-200/80'
            }`}
        >
          <Layers className={`w-4 h-4 ${activeTab === 'roadmap' ? 'text-white' : 'text-blue-600'}`} />
          <span>Road Map</span>
        </button>

        {/* Field 2: Provided Materials */}
        <button
          onClick={() => handleTabSelect('provided-materials')}
          className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'provided-materials'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'text-slate-700 hover:text-blue-700 hover:bg-slate-200/80'
            }`}
        >
          <FileText className={`w-4 h-4 ${activeTab === 'provided-materials' ? 'text-white' : 'text-blue-600'}`} />
          <span>Provided Materials ({providedMaterialsList.length})</span>
        </button>

        {/* Field 3: Additional Materials */}
        <button
          onClick={() => handleTabSelect('additional-materials')}
          className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'additional-materials'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'text-slate-700 hover:text-blue-700 hover:bg-slate-200/80'
            }`}
        >
          <FolderPlus className={`w-4 h-4 ${activeTab === 'additional-materials' ? 'text-white' : 'text-blue-600'}`} />
          <span>Additional Materials ({additionalMaterialsList.length})</span>
        </button>

        <button
          onClick={() => handleTabSelect('assignments')}
          className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'assignments'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'text-slate-700 hover:text-blue-700 hover:bg-slate-200/80'
            }`}
        >
          <ClipboardList className={`w-4 h-4 ${activeTab === 'assignments' ? 'text-white' : 'text-blue-600'}`} />
          <span>Assignments ({assignmentsCount})</span>
        </button>

        <button
          onClick={() => handleTabSelect('quiz')}
          className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'quiz'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'text-slate-700 hover:text-blue-700 hover:bg-slate-200/80'
            }`}
        >
          <HelpCircle className={`w-4 h-4 ${activeTab === 'quiz' ? 'text-white' : 'text-blue-600'}`} />
          <span>Quiz</span>
        </button>

        <div className="h-6 w-px bg-slate-300 my-auto mx-1" />

        <button
          onClick={() => handleTabSelect('notes')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'notes'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'text-slate-700 hover:text-blue-700 hover:bg-slate-200/80'
            }`}
        >
          <Edit3 className={`w-3.5 h-3.5 ${activeTab === 'notes' ? 'text-white' : 'text-blue-600'}`} />
          <span>Notes ({personalNotesList.length})</span>
        </button>

      </div>

      {/* ======================================================== */}
      {/* FIELD A: ROAD MAP VIEW (Interactive GT Roadmap)           */}
      {/* ======================================================== */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6 animate-fadeIn">
          {/* <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between text-xs"> */}
          {/* <div className="flex items-center gap-2 text-blue-900 font-medium">
              <Layers className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Interactive Session Roadmap — GTs can view this pathway for structured reference & topic progression.</span>
            </div> */}
          {/* <span className="font-mono text-[11px] font-bold text-blue-700 bg-white px-3 py-1 rounded-lg border border-blue-200">
              {(session?.topics || []).length} Topics Total
            </span> */}
          {/* </div> */}

          <InteractiveRoadmap
            topics={session?.topics || []}
            selectedTopicId={selectedTopicId}
            onSelectTopic={(id) => {
              const nextId = selectedTopicId === id ? '' : id;
              setSelectedTopicId(nextId);
              onStateChange?.(activeTab, nextId);
            }}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* FIELD B: PROVIDED MATERIALS VIEW                         */}
      {/* ======================================================== */}
      {activeTab === 'provided-materials' && (
        <div className="space-y-6 animate-fadeIn">

          {/* Action Header */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Official Organization Provided Materials</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">Provided Study Materials</h3>
                <p className="text-xs text-slate-600">
                  Access all official docs, PPTs, video links, notes, and video files provided by the organization for this session.
                </p>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
                {['All', 'Doc', 'PPT', 'Video', 'Notes'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setProvidedFilterType(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${providedFilterType === t
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search provided materials..."
                  value={providedSearch}
                  onChange={(e) => setProvidedSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Provided Materials List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProvided.map((mat) => (
              <div key={mat.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-blue-700 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200">
                      {renderTypeIcon(mat.type)}
                      <span>{mat.type}</span>
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{mat.fileSizeOrDuration}</span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900">{mat.title}</h4>
                  <p className="text-slate-600 text-xs leading-relaxed">{mat.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 font-mono">Provided by L&D – {mat.updatedAt}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenMaterial(mat)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-2 rounded-xl border border-blue-200 flex items-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-600" /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadMaterial(mat)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" /> Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FIELD C: ADDITIONAL MATERIALS VIEW                       */}
      {/* ======================================================== */}
      {activeTab === 'additional-materials' && (
        <div className="space-y-6 animate-fadeIn">

          {/* Action Header */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
                  <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Referenced & Additional Study Materials</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">Additional Reference Materials</h3>
                <p className="text-xs text-slate-600">
                  Explore additional docs, PPTs, video links, notes, and supplementary videos referenced by GT trainees and mentors.
                </p>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
                {['All', 'Doc', 'PPT', 'Video', 'Notes'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setAdditionalFilterType(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${additionalFilterType === t
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search additional materials..."
                  value={additionalSearch}
                  onChange={(e) => setAdditionalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Additional Materials List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAdditional.map((mat) => (
              <div key={mat.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-blue-700 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200">
                      {renderTypeIcon(mat.type)}
                      <span>{mat.type}</span>
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{mat.fileSizeOrDuration}</span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900">{mat.title}</h4>
                  <p className="text-slate-600 text-xs leading-relaxed">{mat.description}</p>

                  {mat.sourceOrAuthor && (
                    <div className="text-[11px] text-slate-600 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-fit">
                      Source/Contributor: <span className="text-slate-900 font-bold">{mat.sourceOrAuthor}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 font-mono">Added: {mat.updatedAt}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenMaterial(mat)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-2 rounded-xl border border-blue-200 flex items-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-600" /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadMaterial(mat)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" /> Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-base font-extrabold text-slate-900">Session Assignments ({assignmentsCount})</h3>
            <p className="text-slate-600 text-sm">Review required tasks, attached resources, due dates, and submission guidance for this session.</p>
          </div>

          {assignmentsList && assignmentsList.length > 0 ? (
            <div className="space-y-4">
              {assignmentsList.map((assignment, idx) => (
                <div key={assignment.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        <ClipboardList className="w-4 h-4 text-blue-600" />
                        <span>Assignment {idx + 1}</span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">{assignment.title}</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">{assignment.description}</p>
                    </div>

                    <div className="space-y-2 text-right text-[12px] text-slate-500">
                      <div>{assignment.dueDate ? `Due ${assignment.dueDate}` : 'No due date set'}</div>
                      <div>{assignment.totalPoints ? `${assignment.totalPoints} points` : 'Point value not set'}</div>
                      <div>{assignment.submissionFormat || 'Submission: URL / File'}</div>
                    </div>
                  </div>

                  {assignment.instructions && (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <strong className="font-semibold">Instructions:</strong> {assignment.instructions}
                    </div>
                  )}

                  {(assignment.attachmentName || assignment.attachmentUrl) && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 font-mono">Attached Resource Document</div>
                          <div className="text-sm font-bold text-slate-900 truncate max-w-md">
                            {assignment.attachmentName || (assignment.attachmentUrl?.split('/').pop()) || 'Assignment Document'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {assignment.attachmentUrl && (
                          <button
                            type="button"
                            // Same resolver as the material cards, so an assignment document opens
                            // exactly the way provided and additional materials do.
                            onClick={() => {
                              if (!openDocument(assignment)) {
                                addToast('error', `The document attached to "${assignment.title}" is no longer available.`);
                              }
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3.5 py-2 rounded-xl border border-blue-200 flex items-center gap-2 transition-colors shadow-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600" /> View
                          </button>
                        )}
                        {assignment.attachmentUrl && (
                          <button
                            type="button"
                            onClick={() => downloadDocument(assignment)}
                            className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 flex items-center gap-2 transition-colors shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" /> Download
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-semibold text-slate-700">{assignment.status || 'Pending'}</span>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700">{assignment.submissionFormat || 'URL / File'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-600 text-sm">
              No assignment posted yet.
            </div>
          )}
        </div>
      )}

      {/* Quiz Tab */}
      {activeTab === 'quiz' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 shadow-md space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Official Session Assessment</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Session Quiz</h3>
            <p className="text-slate-600 text-xs font-medium">
              Complete the session assessment to validate your understanding.
            </p>
          </div>

          {activeQuiz ? (
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-md max-w-full space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
                    Assessment Module
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-slate-500">
                    {activeQuiz.questions?.length || 0} Questions Total
                  </span>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                    {activeQuiz.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 font-medium">
                    {activeQuiz.description || 'Complete the assessment to check your understanding.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800">
                      Total Questions: <span className="font-mono text-blue-600">{activeQuiz.questions?.length || 0}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500 font-medium font-mono">
                      Passing Grade: {activeQuiz.passingScorePercent ?? 80}%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartQuiz(activeQuiz)}
                    className="w-full sm:w-auto px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5"
                  >
                    Start Quiz Assessment →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 shadow-md text-slate-600 text-sm font-medium">
              No quiz has been configured for this session yet. Ask your facilitator to add an assessment to the session.
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* FIELD E: USER-SCOPED PERSONAL NOTES TAB                  */}
      {/* ======================================================== */}
      {activeTab === 'notes' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Card with Privacy Lock Indicator & Export */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-slate-50 border border-blue-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300/80 text-emerald-800 text-xs font-bold shadow-xs">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Private to {userName} • Isolated per Associate</span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Your Private Reference Notes</h3>
              <p className="text-xs text-slate-600 font-medium max-w-xl leading-relaxed">
                Record personal key concepts, syntax reminders, and exam takeaways for <span className="font-semibold text-slate-800">{session.name}</span>. These notes are 100% private to you and never shared with other associates.
              </p>
            </div>

            {personalNotesList.length > 0 && (
              <button
                onClick={handleExportAllNotes}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm text-xs font-bold transition-all hover:-translate-y-0.5 whitespace-nowrap self-start sm:self-auto"
                title="Download all your notes as Markdown"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Export Notes ({personalNotesList.length})</span>
              </button>
            )}
          </div>

          {/* New Note Creator Box */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Add New Personal Note</span>
              </div>

              {/* Topic Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Topic:</span>
                <select
                  value={noteTopicId || selectedTopicId || (session?.topics || [])[0]?.id || ''}
                  onChange={(e) => setNoteTopicId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  <option value="general">General Session Notes</option>
                  {(session?.topics || []).map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Write your insights, important formulas, interview questions, or key takeaways for this topic..."
              className="w-full h-28 bg-slate-50/80 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all resize-none font-sans leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 font-mono">
                {newNoteText.length > 0 ? `${newNoteText.length} characters` : 'Auto-saved to your personal account'}
              </span>
              <button
                onClick={handleAddNote}
                disabled={!newNoteText.trim()}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${newNoteText.trim()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25 hover:-translate-y-0.5 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
                  }`}
              >
                <Plus className="w-4 h-4" />
                <span>Save Private Note</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar (if 2 or more notes exist) */}
          {personalNotesList.length > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-100/80 p-3 rounded-2xl border border-slate-200">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={noteSearchQuery}
                  onChange={(e) => setNoteSearchQuery(e.target.value)}
                  placeholder="Search your notes..."
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={noteTopicFilter}
                  onChange={(e) => setNoteTopicFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  <option value="All">All Topics ({personalNotesList.length})</option>
                  <option value="general">General Session Notes</option>
                  {(session?.topics || []).map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Notes Display List */}
          {personalNotesList.length > 0 ? (
            <div className="space-y-4">
              {(() => {
                const filtered = personalNotesList
                  .filter((n) => {
                    const matchesSearch = !noteSearchQuery.trim() || n.content.toLowerCase().includes(noteSearchQuery.toLowerCase()) || n.topicTitle.toLowerCase().includes(noteSearchQuery.toLowerCase());
                    const matchesTopic = noteTopicFilter === 'All' || n.topicId === noteTopicFilter;
                    return matchesSearch && matchesTopic;
                  })
                  .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
                      No notes matched your search query "{noteSearchQuery}".
                    </div>
                  );
                }

                return filtered.map((note) => {
                  const isEditing = editingNoteId === note.id;
                  const isCopied = copiedNoteId === note.id;

                  return (
                    <div
                      key={note.id}
                      className={`bg-white border rounded-2xl p-5 text-xs space-y-3 transition-all duration-200 ${note.isPinned
                        ? 'border-amber-300 bg-gradient-to-br from-amber-50/30 to-white shadow-md'
                        : 'border-slate-200/90 hover:border-slate-300 shadow-sm'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 font-mono text-[11px] font-bold">
                            {note.topicTitle}
                          </span>
                          {note.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />
                              <span>Pinned</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400">
                          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">{note.createdAt}</span>

                          {/* Pin Button */}
                          <button
                            onClick={() => handleTogglePinNote(note.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${note.isPinned ? 'text-amber-600 bg-amber-50' : 'hover:bg-slate-100 hover:text-slate-700'
                              }`}
                            title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-500' : ''}`} />
                          </button>

                          {/* Copy Button */}
                          <button
                            onClick={() => handleCopyNote(note)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Copy note content"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => (isEditing ? handleSaveEditNote(note.id) : handleStartEditNote(note))}
                            className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Edit note"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            className="w-full h-24 bg-slate-50 border border-blue-400 rounded-xl p-3 text-xs text-slate-900 focus:outline-none resize-none font-sans"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEditNote(note.id)}
                              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-800 font-sans text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                <Edit3 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">No Private Notes Saved Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Use the box above to write your key takeaways, interview questions, code snippets, or revision points for <span className="font-semibold text-slate-700">{session.name}</span>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: UPLOAD OVERVIEW VIDEO MODAL                     */}
      {/* ======================================================== */}
      {isUploadingVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">Upload Session Overview Video</h3>
              </div>
              <button
                onClick={() => setIsUploadingVideoModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOverviewVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Video Title</label>
                <input
                  type="text"
                  required
                  value={videoInputTitle}
                  onChange={(e) => setVideoInputTitle(e.target.value)}
                  placeholder="Full Session Overview & Objectives Walkthrough"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Overview Description</label>
                <textarea
                  rows={2}
                  value={videoInputDesc}
                  onChange={(e) => setVideoInputDesc(e.target.value)}
                  placeholder="Brief explanation of what attendees will watch in this video..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Upload Video File (MP4/WebM) or Enter URL</label>
                <div className="space-y-2">
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-blue-500 cursor-pointer bg-slate-50 transition-colors">
                    <Upload className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <span className="text-xs font-semibold block text-slate-700">
                      {selectedVideoFileName ? `Selected: ${selectedVideoFileName}` : 'Drag & drop MP4 overview video file or click to select'}
                    </span>
                    <span className="text-[10px] text-slate-400">Max file size: 500 MB</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setSelectedVideoFileName(file.name);
                        const localBlob = URL.createObjectURL(file);
                        setVideoInputUrl(localBlob);
                        try {
                          const uploadResult = await uploadFile(file, session.id);
                          if (uploadResult && (uploadResult.downloadUrl || uploadResult.webUrl || uploadResult.url)) {
                            setVideoInputUrl(uploadResult.downloadUrl || uploadResult.webUrl || uploadResult.url || localBlob);
                          }
                        } catch (error: any) {
                          console.error('Video upload failed, using local preview', error);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  <div className="text-center text-[10px] text-slate-400 font-mono">— OR PASTE VIDEO URL —</div>

                  <input
                    type="url"
                    value={videoInputUrl}
                    onChange={(e) => setVideoInputUrl(e.target.value)}
                    placeholder="https://vjs.zencdn.net/v/oceans.mp4 or YouTube/Vimeo URL"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadingVideoModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                >
                  Save Video Overview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: UPLOAD PROVIDED MATERIAL MODAL                  */}
      {/* ======================================================== */}
      {isUploadProvidedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">Upload Official Provided Material</h3>
              </div>
              <button onClick={() => setIsUploadProvidedModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProvidedMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Material Title</label>
                <input
                  type="text"
                  required
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  placeholder="Official C# Memory Profiling Guide"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Material Type</label>
                <select
                  value={matType}
                  onChange={(e) => setMatType(e.target.value as CustomMaterialItem['type'])}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="Doc (PDF/Word)">Doc (PDF / Word)</option>
                  <option value="PowerPoint (PPT)">PowerPoint (PPT)</option>
                  <option value="Video Link">Video Link (YouTube / Vimeo / External)</option>
                  <option value="Video File (MP4)">Video File (MP4 / WebM)</option>
                  <option value="Notes / Guide">Notes / Guide</option>
                  <option value="Spreadsheet">Spreadsheet (Excel / Sheets)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Upload File</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setMatFileName(e.target.files[0].name);
                        setMatFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={matDesc}
                  onChange={(e) => setMatDesc(e.target.value)}
                  placeholder="Summary of this material..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadProvidedModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                >
                  Upload Provided Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: UPLOAD ADDITIONAL MATERIAL MODAL                */}
      {/* ======================================================== */}
      {isUploadAdditionalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">Upload Additional Reference Material</h3>
              </div>
              <button onClick={() => setIsUploadAdditionalModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdditionalMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Material Title</label>
                <input
                  type="text"
                  required
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  placeholder="Advanced Microservices Benchmark Whitepaper"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Source / Contributor Name</label>
                <input
                  type="text"
                  value={matSource}
                  onChange={(e) => setMatSource(e.target.value)}
                  placeholder="Alex Vance or External Tech Blog"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Material Type</label>
                <select
                  value={matType}
                  onChange={(e) => setMatType(e.target.value as CustomMaterialItem['type'])}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="Doc (PDF/Word)">Doc (PDF / Word)</option>
                  <option value="PowerPoint (PPT)">PowerPoint (PPT)</option>
                  <option value="Video Link">Video Link (YouTube / Vimeo / External)</option>
                  <option value="Video File (MP4)">Video File (MP4 / WebM)</option>
                  <option value="Notes / Guide">Notes / Guide</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Upload File</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setMatFileName(e.target.files[0].name);
                        setMatFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={matDesc}
                  onChange={(e) => setMatDesc(e.target.value)}
                  placeholder="Summary of why this reference is helpful..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadAdditionalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                >
                  Upload Additional Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
