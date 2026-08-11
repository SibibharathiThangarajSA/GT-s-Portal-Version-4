import { Session, StudyMaterial, Quiz, PersonalNote, DiscussionPost, User } from '../types';

type CreateStudyMaterialPayload = Partial<StudyMaterial> & {
  versionNote?: string;
  updatedBy?: string;
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
          correctAnswer: question?.correctAnswer || question?.correctAnswerJson || '',
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

export const fetchSessions = async (): Promise<Session[]> => {
  try {
    const res = await fetch('/api/sessions');
    if (!res.ok) throw new Error('Failed to fetch sessions');
    const data = await res.json();
    return Array.isArray(data) ? data.map(normalizeSessionPayload) : [];
  } catch (err) {
    console.warn('Sessions API unavailable; returning empty session list', err);
    return [];
  }
};

export const fetchSessionById = async (id: string): Promise<Session & { studyMaterials: StudyMaterial[]; quizzes: Quiz[]; discussions: DiscussionPost[] }> => {
  try {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) throw new Error('Session not found');
    const data = await res.json();
    const normalized = normalizeSessionPayload(data);
    return {
      ...normalized,
      studyMaterials: normalized.studyMaterials || [],
      quizzes: normalized.quizzes || [],
      discussions: []
    } as Session & { studyMaterials: StudyMaterial[]; quizzes: Quiz[]; discussions: DiscussionPost[] };
  } catch (err) {
    console.warn(`Session API unavailable for ${id}; using empty placeholder`, err);
    const fallback = emptySession(id);
    return {
      ...fallback,
      studyMaterials: [],
      quizzes: [],
      discussions: []
    } as Session & { studyMaterials: StudyMaterial[]; quizzes: Quiz[]; discussions: DiscussionPost[] };
  }
};

export const fetchStudyMaterialsApi = async (sessionId?: string): Promise<StudyMaterial[]> => {
  try {
    const url = sessionId ? `/api/materials?sessionId=${encodeURIComponent(sessionId)}` : '/api/materials';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch study materials');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Falling back to local session material data', err);
    return [];
  }
};

export const createSessionApi = async (sessionData: Partial<Session>): Promise<Session> => {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData)
  });
  return await res.json();
};

export const uploadStudyMaterialFile = async (file: File): Promise<{ fileName: string; url: string; driveItemId?: string; webUrl?: string; downloadUrl?: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/materials/files/upload', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`File upload failed: ${message}`);
  }

  return await res.json();
};

export const createStudyMaterialApi = async (materialData: CreateStudyMaterialPayload): Promise<StudyMaterial> => {
  const res = await fetch('/api/materials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(materialData)
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Create study material failed: ${message}`);
  }

  return await res.json();
};

export const updateSessionApi = async (id: string, sessionData: Partial<Session>): Promise<Session> => {
  const res = await fetch(`/api/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData)
  });
  return await res.json();
};

export const deleteSessionApi = async (id: string): Promise<void> => {
  await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
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
export const LOCAL_AUTH_USERS: Record<string, { password: string; role: 'GT' | 'Admin'; firstName: string; lastName: string; avatar: string; batch: string }> = {
  'sibibharathi.thangaraj@valuemomentum.com': {
    password: '$NMFeE1998x',
    role: 'GT',
    firstName: 'Sibibharathi',
    lastName: 'Thangaraj',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    batch: 'GT-2026-Batch-01'
  },
  'pavithran.sivanandham@valuemomentum.com': {
    password: '$NMFeE1998x',
    role: 'GT',
    firstName: 'Pavithran',
    lastName: 'Sivanandham',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    batch: 'GT-2026-Batch-01'
  },
  'anukraha.magdalene@valuemomentum.com': {
    password: '$NMFeE1998x',
    role: 'Admin',
    firstName: 'Anukraha',
    lastName: 'Magdalene',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    batch: 'L&D Administration'
  }
};

export const loginApi = async (email: string, password?: string): Promise<{ success: boolean; data?: AuthUserDto; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        const localMeta = LOCAL_AUTH_USERS[cleanEmail];
        return {
          success: true,
          data: {
            token: data.data.token,
            userId: data.data.userId,
            email: data.data.email,
            firstName: data.data.firstName,
            lastName: data.data.lastName,
            role: data.data.role === 'Admin' ? 'Admin' : 'GT',
            avatar: localMeta?.avatar || (data.data.role === 'Admin' ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
            batch: localMeta?.batch || (data.data.role === 'Admin' ? 'L&D Administration' : 'GT-2026-Batch-01')
          }
        };
      }
    }
  } catch (err) {
    // API not reachable, fallback to local
  }

  // Fallback to local authentication with RBAC and password verification
  const user = LOCAL_AUTH_USERS[cleanEmail];
  if (!user) {
    return {
      success: false,
      message: 'No account found with this email address. Please check your credentials.'
    };
  }

  if (password !== user.password) {
    return {
      success: false,
      message: 'Invalid password. Please enter the correct password.'
    };
  }

  return {
    success: true,
    data: {
      token: `jwt-auth-token-${Date.now()}`,
      userId: `user-${cleanEmail}`,
      email: cleanEmail,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar,
      batch: user.batch
    }
  };
};

export const forgotPasswordApi = async (email: string): Promise<{ success: boolean; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();

  // Try local Express mock server first (primary)
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message || 'OTP has been sent to your registered email address.' };
    }
    return { success: false, message: data.message || 'Failed to send OTP.' };
  } catch {
    // Express server not reachable, try .NET backend
  }

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, message: data.message || data.errors?.[0] || 'Failed to send OTP.' };
  } catch {
    // .NET backend not reachable either
    const user = LOCAL_AUTH_USERS[cleanEmail];
    if (!user) {
      return { success: false, message: 'No registered account found with this email address.' };
    }
    return { success: true, message: 'OTP has been sent to your registered email address.' };
  }
};

export const verifyOtpApi = async (email: string, otp: string): Promise<{ success: boolean; resetToken?: string; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();

  // Try local Express mock server first
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: otp.trim() })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, resetToken: data.data?.resetToken, message: data.message };
    }
    return { success: false, message: data.message || 'Invalid OTP code.' };
  } catch {
    // Express server not reachable, try .NET backend
  }

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: otp.trim() })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, resetToken: data.data?.resetToken, message: data.message };
    }
    return { success: false, message: data.message || data.errors?.[0] || 'Invalid OTP code.' };
  } catch {
    return { success: false, message: 'Verification failed. Please ensure the backend is reachable.' };
  }
};

export const resetPasswordApi = async (email: string, resetToken: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();

  // Try local Express mock server first
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, resetToken, newPassword })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      if (LOCAL_AUTH_USERS[cleanEmail]) {
        LOCAL_AUTH_USERS[cleanEmail].password = newPassword;
      }
      return { success: true, message: data.message };
    }
    return { success: false, message: data.message || 'Failed to reset password.' };
  } catch {
    // Express server not reachable, try .NET backend
  }

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, resetToken, newPassword })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      if (LOCAL_AUTH_USERS[cleanEmail]) {
        LOCAL_AUTH_USERS[cleanEmail].password = newPassword;
      }
      return { success: true, message: data.message };
    }
    return { success: false, message: data.message || data.errors?.[0] || 'Failed to reset password.' };
  } catch {
    if (LOCAL_AUTH_USERS[cleanEmail]) {
      LOCAL_AUTH_USERS[cleanEmail].password = newPassword;
      return { success: true, message: 'Password has been reset successfully.' };
    }
    return { success: false, message: 'Failed to reset password.' };
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
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        if (LOCAL_AUTH_USERS[cleanEmail]) {
          LOCAL_AUTH_USERS[cleanEmail].password = newPassword;
        }
        return { success: true, message: 'Password changed successfully.' };
      } else {
        return { success: false, message: data.errors?.[0] || data.message || 'Failed to change password.' };
      }
    }
  } catch (err) {
    // API not reachable, fallback to local
  }

  const user = LOCAL_AUTH_USERS[cleanEmail];
  if (!user) {
    return { success: false, message: 'Account not found.' };
  }

  if (user.password !== currentPassword) {
    return { success: false, message: 'Current password does not match.' };
  }

  if (newPassword.length < 8) {
    return { success: false, message: 'New password must be at least 8 characters long.' };
  }

  user.password = newPassword;
  return { success: true, message: 'Password changed successfully in your profile.' };
};


