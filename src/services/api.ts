import { Session, StudyMaterial, Quiz, SessionAssignment, PersonalNote, DiscussionPost, User } from '../types';

const isGuid = (val?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '');

/**
 * All requests go to relative /api/* paths. The Node server proxies them to the .NET
 * API (see server.ts), so there is no hardcoded host here and no CORS to configure —
 * browser, proxy and API share an origin.
 *
 * This module previously shipped a LOCAL_AUTH_USERS table containing real passwords
 * and, when the API was unreachable, authenticated against it and minted a fake token.
 * Both are gone: credentials are never verified in the browser.
 */

const TOKEN_KEY = 'token';

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const clearAuthToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode); nothing to clear */
  }
};

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Shape returned by the .NET ApiResponse<T> envelope. */
interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, { ...init, headers });

  if (res.status === 401) {
    // The token is missing, expired or rejected. Drop it so the UI can re-prompt.
    clearAuthToken();
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message || body?.errors?.[0] || `Request failed (${res.status}).`;
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

/** Unwraps the .NET ApiResponse<T> envelope used by the auth endpoints. */
async function apiFetchEnvelope<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, { ...init, headers });
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!body) {
    throw new ApiError(`Request failed (${res.status}).`, res.status);
  }

  return body;
}

// --- USER ---

export const fetchCurrentUser = async (): Promise<User> =>
  apiFetch<User>('/api/user');

export const updateDailyGoalApi = async (dailyGoalMinutes: number): Promise<User> =>
  apiFetch<User>('/api/user/goal', {
    method: 'POST',
    body: JSON.stringify({ dailyGoalMinutes })
  });

// --- SESSIONS ---

export const fetchSessions = async (): Promise<Session[]> =>
  apiFetch<Session[]>('/api/sessions');

export const fetchSessionById = async (id: string): Promise<Session> =>
  apiFetch<Session>(`/api/sessions/${id}`);

export const createSessionApi = async (sessionData: Partial<Session>): Promise<Session> =>
  apiFetch<Session>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(sessionData)
  });

export const updateSessionApi = async (id: string, sessionData: Partial<Session>): Promise<Session> =>
  apiFetch<Session>(`/api/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(sessionData)
  });

export const deleteSessionApi = async (id: string): Promise<void> =>
  apiFetch<void>(`/api/sessions/${id}`, { method: 'DELETE' });

// --- STUDY MATERIALS (Provided & Additional) ---

export const fetchStudyMaterialsApi = async (sessionId?: string, category?: string): Promise<StudyMaterial[]> => {
  const params = new URLSearchParams();
  if (sessionId) params.append('sessionId', sessionId);
  if (category) params.append('category', category);
  const qs = params.toString();
  return apiFetch<StudyMaterial[]>(qs ? `/api/materials?${qs}` : '/api/materials');
};

export const createStudyMaterialApi = async (material: Partial<StudyMaterial>): Promise<StudyMaterial> =>
  apiFetch<StudyMaterial>('/api/materials', {
    method: 'POST',
    body: JSON.stringify(material)
  });

export const updateStudyMaterialApi = async (id: string, material: Partial<StudyMaterial>): Promise<StudyMaterial> =>
  apiFetch<StudyMaterial>(`/api/materials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(material)
  });

export const deleteStudyMaterialApi = async (id: string): Promise<void> =>
  apiFetch<void>(`/api/materials/${id}`, { method: 'DELETE' });

export const uploadMaterialFileApi = async (file: File): Promise<{ fileName: string; url: string; driveItemId?: string; webUrl?: string; downloadUrl?: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const token = getAuthToken();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch('/api/materials/files/upload', {
    method: 'POST',
    headers,
    body: formData
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(errorBody?.message || 'File upload failed.', res.status);
  }
  return await res.json();
};

export const addMaterialVersionApi = async (
  materialId: string,
  payload: { changeLog?: string; contentBody?: string; contentUrl?: string; updatedBy?: string }
): Promise<StudyMaterial> =>
  apiFetch<StudyMaterial>(`/api/materials/${materialId}/new-version`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

// --- ASSIGNMENTS ---

export const fetchAssignmentsApi = async (sessionId?: string): Promise<SessionAssignment[]> => {
  const url = sessionId
    ? `/api/assignments?sessionId=${encodeURIComponent(sessionId)}`
    : '/api/assignments';
  return apiFetch<SessionAssignment[]>(url);
};

export const fetchAssignmentById = async (id: string): Promise<SessionAssignment> =>
  apiFetch<SessionAssignment>(`/api/assignments/${id}`);

export const createAssignmentApi = async (assignment: Partial<SessionAssignment>): Promise<SessionAssignment> =>
  apiFetch<SessionAssignment>('/api/assignments', {
    method: 'POST',
    body: JSON.stringify(assignment)
  });

export const updateAssignmentApi = async (id: string, assignment: Partial<SessionAssignment>): Promise<SessionAssignment> =>
  apiFetch<SessionAssignment>(`/api/assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(assignment)
  });

export const deleteAssignmentApi = async (id: string): Promise<void> =>
  apiFetch<void>(`/api/assignments/${id}`, { method: 'DELETE' });

// --- QUIZZES ---

export const fetchQuizzesApi = async (sessionId?: string): Promise<Quiz[]> => {
  const url = sessionId
    ? `/api/quizzes?sessionId=${encodeURIComponent(sessionId)}`
    : '/api/quizzes';
  return apiFetch<Quiz[]>(url);
};

export const fetchQuizById = async (id: string): Promise<Quiz> =>
  apiFetch<Quiz>(`/api/quizzes/${id}`);

export const createQuizApi = async (quiz: Partial<Quiz>): Promise<Quiz> =>
  apiFetch<Quiz>('/api/quizzes', {
    method: 'POST',
    body: JSON.stringify(quiz)
  });

export const updateQuizApi = async (id: string, quiz: Partial<Quiz>): Promise<Quiz> =>
  apiFetch<Quiz>(`/api/quizzes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(quiz)
  });

export const deleteQuizApi = async (id: string): Promise<void> =>
  apiFetch<void>(`/api/quizzes/${id}`, { method: 'DELETE' });

export const submitQuizApi = async (quizId: string, userAnswers: Record<string, any>, timeTakenSeconds?: number) =>
  apiFetch<any>(`/api/quizzes/${quizId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ userAnswers, timeTakenSeconds })
  });

// --- SAVE FULL SESSION ORCHESTRATOR ---

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
    featuredVideoUrl: sessionData.videoUrl || null,
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
        console.warn('File upload failed for provided material, preserving local reference', err);
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
        console.warn('File upload failed for additional material, preserving local reference', err);
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

// --- PERSONAL NOTES ---

export const fetchNotesApi = async (sessionId?: string): Promise<PersonalNote[]> => {
  const url = sessionId
    ? `/api/notes?sessionId=${encodeURIComponent(sessionId)}`
    : '/api/notes';
  return apiFetch<PersonalNote[]>(url);
};

export const createNoteApi = async (note: Partial<PersonalNote>): Promise<PersonalNote> =>
  apiFetch<PersonalNote>('/api/notes', {
    method: 'POST',
    body: JSON.stringify(note)
  });

export const updateNoteApi = async (id: string, note: Partial<PersonalNote>): Promise<PersonalNote> =>
  apiFetch<PersonalNote>(`/api/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(note)
  });

export const deleteNoteApi = async (id: string): Promise<void> =>
  apiFetch<void>(`/api/notes/${id}`, { method: 'DELETE' });

// --- DISCUSSIONS ---

export const fetchDiscussionsApi = async (sessionId?: string): Promise<DiscussionPost[]> => {
  const url = sessionId
    ? `/api/discussions?sessionId=${encodeURIComponent(sessionId)}`
    : '/api/discussions';
  return apiFetch<DiscussionPost[]>(url);
};

export const createDiscussionApi = async (post: { sessionId: string; title: string; body: string }): Promise<DiscussionPost> =>
  apiFetch<DiscussionPost>('/api/discussions', {
    method: 'POST',
    body: JSON.stringify(post)
  });

export const replyToDiscussionApi = async (postId: string, body: string, isAnswer = false): Promise<DiscussionPost> =>
  apiFetch<DiscussionPost>(`/api/discussions/${postId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ body, isAnswer })
  });

export const upvoteDiscussionApi = async (postId: string): Promise<DiscussionPost> =>
  apiFetch<DiscussionPost>(`/api/discussions/${postId}/upvote`, { method: 'POST' });

// --- ANALYTICS / SEARCH / ACTIVITY ---

export const fetchAnalyticsApi = async () =>
  apiFetch<any>('/api/analytics');

export const searchEnterpriseApi = async (query: string) =>
  apiFetch<any>(`/api/search?q=${encodeURIComponent(query)}`);

export const logActivityApi = async (action: string, details?: string): Promise<void> => {
  try {
    await apiFetch<void>('/api/activity', {
      method: 'POST',
      body: JSON.stringify({ action, details, timestamp: new Date().toISOString() })
    });
  } catch (err) {
    // Telemetry is best-effort: a failed log must never interrupt the user's action.
    console.warn('Failed to log activity', err);
  }
};

// --- AI (served locally by server.ts, not the .NET API) ---

export const sendAiChatMessageApi = async (message: string, context?: any, chatHistory?: any[]) => {
  try {
    return await apiFetch<any>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context, chatHistory })
    });
  } catch {
    return { reply: 'The AI tutor is unavailable right now. Please try again shortly.' };
  }
};

export const summarizeMaterialAiApi = async (title: string, content: string) => {
  try {
    return await apiFetch<any>('/api/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ title, content })
    });
  } catch {
    return { summary: `Summary for "${title}" is unavailable right now. Please try again shortly.` };
  }
};

export const generateQuizAiApi = async (topicName: string, textContent?: string, numQuestions: number = 4) => {
  try {
    return await apiFetch<any>('/api/ai/generate-quiz', {
      method: 'POST',
      body: JSON.stringify({ topicName, textContent, numQuestions })
    });
  } catch {
    return { quizTitle: `Practice Quiz: ${topicName}`, questions: [] };
  }
};

export const generateAiQuizApi = generateQuizAiApi;
export const fetchSessionsApi = fetchSessions;

// --- AUTH ---

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

export const loginApi = async (
  email: string,
  password?: string
): Promise<{ success: boolean; data?: AuthUserDto; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const body = await apiFetchEnvelope<AuthUserDto>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password })
    });

    if (body.success && body.data) {
      return {
        success: true,
        data: {
          ...body.data,
          role: body.data.role === 'Admin' ? 'Admin' : 'GT'
        }
      };
    }

    return { success: false, message: body.message || body.errors?.[0] || 'Invalid email address or password.' };
  } catch (err: any) {
    // No offline fallback: without the API we cannot verify a password.
    return { success: false, message: err?.message || 'Unable to reach the sign-in service. Please try again.' };
  }
};

export const forgotPasswordApi = async (email: string): Promise<{ success: boolean; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const body = await apiFetchEnvelope<unknown>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail })
    });
    return { success: body.success, message: body.message || body.errors?.[0] };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Unable to send the OTP right now.' };
  }
};

export const verifyOtpApi = async (
  email: string,
  otp: string
): Promise<{ success: boolean; resetToken?: string; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const body = await apiFetchEnvelope<{ resetToken?: string }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, otp: otp.trim() })
    });
    return {
      success: body.success,
      resetToken: body.data?.resetToken,
      message: body.message || body.errors?.[0]
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Verification failed. Please try again.' };
  }
};

export const resetPasswordApi = async (
  email: string,
  resetToken: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const body = await apiFetchEnvelope<unknown>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, resetToken, newPassword })
    });
    return { success: body.success, message: body.message || body.errors?.[0] };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to reset password.' };
  }
};

export const changePasswordApi = async (
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const body = await apiFetchEnvelope<unknown>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, currentPassword, newPassword })
    });
    return { success: body.success, message: body.message || body.errors?.[0] };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to change password.' };
  }
};
