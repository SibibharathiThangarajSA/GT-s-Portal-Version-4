import { Session, StudyMaterial, Quiz, PersonalNote, User } from '../types';

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
        materialCategory: item?.materialCategory || 'Provided',
        materialType: item?.materialType || 'Provided',
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

  const providedMaterials = studyMaterials.filter((item) => {
    const category = (item.materialCategory || item.materialType || '').toString().toLowerCase();
    return category === 'provided' || category === 'official';
  });

  const additionalMaterials = studyMaterials.filter((item) => {
    const category = (item.materialCategory || item.materialType || '').toString().toLowerCase();
    return category === 'additional' || category === 'extra';
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

export const fetchStudyMaterialsApi = async (sessionId?: string): Promise<StudyMaterial[]> => {
  const url = sessionId ? `/api/materials?sessionId=${encodeURIComponent(sessionId)}` : '/api/materials';
  return await parseApiResponse<StudyMaterial[]>(await fetch(url));
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

export const uploadStudyMaterialFile = async (file: File, sessionId?: string): Promise<{ fileName: string; url: string; driveItemId?: string; webUrl?: string; downloadUrl?: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  if (sessionId) formData.append('sessionId', sessionId);

  const res = await fetch('/api/materials/files/upload', {
    method: 'POST',
    body: formData
  });

  return await parseApiResponse<any>(res);
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
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, data: data.data };
    }
    return { success: false, message: data.message || 'Authentication failed.' };
  } catch (err: any) {
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


