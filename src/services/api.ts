import { Session, StudyMaterial, Quiz, SessionAssignment, PersonalNote, User } from '../types';

type CreateStudyMaterialPayload = Partial<StudyMaterial> & {
  versionNote?: string;
  updatedBy?: string;
  driveItemId?: string;
  webUrl?: string;
  downloadUrl?: string;
};

const defaultGuestUser: User = {
  id: 'guest-user',
  name: 'Guest Learner',
  email: 'guest@gtportal.local',
  role: 'GT',
  batch: 'GT-Guest',
  xp: 0,
  level: 1,
  streakDays: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  dailyGoalMinutes: 45,
  todayMinutesSpent: 0,
  isGuest: true
};

const emptySession = (id: string): Session => ({
  id,
  name: 'Session unavailable',
  category: '.NET',
  description: 'This session is not currently available from the backend.',
  thumbnail: '',
  durationHours: 0,
  difficulty: 'Beginner',
  progressPercent: 0,
  isPublished: false,
  learningObjectives: [],
  topics: [],
  studyMaterials: [],
  quizzes: [],
  assignments: [],
  notes: [],
  rating: 0,
  ratingCount: 0
});

/**
 * The API stores a question's answer in correctAnswerJson, which holds JSON: a quoted string for
 * a single answer, an array for a multi-select. Passing that through untouched put the quotes on
 * screen ("Focuses on..." instead of Focuses on...) and made every answer compare as wrong.
 * Values written before this fix, and any plain text that was never encoded, are returned as-is.
 */
const parseCorrectAnswer = (value: any): string | string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string') return '';

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
    if (typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean') {
      return String(parsed);
    }
    return value;
  } catch {
    return value;
  }
};

export const normalizeSessionPayload = (raw: any): Session => {
  const learningObjectives = Array.isArray(raw?.learningObjectives)
    ? raw.learningObjectives.map((item: any) => typeof item === 'string' ? item : item?.objectiveText || item?.text || '')
    : [];

  const topics = Array.isArray(raw?.topics)
    ? raw.topics.map((topic: any) => ({
        id: topic?.id || `topic-${Math.random().toString(36).slice(2)}`,
        title: topic?.title || 'Topic',
        order: Number(topic?.order ?? topic?.orderIndex ?? 1),
        orderIndex: Number(topic?.orderIndex ?? topic?.order ?? 1),
        status: topic?.status || 'Unlocked',
        description: topic?.description || '',
        subtopics: Array.isArray(topic?.subtopics) ? topic.subtopics.map((sub: any) => ({
          id: sub?.id || `subtopic-${Math.random().toString(36).slice(2)}`,
          title: sub?.title || 'Subtopic',
          durationMinutes: Number(sub?.durationMinutes || 0),
          status: sub?.status || 'Unlocked',
          description: sub?.description || '',
          videoUrl: sub?.videoUrl || '',
          documentUrl: sub?.documentUrl || '',
          materialsUrl: sub?.materialsUrl || '',
          assignment: sub?.assignment || ''
        })) : [],
        videoUrl: topic?.videoUrl || '',
        documentUrl: topic?.documentUrl || '',
        materialsUrl: topic?.materialsUrl || '',
        assignment: topic?.assignment || ''
      }))
    : [];

  const studyMaterials = Array.isArray(raw?.studyMaterials)
    ? raw.studyMaterials.map((item: any) => ({
        id: item?.id || `material-${Math.random().toString(36).slice(2)}`,
        topicId: item?.topicId || undefined,
        sessionId: item?.sessionId || raw?.id || '',
        title: item?.title || 'Study Material',
        type: item?.type || 'PDF',
        url: item?.url || '',
        urlType: item?.urlType || 'Website',
        materialCategory: item?.materialCategory || item?.materialType || 'Provided',
        materialType: item?.materialType || item?.materialCategory || 'Provided',
        fileName: item?.fileName || '',
        fileType: item?.fileType || '',
        fileSize: item?.fileSize || '',
        course: item?.course || '',
        module: item?.module || '',
        description: item?.description || '',
        durationOrPages: item?.durationOrPages || '',
        webUrl: item?.webUrl || '',
        downloadUrl: item?.downloadUrl || '',
        currentVersion: Number(item?.currentVersion || 1),
        versions: Array.isArray(item?.versions) ? item.versions.map((version: any) => ({
          version: Number(version?.version ?? version?.versionNumber ?? 1),
          updatedAt: version?.updatedAt || version?.createdAt || new Date().toISOString(),
          updatedBy: version?.updatedBy || 'Admin',
          changeLog: version?.changeLog || 'Initial version',
          contentUrl: version?.contentUrl || ''
        })) : [],
        contentBody: item?.contentBody || '',
        tags: Array.isArray(item?.tags) ? item.tags : []
      }))
    : [];

  const quizzes = Array.isArray(raw?.quizzes)
    ? raw.quizzes.map((item: any) => ({
        id: item?.id || `quiz-${Math.random().toString(36).slice(2)}`,
        sessionId: item?.sessionId || raw?.id || '',
        topicId: item?.topicId || undefined,
        title: item?.title || 'Practice Quiz',
        description: item?.description || '',
        passingScorePercent: Number(item?.passingScorePercent || 70),
        timeLimitMinutes: Number(item?.timeLimitMinutes || 15),
        questions: Array.isArray(item?.questions) ? item.questions.map((question: any) => ({
          id: question?.id || `question-${Math.random().toString(36).slice(2)}`,
          type: question?.type || 'MCQ',
          prompt: question?.prompt || '',
          options: Array.isArray(question?.options) ? question.options : [],
          correctAnswer: question?.correctAnswer ?? parseCorrectAnswer(question?.correctAnswerJson),
          explanation: question?.explanation || '',
          points: Number(question?.points || 10),
          codeSnippet: question?.codeSnippet || '',
          matchPairs: Array.isArray(question?.matchPairs) ? question.matchPairs : []
        })) : []
      }))
    : [];

  const additionalMaterials = studyMaterials.filter((item) => {
    const category = (item.materialCategory || item.materialType || '').toString().toLowerCase();
    return category === 'additional' || category === 'extra' || category === 'external';
  });

  const providedMaterials = studyMaterials.filter((item) => {
    const category = (item.materialCategory || item.materialType || '').toString().toLowerCase();
    return category !== 'additional' && category !== 'extra' && category !== 'external';
  });

  const assignments = Array.isArray(raw?.assignments)
    ? raw.assignments.map((item: any) => ({
        id: item?.id || `assignment-${Math.random().toString(36).slice(2)}`,
        sessionId: item?.sessionId || raw?.id || '',
        topicId: item?.topicId || undefined,
        title: item?.title || 'Assignment',
        description: item?.description || '',
        dueDate: item?.dueDate || '',
        totalPoints: Number(item?.totalPoints || 0),
        instructions: item?.instructions || '',
        submissionFormat: item?.submissionFormat || '',
        attachmentName: item?.attachmentName || '',
        attachmentUrl: item?.attachmentUrl || '',
        status: item?.status || 'Pending',
        submittedUrl: item?.submittedUrl || '',
        submittedAt: item?.submittedAt || ''
      }))
    : [];

  return {
    id: raw?.id || '',
    name: raw?.name || 'Session',
    category: raw?.category || '.NET',
    description: raw?.description || '',
    thumbnail: raw?.thumbnail || raw?.thumbnailUrl || '',
    durationHours: Number(raw?.durationHours || 0),
    difficulty: raw?.difficulty || 'Beginner',
    progressPercent: Number(raw?.progressPercent || 0),
    isPublished: raw?.isPublished ?? (raw?.status === 'Published' || raw?.status === 'Publish'),
    learningObjectives,
    topics,
    studyMaterials,
    providedMaterials,
    additionalMaterials,
    quizzes,
    assignments,
    notes: Array.isArray(raw?.notes) ? raw.notes : [],
    rating: Number(raw?.rating || 0),
    ratingCount: Number(raw?.ratingCount || 0),
    trainerName: raw?.trainerName || '',
    status: raw?.status || (raw?.isPublished ? 'Published' : 'Draft'),
    videoUrl: raw?.videoUrl || raw?.featuredVideoUrl || ''
  } as Session;
};

export const fetchCurrentUser = async (): Promise<User> => {
  try {
    const res = await fetch('/api/user');
    if (!res.ok) throw new Error('Failed to fetch user');
    const data = await res.json();
    return {
      id: data?.id || defaultGuestUser.id,
      name: data?.name || `${data?.firstName || ''} ${data?.lastName || ''}`.trim() || defaultGuestUser.name,
      email: data?.email || defaultGuestUser.email,
      role: data?.role || 'GT',
      avatar: data?.avatar || '',
      batch: data?.batch || 'GT-2026-Batch-01',
      xp: Number(data?.xp || 0),
      level: Number(data?.level || 1),
      streakDays: Number(data?.streakDays || 0),
      lastActiveDate: data?.lastActiveDate || new Date().toISOString().split('T')[0],
      dailyGoalMinutes: Number(data?.dailyGoalMinutes || 45),
      todayMinutesSpent: Number(data?.todayMinutesSpent || 0),
      isGuest: false
    };
  } catch (err) {
    console.warn('User API unavailable; returning guest user state', err);
    return defaultGuestUser;
  }
};

const parseApiResponse = async <T>(res: Response): Promise<T> => {
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    if (text) {
      try {
        const json = JSON.parse(text);
        if (json?.message) message = json.message;
        else if (json?.error) message = json.error;
      } catch {
        // keep raw text
      }
    }
    throw new Error(message || `Request failed with status ${res.status}`);
  }

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
};

export const fetchSessions = async (): Promise<Session[]> => {
  const res = await fetch('/api/sessions');
  const data = await parseApiResponse<any>(res);
  return Array.isArray(data) ? data.map(normalizeSessionPayload) : [];
};

export const fetchSessionById = async (id: string): Promise<Session & { studyMaterials: StudyMaterial[]; quizzes: Quiz[] }> => {
  const res = await fetch(`/api/sessions/${id}`);
  const data = await parseApiResponse<any>(res);
  const normalized = normalizeSessionPayload(data);
  return {
    ...normalized,
    studyMaterials: normalized.studyMaterials || [],
    quizzes: normalized.quizzes || []
  } as Session & { studyMaterials: StudyMaterial[]; quizzes: Quiz[] };
};

export const fetchStudyMaterialsApi = async (sessionId?: string, category?: string): Promise<StudyMaterial[]> => {
  const params = new URLSearchParams();
  if (sessionId) params.append('sessionId', sessionId);
  if (category) params.append('category', category);
  const qs = params.toString();
  const url = qs ? `/api/materials?${qs}` : '/api/materials';
  return await parseApiResponse<StudyMaterial[]>(await fetch(url));
};

export const updateStudyMaterialApi = async (id: string, materialData: CreateStudyMaterialPayload): Promise<StudyMaterial> => {
  const res = await fetch(`/api/materials/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(materialData)
  });
  return await parseApiResponse<StudyMaterial>(res);
};

export const deleteStudyMaterialApi = async (id: string): Promise<void> => {
  const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete material failed: ${text}`);
  }
};

export const uploadMaterialFileApi = async (file: File): Promise<{ fileName: string; url: string; driveItemId?: string; webUrl?: string; downloadUrl?: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/materials/files/upload', {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || 'File upload failed.');
  }
  return await res.json();
};

// --- ASSIGNMENTS ---

export const fetchAssignmentsApi = async (sessionId?: string): Promise<SessionAssignment[]> => {
  const url = sessionId ? `/api/assignments?sessionId=${encodeURIComponent(sessionId)}` : '/api/assignments';
  const res = await fetch(url);
  return await parseApiResponse<SessionAssignment[]>(res);
};

export const fetchAssignmentById = async (id: string): Promise<SessionAssignment> => {
  const res = await fetch(`/api/assignments/${id}`);
  return await parseApiResponse<SessionAssignment>(res);
};

export const createAssignmentApi = async (assignment: Partial<SessionAssignment>): Promise<SessionAssignment> => {
  const res = await fetch('/api/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignment)
  });
  return await parseApiResponse<SessionAssignment>(res);
};

export const updateAssignmentApi = async (id: string, assignment: Partial<SessionAssignment>): Promise<SessionAssignment> => {
  const res = await fetch(`/api/assignments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignment)
  });
  return await parseApiResponse<SessionAssignment>(res);
};

export const deleteAssignmentApi = async (id: string): Promise<void> => {
  const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete assignment failed: ${text}`);
  }
};

// --- QUIZZES ---

export const fetchQuizzesApi = async (sessionId?: string): Promise<Quiz[]> => {
  const url = sessionId ? `/api/quizzes?sessionId=${encodeURIComponent(sessionId)}` : '/api/quizzes';
  const res = await fetch(url);
  return await parseApiResponse<Quiz[]>(res);
};

export const fetchQuizById = async (id: string): Promise<Quiz> => {
  const res = await fetch(`/api/quizzes/${id}`);
  return await parseApiResponse<Quiz>(res);
};

export const createQuizApi = async (quiz: Partial<Quiz>): Promise<Quiz> => {
  const res = await fetch('/api/quizzes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quiz)
  });
  return await parseApiResponse<Quiz>(res);
};

export const updateQuizApi = async (id: string, quiz: Partial<Quiz>): Promise<Quiz> => {
  const res = await fetch(`/api/quizzes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quiz)
  });
  return await parseApiResponse<Quiz>(res);
};

export const deleteQuizApi = async (id: string): Promise<void> => {
  const res = await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete quiz failed: ${text}`);
  }
};

export const createSessionApi = async (sessionData: Partial<Session>): Promise<Session> => {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData)
  });

  const data = await parseApiResponse<any>(res);
  return normalizeSessionPayload(data);
};

export const uploadStudyMaterialFile = (
  file: File,
  sessionId?: string,
  onProgress?: (percent: number) => void
): Promise<{ fileName: string; url: string; driveItemId?: string; webUrl?: string; downloadUrl?: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  if (sessionId) formData.append('sessionId', sessionId);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/materials/files/upload');

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          resolve(JSON.parse(request.responseText));
        } catch {
          reject(new Error('The upload finished but the response could not be read.'));
        }
        return;
      }

      let message = `Upload failed with status ${request.status}.`;
      try {
        const errorJson = JSON.parse(request.responseText);
        message = errorJson?.message || errorJson?.error || message;
      } catch {
      }
      reject(new Error(message));
    };

    request.onerror = () => reject(new Error('The upload failed. Ensure the backend API server is running on port 5000 and has sufficient storage.'));
    request.onabort = () => reject(new Error('The upload was cancelled.'));

    request.send(formData);
  });
};

export const createStudyMaterialApi = async (materialData: CreateStudyMaterialPayload): Promise<StudyMaterial> => {
  const res = await fetch('/api/materials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(materialData)
  });

  return await parseApiResponse<StudyMaterial>(res);
};

export const updateSessionApi = async (id: string, sessionData: Partial<Session>): Promise<Session> => {
  const res = await fetch(`/api/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData)
  });

  const data = await parseApiResponse<any>(res);
  return normalizeSessionPayload(data);
};

export const deleteSessionApi = async (id: string): Promise<void> => {
  const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete session failed: ${text}`);
  }
};

export const submitQuizApi = async (quizId: string, userAnswers: Record<string, any>) => {
  const res = await fetch(`/api/quizzes/${quizId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userAnswers })
  });
  return await res.json();
};

const isGuid = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

export const saveFullSessionApi = async (sessionData: Partial<Session>): Promise<Session> => {
  // 1. Persist Session core
  let savedSession: Session;
  const isExisting = sessionData.id && isGuid(sessionData.id);

  const sessionPayload = {
    name: sessionData.name || 'Untitled Session',
    category: sessionData.category || '.NET',
    description: sessionData.description || '',
    thumbnailUrl: sessionData.thumbnail || '',
    trainerName: sessionData.trainerName || 'Lead Trainer',
    durationHours: Number(sessionData.durationHours) || 10,
    difficulty: sessionData.difficulty || 'Intermediate',
    status: sessionData.status || 'Draft',
    isPublished: !!sessionData.isPublished,
    sortOrder: 999,
    featuredVideoUrl: sessionData.videoUrl || (sessionData as any).featuredVideoUrl || null,
    topics: (sessionData.topics || []).map((t, tIdx) => ({
      id: isGuid(t.id) ? t.id : undefined,
      title: t.title,
      description: t.description,
      orderIndex: tIdx + 1,
      defaultStatus: t.status || 'Unlocked',
      videoUrl: t.videoUrl || null,
      documentUrl: t.documentUrl || null,
      assignment: t.assignment || null,
      subtopics: (t.subtopics || []).map((st, stIdx) => ({
        id: isGuid(st.id) ? st.id : undefined,
        title: st.title,
        durationMinutes: Number(st.durationMinutes) || 30,
        orderIndex: stIdx + 1,
        defaultStatus: st.status || 'Unlocked',
        description: st.description || null,
        videoUrl: st.videoUrl || null,
        documentUrl: st.documentUrl || null
      }))
    }))
  };

  if (isExisting) {
    try {
      savedSession = await updateSessionApi(sessionData.id!, sessionPayload);
    } catch {
      savedSession = await createSessionApi({ ...sessionPayload, id: sessionData.id });
    }
  } else {
    savedSession = await createSessionApi(sessionPayload);
  }

  const targetSessionId = savedSession.id;

  // 2. Persist Provided Materials
  const providedMaterials = sessionData.providedMaterials || [];
  for (const mat of providedMaterials) {
    let fileUrl = mat.url || '';
    if (mat.file) {
      try {
        const uploadResult = await uploadMaterialFileApi(mat.file);
        fileUrl = uploadResult.url || uploadResult.webUrl || fileUrl;
      } catch (err) {
        console.warn('File upload failed for provided material', err);
      }
    }

    const payload: Partial<StudyMaterial> = {
      sessionId: targetSessionId,
      title: mat.title || 'Official Provided Material',
      materialCategory: 'Provided',
      materialType: 'Provided',
      type: mat.type || 'PDF',
      url: fileUrl,
      description: mat.description || '',
      durationOrPages: mat.durationOrPages || '',
      fileName: mat.fileName || (mat.file ? mat.file.name : undefined),
      tags: mat.tags || ['Provided', 'Official']
    };

    if (mat.id && isGuid(mat.id)) {
      await updateStudyMaterialApi(mat.id, payload).catch(err => console.warn('Failed to update provided material', err));
    } else {
      await createStudyMaterialApi(payload).catch(err => console.warn('Failed to create provided material', err));
    }
  }

  // 3. Persist Additional Materials
  const additionalMaterials = sessionData.additionalMaterials || [];
  for (const mat of additionalMaterials) {
    let fileUrl = mat.url || '';
    if (mat.file) {
      try {
        const uploadResult = await uploadMaterialFileApi(mat.file);
        fileUrl = uploadResult.url || uploadResult.webUrl || fileUrl;
      } catch (err) {
        console.warn('File upload failed for additional material', err);
      }
    }

    const payload: Partial<StudyMaterial> = {
      sessionId: targetSessionId,
      title: mat.title || 'Supplementary Material',
      materialCategory: 'Additional',
      materialType: 'Additional',
      type: mat.type || 'External',
      url: fileUrl,
      description: mat.description || '',
      durationOrPages: mat.durationOrPages || '',
      fileName: mat.fileName || (mat.file ? mat.file.name : undefined),
      tags: mat.tags || ['Additional', 'Reference']
    };

    if (mat.id && isGuid(mat.id)) {
      await updateStudyMaterialApi(mat.id, payload).catch(err => console.warn('Failed to update additional material', err));
    } else {
      await createStudyMaterialApi(payload).catch(err => console.warn('Failed to create additional material', err));
    }
  }

  // 4. Persist Assignments
  const assignments = sessionData.assignments || [];
  for (const assign of assignments) {
    const payload: Partial<SessionAssignment> = {
      sessionId: targetSessionId,
      title: assign.title || 'Session Assignment',
      description: assign.description || '',
      dueDate: assign.dueDate || undefined,
      totalPoints: Number(assign.totalPoints) || 100,
      instructions: assign.instructions || '',
      submissionFormat: assign.submissionFormat || 'URL / File',
      attachmentName: assign.attachmentName || undefined,
      attachmentUrl: assign.attachmentUrl || undefined
    };

    if (assign.id && isGuid(assign.id)) {
      await updateAssignmentApi(assign.id, payload).catch(err => console.warn('Failed to update assignment', err));
    } else {
      await createAssignmentApi(payload).catch(err => console.warn('Failed to create assignment', err));
    }
  }

  // 5. Persist Quizzes
  const quizzes = sessionData.quizzes || [];
  for (const quiz of quizzes) {
    const formattedQuestions = (quiz.questions || []).map((q, idx) => ({
      id: isGuid(q.id) ? q.id : undefined,
      type: q.type || 'MCQ',
      prompt: q.prompt || '',
      options: q.options || ['True', 'False'],
      correctAnswerJson: typeof q.correctAnswer === 'string' ? q.correctAnswer : JSON.stringify(q.correctAnswer || ''),
      explanation: q.explanation || '',
      points: Number(q.points) || 10,
      orderIndex: idx + 1
    }));

    const payload: any = {
      sessionId: targetSessionId,
      title: quiz.title || `${sessionData.name} Assessment`,
      description: quiz.description || '',
      passingScorePercent: Number(quiz.passingScorePercent) || 80,
      timeLimitMinutes: Number(quiz.timeLimitMinutes) || 15,
      questions: formattedQuestions
    };

    if (quiz.id && isGuid(quiz.id)) {
      await updateQuizApi(quiz.id, payload).catch(err => console.warn('Failed to update quiz', err));
    } else {
      await createQuizApi(payload).catch(err => console.warn('Failed to create quiz', err));
    }
  }

  // 6. Reload fresh persisted session from backend
  return await fetchSessionById(targetSessionId);
};

export const sendAiChatMessageApi = async (message: string, context?: any, chatHistory?: any[]) => {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, chatHistory })
    });
    return await res.json();
  } catch (err) {
    return { reply: "I am ready to assist you with your learning goals!" };
  }
};

export const summarizeMaterialAiApi = async (title: string, content: string) => {
  try {
    const res = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
    return await res.json();
  } catch (err) {
    return { summary: `### Summary of ${title}\n- Core topic: Enterprise Development.\n- Key concept: Modular architecture and clean code.` };
  }
};

export const generateQuizAiApi = async (topicName: string, textContent?: string, numQuestions: number = 4) => {
  try {
    const res = await fetch('/api/ai/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicName, textContent, numQuestions })
    });
    return await res.json();
  } catch (err) {
    return {
      quizTitle: `Practice Quiz: ${topicName}`,
      questions: [
        {
          id: 'ai-q1',
          type: 'MCQ',
          prompt: `What is the primary benefit of ${topicName}?`,
          options: ['Improved Maintainability', 'Faster CPU clock', 'Automatic DB backup', 'None'],
          correctAnswer: 'Improved Maintainability',
          explanation: 'Modular design isolates responsibilities.'
        }
      ]
    };
  }
};

export const generateAiQuizApi = generateQuizAiApi;
export const fetchSessionsApi = fetchSessions;

export const fetchAnalyticsApi = async () => {
  try {
    const res = await fetch('/api/analytics');
    return await res.json();
  } catch (err) {
    return {
      totalSessions: 6,
      totalGTs: 124,
      totalActiveUsers: 88,
      averageProgress: 68,
      averageQuizScore: 84,
      mostViewedSession: ".NET with C#",
      leastViewedSession: "Azure Cloud",
      mostDifficultTopic: "Async Programming",
      completionTrends: [
        { month: 'Jan', completed: 24, avgScore: 78 },
        { month: 'Feb', completed: 35, avgScore: 81 },
        { month: 'Mar', completed: 48, avgScore: 82 },
        { month: 'Apr', completed: 62, avgScore: 85 },
        { month: 'May', completed: 79, avgScore: 84 },
        { month: 'Jun', completed: 95, avgScore: 88 }
      ],
      trackProgressList: [
        { name: 'Insurance Domain', progress: 65 },
        { name: '.NET with C#', progress: 80 },
        { name: 'Frontend React', progress: 95 },
        { name: 'SQL & Database', progress: 55 },
        { name: 'Azure Cloud', progress: 20 }
      ]
    };
  }
};

export const searchEnterpriseApi = async (query: string) => {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    return await res.json();
  } catch (err) {
    return { sessions: [], materials: [], quizzes: [] };
  }
};

export const logActivityApi = async (action: string, details?: string) => {
  try {
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, details, timestamp: new Date().toISOString() })
    });
  } catch (err) {
    console.warn('Failed to log activity', err);
  }
};

export interface AuthUserDto {
  token: string;
  userId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'GT' | 'Admin';
  avatar?: string;
  batch?: string;
}

// Registered accounts with password hash / credentials
// Local auth fallbacks removed: use backend auth endpoints only.

export const loginApi = async (email: string, password?: string): Promise<{ success: boolean; data?: AuthUserDto; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, data: data.data };
    }
    return { success: false, message: data.message || data.error || 'Invalid credentials. Please check your email and password.' };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { success: false, message: 'Authentication timed out. Ensure the backend API server is running on port 5000.' };
    }
    return { success: false, message: `Authentication request failed: ${err?.message || String(err)}` };
  }
};

export const forgotPasswordApi = async (email: string): Promise<{ success: boolean; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { success: true, message: data.message };
    return { success: false, message: data.message || 'Failed to send OTP.' };
  } catch (err: any) {
    return { success: false, message: `Request failed: ${err?.message || String(err)}` };
  }
};

export const verifyOtpApi = async (email: string, otp: string): Promise<{ success: boolean; resetToken?: string; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: otp.trim() })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { success: true, resetToken: data.data?.resetToken, message: data.message };
    return { success: false, message: data.message || 'Invalid OTP code.' };
  } catch (err: any) {
    return { success: false, message: `Request failed: ${err?.message || String(err)}` };
  }
};

export const resetPasswordApi = async (email: string, resetToken: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, resetToken, newPassword })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { success: true, message: data.message };
    return { success: false, message: data.message || 'Failed to reset password.' };
  } catch (err: any) {
    return { success: false, message: `Request failed: ${err?.message || String(err)}` };
  }
};

export const changePasswordApi = async (email: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, currentPassword, newPassword })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { success: true, message: data.message };
    return { success: false, message: data.message || 'Failed to change password.' };
  } catch (err: any) {
    return { success: false, message: `Request failed: ${err?.message || String(err)}` };
  }
};


