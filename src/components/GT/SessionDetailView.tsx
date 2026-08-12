import React, { useEffect, useState } from 'react';
import { Session, StudyMaterial, Quiz, PersonalNote } from '../../types';
import { InteractiveRoadmap } from './InteractiveRoadmap';
import { fetchStudyMaterialsApi, summarizeMaterialAiApi } from '../../services/api';
import { useFileUpload } from '../../hooks/useFileUpload';
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
  FolderPlus
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
  const categoryValue = (material.materialType || material.materialCategory || material.category || 'Provided').toString().toLowerCase();
  return categoryValue === 'additional' ? 'Additional' : 'Provided';
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
  const studyMaterials = [...(sessionData.studyMaterials || [])];
  const providedMap = new Map<string, StudyMaterial>();
  const additionalMap = new Map<string, StudyMaterial>();

  const addToMap = (materials: StudyMaterial[], map: Map<string, StudyMaterial>) => {
    materials.forEach(material => {
      const key = normalizeMaterialKey(material);
      if (!key) return;
      if (!providedMap.has(key) && !additionalMap.has(key)) {
        map.set(key, material);
      }
    });
  };

  addToMap(sessionData.providedMaterials || [], providedMap);
  addToMap(sessionData.additionalMaterials || [], additionalMap);

  studyMaterials
    .filter(material => getMaterialCategory(material) === 'Provided')
    .forEach(material => {
      const key = normalizeMaterialKey(material);
      if (!key) return;
      if (!providedMap.has(key) && !additionalMap.has(key)) {
        providedMap.set(key, material);
      }
    });

  studyMaterials
    .filter(material => getMaterialCategory(material) === 'Additional')
    .forEach(material => {
      const key = normalizeMaterialKey(material);
      if (!key) return;
      if (!additionalMap.has(key) && !providedMap.has(key)) {
        additionalMap.set(key, material);
      }
    });

  const providedItems = Array.from(providedMap.values()).map((material, idx) => ({
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

  const additionalItems = Array.from(additionalMap.values()).map((material, idx) => ({
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

  const assignmentItems = (sessionData.assignments || [])
    .filter((assignment: any) => assignment?.attachmentUrl)
    .map((assignment: any, idx: number) => ({
      id: `prov-assign-${idx}`,
      title: `${assignment.title} (Assignment Attachment)`,
      type: 'Doc (PDF/Word)' as CustomMaterialItem['type'],
      url: isValidMaterialUrl(assignment.attachmentUrl) ? assignment.attachmentUrl.trim() : '',
      description: assignment.instructions || 'Assignment attachment file',
      updatedAt: assignment.dueDate || 'Assignment',
      tags: ['Assignment'],
      fileSizeOrDuration: 'Attached File'
    }));

  return { provided: [...providedItems, ...assignmentItems], additional: additionalItems };
};

export const SessionDetailView: React.FC<SessionDetailViewProps> = ({
  session,
  onBack,
  onStartQuiz,
  initialTab,
  initialTopicId,
  onStateChange
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

  // Overview Video State
  //
  // The overview belongs to the session being viewed. This used to default to the shared C2C
  // video, so every session showed that same clip regardless of what had been uploaded for it,
  // and a session with no video of its own looked like it had one.
  const [overviewVideoUrl, setOverviewVideoUrl] = useState<string>(session.videoUrl || '');
  const [overviewVideoTitle, setOverviewVideoTitle] = useState<string>('Final overview');
  const [overviewVideoDesc, setOverviewVideoDesc] = useState<string>(
    `Comprehensive attendee video walkthrough covering key architectural concepts, trainer expectations, and session prerequisites for ${session.name}.`
  );
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

  // Provided Materials List
  const [providedMaterialsList, setProvidedMaterialsList] = useState<CustomMaterialItem[]>(() => {
    const initialMaterials = buildMaterialItemsFromSession(session);
    return initialMaterials.provided;
  });

  // Additional Materials List
  const [additionalMaterialsList, setAdditionalMaterialsList] = useState<CustomMaterialItem[]>(() => {
    const initialMaterials = buildMaterialItemsFromSession(session);
    return initialMaterials.additional;
  });

  // Opening a different session must swap the video with it; state initialised once would keep
  // showing the previous session's clip.
  useEffect(() => {
    setOverviewVideoUrl(session.videoUrl || '');
  }, [session.id, session.videoUrl]);

  useEffect(() => {
    let isActive = true;

    const loadMaterials = async () => {
      setIsMaterialsLoading(true);
      try {
        const apiMaterials = await fetchStudyMaterialsApi(session.id);
        const mergedMaterials = apiMaterials || [];

        const normalizedMaterials = buildMaterialItemsFromSession({
          ...session,
          studyMaterials: mergedMaterials,
          providedMaterials: session.providedMaterials || [],
          additionalMaterials: session.additionalMaterials || []
        });

        if (!isActive) return;

        setProvidedMaterialsList(normalizedMaterials.provided);
        setAdditionalMaterialsList(normalizedMaterials.additional);
      } catch (error) {
        console.error('Failed to load study materials', error);
        if (isActive) {
          const fallbackMaterials = buildMaterialItemsFromSession(session);
          setProvidedMaterialsList(fallbackMaterials.provided);
          setAdditionalMaterialsList(fallbackMaterials.additional);
        }
      } finally {
        if (isActive) {
          setIsMaterialsLoading(false);
        }
      }
    };

    loadMaterials();

    return () => {
      isActive = false;
    };
  }, [session.id, session.studyMaterials, session.providedMaterials, session.additionalMaterials]);

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

  // Notes state
  const [personalNotesList, setPersonalNotesList] = useState<PersonalNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  const selectedTopic = (session?.topics || []).find(t => t.id === selectedTopicId) || (session?.topics || [])[0];
  const activeQuiz = (session?.quizzes || [])[0];
  const assignmentsCount = (session?.assignments || []).length;
  const quizzesCount = (session?.quizzes || []).length;

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
    const newItem: CustomMaterialItem = {
      id: `prov-new-${Date.now()}`,
      title: matTitle,
      type: matType,
      url: '',
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
    const newItem: CustomMaterialItem = {
      id: `add-new-${Date.now()}`,
      title: matTitle,
      type: matType,
      url: '',
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
    const note: PersonalNote = {
      id: `note-${Date.now()}`,
      sessionId: session.id,
      topicId: selectedTopicId,
      topicTitle: 'Reference Notes',
      content: newNoteText,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setPersonalNotesList([note, ...personalNotesList]);
    setNewNoteText('');
  };

  const handleOpenMaterial = (material: CustomMaterialItem) => {
    if (material.file) {
      const blobUrl = URL.createObjectURL(material.file);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const openUrl = resolveMaterialUrl(material);
    if (openUrl) {
      window.open(openUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const content = [material.title, material.description].filter(Boolean).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMaterial = async (material: CustomMaterialItem) => {
    const baseName = (material.fileName || material.title || 'study-material').replace(/[\\/:*?"<>|]/g, '-');
    const extension = material.fileName?.split('.').pop() || material.fileType?.split('/')?.pop() || material.url?.split('.').pop() || 'bin';
    const downloadName = material.fileName ? material.fileName : `${baseName}.${extension}`;

    if (material.file) {
      const blobUrl = URL.createObjectURL(material.file);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // revoke after short delay to allow browser to process
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }

    const downloadUrl = resolveMaterialUrl(material);
    if (downloadUrl) {
      try {
        const response = await fetch(downloadUrl, { credentials: 'include' });
        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return;
      } catch {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = downloadName;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }
    }

    const content = [material.title, material.description].filter(Boolean).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
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
          Learning Track â€¢ {session.category}
        </span>
      </div>

      {/* ======================================================== */}
      {/* SESSION OVERVIEW VIDEO SECTION                           */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-lg space-y-4 relative overflow-hidden">
        <div className="space-y-1.5 pb-3 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono font-bold">
            <Video className="w-3.5 h-3.5 text-blue-600" />
            <span>Session Overview</span>
          </div>
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900">{session.name}</h2>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">{overviewVideoDesc}</p>
        </div>

        {/* Video Player Box - Fills available area in 16:9 aspect ratio */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-md flex items-center justify-center">
          {overviewVideoUrl ? (
            <video
              controls
              src={overviewVideoUrl}
              className="w-full h-full object-cover"
              poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80"
            >
              Your browser does not support HTML5 video streaming.
            </video>
          ) : (
            // Saying there is no video is more honest than playing an unrelated one.
            <div className="text-center space-y-2 px-6">
              <Video className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No overview video yet</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
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
          <span>Quiz ({quizzesCount})</span>
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
              <span>Interactive Session Roadmap â€” GTs can view this pathway for structured reference & topic progression.</span>
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
                  <span className="text-[11px] text-slate-500 font-mono">Provided by L&D â€¢ {mat.updatedAt}</span>
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
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold font-mono">
                  <FolderPlus className="w-3.5 h-3.5 text-purple-600" />
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
                      ? 'bg-purple-600 text-white shadow-sm'
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600"
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
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-purple-700 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200">
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
                      className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold px-3 py-2 rounded-xl border border-purple-200 flex items-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-purple-600" /> View
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

          {session.assignments && session.assignments.length > 0 ? (
            <div className="space-y-4">
              {session.assignments.map((assignment, idx) => (
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
                    <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700 flex flex-col gap-2">
                      <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-blue-700 font-bold">
                        <FileText className="w-4 h-4" /> Attached Resource
                      </div>
                      <div className="text-sm text-slate-800">
                        {assignment.attachmentName ? assignment.attachmentName : assignment.attachmentUrl}
                      </div>
                      {assignment.attachmentUrl && assignment.attachmentUrl.startsWith('http') && (
                        <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-700 font-bold text-sm">
                          Open Resource
                        </a>
                      )}
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
          <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-base font-extrabold text-slate-900">Session Quiz ({quizzesCount})</h3>
            <p className="text-slate-600 text-sm">Review the current quiz assessment and start when ready.</p>
          </div>

          {activeQuiz ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm max-w-full">
              <div className="space-y-5">
                <div>
                  <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">{activeQuiz.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {activeQuiz.description || 'Complete the assessment to check your understanding.'}
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-base font-medium text-slate-900 dark:text-white">Questions: {activeQuiz.questions.length}</p>
                  <button
                    type="button"
                    onClick={() => onStartQuiz(activeQuiz)}
                    className="w-full sm:w-[160px] h-12 rounded-[14px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all"
                  >
                    Start Quiz
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-600 text-sm">
              No quiz has been configured for this session yet. Ask your facilitator to add an assessment to the session.
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Your Reference Notes</h3>
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Record your insights, key syntax, or reminders for revision..."
              className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 resize-none"
            />
            <button
              onClick={handleAddNote}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5" /> Save Personal Note
            </button>
          </div>

          <div className="space-y-3">
            {personalNotesList.map((note) => (
              <div key={note.id} className="bg-white border border-slate-200 rounded-2xl p-4 text-xs space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 font-mono text-[10px]">
                  <span>{note.topicTitle}</span>
                  <span>{note.createdAt}</span>
                </div>
                <p className="text-slate-800 font-sans leading-relaxed">{note.content}</p>
              </div>
            ))}
          </div>
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
                  placeholder="e.g. Full Session Overview & Objectives Walkthrough"
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
                        // Uploaded rather than turned into an object URL, so the video survives the
                        // page and is playable by everyone else on the session.
                        try {
                          const uploadResult = await uploadFile(file, session.id);
                          if (!uploadResult) { setSelectedVideoFileName(''); return; }
                          setVideoInputUrl(uploadResult.downloadUrl || uploadResult.webUrl || uploadResult.url || '');
                        } catch (error: any) {
                          console.error('Video upload failed', error);
                          setSelectedVideoFileName('');
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  <div className="text-center text-[10px] text-slate-400 font-mono">â€” OR PASTE VIDEO URL â€”</div>

                  <input
                    type="url"
                    value={videoInputUrl}
                    onChange={(e) => setVideoInputUrl(e.target.value)}
                    placeholder="https://commondatastorage.googleapis.com/... or YouTube/Vimeo URL"
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
                  placeholder="e.g. Official C# Memory Profiling Guide"
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
                <FolderPlus className="w-5 h-5 text-purple-600" />
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
                  placeholder="e.g. Advanced Microservices Benchmark Whitepaper"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Source / Contributor Name</label>
                <input
                  type="text"
                  value={matSource}
                  onChange={(e) => setMatSource(e.target.value)}
                  placeholder="e.g. Alex Vance or External Tech Blog"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Material Type</label>
                <select
                  value={matType}
                  onChange={(e) => setMatType(e.target.value as CustomMaterialItem['type'])}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
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
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 resize-none"
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20"
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
