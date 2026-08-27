import React, { useState, useEffect } from 'react';
import { User, Session, Quiz, RoadmapTopic, StudyMaterial } from './types';
import { fetchSessionsApi, createSessionApi, updateSessionApi, deleteSessionApi, saveFullSessionApi, logActivityApi, fetchUserManagementRecordsApi } from './services/api';
import { getUserManagementRecords } from './services/authCredentials';

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
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { SessionsList } from './components/GT/SessionsList';
import { SessionDetailView } from './components/GT/SessionDetailView';
import { QuizView } from './components/GT/QuizView';
import { InteractivePlayground } from './components/GT/InteractivePlayground';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { SessionManager } from './components/Admin/SessionManager';
import { RoadmapBuilder } from './components/Admin/RoadmapBuilder';
import { MaterialUploader } from './components/Admin/MaterialUploader';
import { QuizBuilder } from './components/Admin/QuizBuilder';
import { SessionTracker } from './components/Admin/SessionTracker';
import { UserManagement } from './components/Admin/UserManagement';
import { AdminAuthGate } from './components/Admin/AdminAuthGate';
import { AIAssistant } from './components/AIAssistant';
import { InspectModeOverlay } from './components/InspectModeOverlay';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { UserGuideModal } from './components/UserGuideModal';
import { X, LayoutDashboard, BookOpen, Terminal, GraduationCap, Sparkles, Table, Users, ExternalLink } from 'lucide-react';
import { useToast } from './context/ToastContext';

// Helpers for URL Hash Sync & Route Persistence
const getHashState = () => {
  const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#\/?/, '') : '';
  if (!hash || hash === 'landing') return { portal: 'Landing' as const };

  const [pathPart, queryPart] = hash.split('?');
  const params = new URLSearchParams(queryPart || '');
  const parts = pathPart.split('/').filter(Boolean);

  if (parts[0] === 'gt') {
    const view = parts[1] || 'sessions';
    if (view === 'playground') return { portal: 'GT' as const, gtViewMode: 'playground' as const };
    
    // sessions route
    const sessionId = parts[2] || null;
    const quizId = parts[3] === 'quiz' ? parts[4] : null;
    return {
      portal: 'GT' as const,
      gtViewMode: 'sessions' as const,
      selectedSessionId: sessionId,
      quizId,
      sessionTab: params.get('tab') || 'roadmap',
      sessionTopicId: params.get('topic') || ''
    };
  }

  if (parts[0] === 'admin') {
    const adminMode = (parts[1] || 'tracker') as any;
    return {
      portal: 'Admin' as const,
      adminViewMode: adminMode,
      adminSessionId: params.get('sessionId') || null
    };
  }

  return { portal: 'Landing' as const };
};

const buildHashFromState = (
  portal: 'Landing' | 'GT' | 'Admin',
  gtMode: 'sessions' | 'playground',
  adminMode: string,
  sessionId: string | null,
  quizId: string | null,
  sessionTab: string,
  sessionTopicId: string,
  adminSessionId: string | null
) => {
  if (portal === 'Landing') return '#landing';
  if (portal === 'GT') {
    if (gtMode === 'playground') return '#gt/playground';
    if (sessionId) {
      if (quizId) return `#gt/sessions/${sessionId}/quiz/${quizId}`;
      let q = `?tab=${encodeURIComponent(sessionTab)}`;
      if (sessionTopicId) q += `&topic=${encodeURIComponent(sessionTopicId)}`;
      return `#gt/sessions/${sessionId}${q}`;
    }
    return '#gt/sessions';
  }
  if (portal === 'Admin') {
    let base = `#admin/${adminMode}`;
    if (adminSessionId && ['roadmap-builder', 'material-uploader', 'quiz-builder'].includes(adminMode)) {
      base += `?sessionId=${encodeURIComponent(adminSessionId)}`;
    }
    return base;
  }
  return '#landing';
};

const checkIsNormalReload = (): boolean => {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return false;
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries && navEntries.length > 0) {
      const navTiming = navEntries[0] as PerformanceNavigationTiming;
      return navTiming.type === 'reload';
    }
    if ('navigation' in performance && (performance as any).navigation) {
      return (performance as any).navigation.type === 1;
    }
  } catch (e) {}
  return false;
};

const getSavedSession = () => {
  try {
    if (typeof window === 'undefined') return null;
    const saved = sessionStorage.getItem('gt_auth_session');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
};

export function App() {
  const isNormalReload = checkIsNormalReload();
  const initialHashState = getHashState();
  const savedSession = getSavedSession();

  const startingAuth = savedSession?.isAuthenticated ?? false;
  const startingAdminAuth = savedSession?.isAdminAuthenticated ?? false;
  const startingUser = savedSession?.currentUser || defaultGuestUser;
  
  const isStartingUserAdmin = Boolean(
    startingUser?.role === 'Admin' ||
    (typeof startingUser?.role === 'string' && startingUser.role.toLowerCase().includes('admin'))
  );

  // Restore current page on refresh (F5), or fallback to Landing page if unauthenticated
  let startingPortal: 'Landing' | 'GT' | 'Admin' = startingAuth
    ? ((initialHashState.portal !== 'Landing') ? initialHashState.portal : (savedSession?.activePortal || 'Landing'))
    : 'Landing';

  // RBAC Guard: If starting portal is Admin but user is NOT Admin, redirect to GT portal
  if (startingPortal === 'Admin' && (!startingAuth || !isStartingUserAdmin)) {
    startingPortal = startingAuth ? 'GT' : 'Landing';
  }

  const [currentUser, setCurrentUser] = useState<User>(startingUser);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Global Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(startingAuth);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalRole, setAuthModalRole] = useState<'GT' | 'Admin'>('GT');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

  // Admin Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(startingAdminAuth);
  
  // Navigation State - Restored on refresh to current page
  const [activePortal, setActivePortal] = useState<'Landing' | 'GT' | 'Admin'>(startingPortal);
  const [gtViewMode, setGtViewMode] = useState<'sessions' | 'playground'>(
    initialHashState.portal === 'GT' && 'gtViewMode' in initialHashState 
      ? initialHashState.gtViewMode 
      : (savedSession?.gtViewMode || 'sessions')
  );
  const [adminViewMode, setAdminViewMode] = useState<'dashboard' | 'sessions' | 'tracker' | 'roadmap-builder' | 'material-uploader' | 'quiz-builder' | 'user-management'>(
    initialHashState.portal === 'Admin' && 'adminViewMode' in initialHashState 
      ? initialHashState.adminViewMode 
      : (savedSession?.adminViewMode || 'tracker')
  );

  // Detail Selection State - Preserved on refresh
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialHashState.portal === 'GT' && 'selectedSessionId' in initialHashState
      ? (initialHashState.selectedSessionId ?? null)
      : (savedSession?.selectedSessionId ?? null)
  );
  const [sessionDetailTab, setSessionDetailTab] = useState<string>(
    initialHashState.portal === 'GT' && 'sessionTab' in initialHashState
      ? (initialHashState.sessionTab ?? 'roadmap')
      : (savedSession?.sessionDetailTab ?? 'roadmap')
  );
  const [sessionDetailTopicId, setSessionDetailTopicId] = useState<string>(
    initialHashState.portal === 'GT' && 'sessionTopicId' in initialHashState
      ? (initialHashState.sessionTopicId ?? '')
      : (savedSession?.sessionDetailTopicId ?? '')
  );
  const [activeAdminSession, setActiveAdminSession] = useState<Session | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [restoredActiveQuiz, setRestoredActiveQuiz] = useState<boolean>(false);



  // Hard Refresh Handler: If NOT a normal reload (Hard Refresh / Cache bypass), perform complete logout
  useEffect(() => {
    if (!isNormalReload) {
      try {
        localStorage.removeItem('gt_auth_session');
        sessionStorage.removeItem('gt_auth_session');
      } catch (e) {}
      setIsAuthenticated(false);
      setIsAdminAuthenticated(false);
      setCurrentUser(defaultGuestUser);
      setActivePortal('Landing');
      setSelectedSessionId(null);
      setActiveQuiz(null);
      if (typeof window !== 'undefined') {
        window.location.hash = '#landing';
      }
    }
  }, []);

  // Session persistence while user is authenticated
  useEffect(() => {
    try {
      if (isAuthenticated) {
        const sessionData = {
          isAuthenticated,
          isAdminAuthenticated,
          currentUser,
          activePortal,
          gtViewMode,
          adminViewMode,
          selectedSessionId,
          sessionDetailTab,
          sessionDetailTopicId
        };
        sessionStorage.setItem('gt_auth_session', JSON.stringify(sessionData));
        localStorage.removeItem('gt_auth_session');
      } else {
        sessionStorage.removeItem('gt_auth_session');
        localStorage.removeItem('gt_auth_session');
      }
    } catch (e) {}
  }, [
    isAuthenticated,
    isAdminAuthenticated,
    currentUser,
    activePortal,
    gtViewMode,
    adminViewMode,
    selectedSessionId,
    sessionDetailTab,
    sessionDetailTopicId
  ]);

  // Features State
  const [inspectModeActive, setInspectModeActive] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState<boolean>(false);

  // Keyboard shortcut listener for '?' to open User Guide
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsUserGuideOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Sync user management roster from server on app mount for all new sessions & browsers
  useEffect(() => {
    fetchUserManagementRecordsApi().catch(() => {});
  }, []);

  // Auth Handlers
  const handleOpenLogin = (role: 'GT' | 'Admin' = 'GT') => {
    setAuthModalRole(role);
    setIsAuthModalOpen(true);
  };

  const handleOpenChangePassword = () => {
    setIsChangePasswordOpen(true);
  };

  // Login Success Handler: Authenticates user and presents Landing Page with portal entry
  const handleAuthSuccess = (role: 'GT' | 'Admin' | 'Associate' | string, userData?: { name: string; email: string; isGuest?: boolean }) => {
    setIsAuthenticated(true);
    const isRoleAdmin = Boolean(role && (role === 'Admin' || role.toLowerCase().includes('admin')));
    if (userData) {
      let matchedRole = isRoleAdmin ? 'Admin' : 'Employee';
      let matchedDesig = isRoleAdmin ? 'Lead - L&D Leadership' : 'Graduate Trainee';

      try {
        const records = getUserManagementRecords();
        const cleanEmail = userData.email.trim().toLowerCase();
        const found = records.find((r) => {
          if (!r.email || r.email === '-') return false;
          if (r.email.trim().toLowerCase() !== cleanEmail) return false;
          const rRole = (r.role || 'Employee').trim().toLowerCase();
          if (isRoleAdmin) return rRole === 'admin';
          return rRole === 'employee' || rRole === 'gt' || rRole === 'associate';
        });

        if (found) {
          if (found.role) matchedRole = found.role;
          if (found.designation) matchedDesig = found.designation;
        }
      } catch { }

      setCurrentUser(prev => ({
        ...prev,
        name: userData.name,
        email: userData.email,
        role: matchedRole as any,
        designation: matchedDesig,
        isGuest: userData.isGuest ?? prev.isGuest
      }));
    }

    // Navigate directly to Dashboard / Portal upon successful login
    const mappedPortal: 'GT' | 'Admin' = isRoleAdmin ? 'Admin' : 'GT';
    setActivePortal(mappedPortal);
    setSelectedSessionId(null);
    setActiveQuiz(null);
    if (mappedPortal === 'Admin') {
      setIsAdminAuthenticated(true);
      setAdminViewMode('tracker');
    } else {
      setIsAdminAuthenticated(false);
      setGtViewMode('sessions');
    }
    setIsAuthModalOpen(false);
  };

  const { addToast } = useToast();

  const handleLogout = () => {
    try {
      localStorage.removeItem('gt_auth_session');
      sessionStorage.removeItem('gt_auth_session');
      sessionStorage.removeItem('gt_tab_session_active');
    } catch (e) {}
    setIsAuthenticated(false);
    setIsAdminAuthenticated(false);
    setCurrentUser(defaultGuestUser);
    setActivePortal('Landing');
    setSelectedSessionId(null);
    setActiveQuiz(null);
    if (typeof window !== 'undefined') {
      window.location.hash = '#landing';
    }
    addToast('info', 'You have been logged out.');
  };

  // Sync URL Hash whenever navigation state changes (Pushing browser history entries)
  useEffect(() => {
    const newHash = buildHashFromState(
      activePortal,
      gtViewMode,
      adminViewMode,
      selectedSessionId,
      activeQuiz?.id || null,
      sessionDetailTab,
      sessionDetailTopicId,
      activeAdminSession?.id || null
    );

    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  }, [
    activePortal,
    gtViewMode,
    adminViewMode,
    selectedSessionId,
    activeQuiz,
    sessionDetailTab,
    sessionDetailTopicId,
    activeAdminSession
  ]);

  // Listen to Hash Changes (Browser Back / Forward / Direct URL Entry)
  useEffect(() => {
    const handleHashChange = () => {
      const state = getHashState();

      // RBAC Guard: Protect Admin Portal against unauthorized access (e.g. Employee/Associate pasting #admin URL)
      if (state.portal === 'Admin') {
        const userIsAdmin = Boolean(
          currentUser?.role === 'Admin' ||
          (typeof currentUser?.role === 'string' && currentUser.role.toLowerCase().includes('admin')) ||
          isAdminAuthenticated
        );

        if (!isAuthenticated || !userIsAdmin) {
          addToast('error', 'Access Denied: Admin Portal requires L&D Leadership credentials.');
          setActivePortal(isAuthenticated ? 'GT' : 'Landing');
          if (typeof window !== 'undefined') {
            window.location.hash = isAuthenticated ? '#gt/sessions' : '#landing';
          }
          return;
        }
      }

      setActivePortal(state.portal);
      if (state.portal === 'GT') {
        if ('gtViewMode' in state) setGtViewMode(state.gtViewMode);
        setSelectedSessionId('selectedSessionId' in state ? (state.selectedSessionId ?? null) : null);
        if ('sessionTab' in state && state.sessionTab) setSessionDetailTab(state.sessionTab);
        if ('sessionTopicId' in state && state.sessionTopicId !== undefined) setSessionDetailTopicId(state.sessionTopicId);
        
        if ('quizId' in state && state.quizId) {
          const foundSession = sessions.find(s => s.id === state.selectedSessionId);
          const foundQuiz = foundSession?.quizzes?.find(q => q.id === state.quizId);
          if (foundQuiz) setActiveQuiz(foundQuiz);
        } else {
          setActiveQuiz(null);
        }
      } else if (state.portal === 'Admin') {
        if ('adminViewMode' in state) setAdminViewMode(state.adminViewMode);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [sessions, isAuthenticated, currentUser, isAdminAuthenticated, addToast]);

  const refreshSessions = async () => {
    try {
      const data = await fetchSessionsApi();
      setSessions(data);
      return data;
    } catch (err) {
      console.error('Failed to refresh sessions', err);
      return [] as Session[];
    }
  };

  useEffect(() => {
    refreshSessions();
  }, []);

  useEffect(() => {
    if (restoredActiveQuiz || !sessions.length) return;
    const state = getHashState();
    const savedQuizId = (state.portal === 'GT' && 'quizId' in state && state.quizId) || sessionStorage.getItem('activeQuizId');
    if (!savedQuizId) return;

    const sessionContainingQuiz = sessions.find(s => (s.quizzes || []).some(q => q.id === savedQuizId));
    const savedQuiz = sessionContainingQuiz?.quizzes?.find(q => q.id === savedQuizId) || null;
    if (savedQuiz) {
      setSelectedSessionId(sessionContainingQuiz?.id || null);
      setActiveQuiz(savedQuiz);
    }
    setRestoredActiveQuiz(true);
  }, [sessions, restoredActiveQuiz]);

  useEffect(() => {
    if (activePortal === 'Admin' && sessions.length > 0 && !activeAdminSession) {
      const state = getHashState();
      if (state.portal === 'Admin' && 'adminSessionId' in state && state.adminSessionId) {
        const match = sessions.find(s => s.id === state.adminSessionId);
        if (match) setActiveAdminSession(match);
      }
    }
  }, [sessions, activePortal, activeAdminSession]);

  const isSessionPublished = (session: Session) => {
    const normalizedStatus = (session.status || '').toString().toLowerCase();
    return session.isPublished === true || normalizedStatus === 'published' || normalizedStatus === 'publish';
  };

  const publishedSessions = sessions.filter(isSessionPublished);

  const handleSaveAdminSession = async (sessionData: Partial<Session>) => {
    try {
      addToast('info', 'Saving session and content to database...');
      const savedSession = await saveFullSessionApi(sessionData);

      setSessions(prev => {
        const exists = prev.some(s => s.id === savedSession.id);
        if (exists) {
          return prev.map(s => s.id === savedSession.id ? savedSession : s);
        }
        return [savedSession, ...prev];
      });

      setActiveAdminSession(savedSession);
      addToast('success', `Session "${savedSession.name}" saved to PostgreSQL successfully!`);
      await refreshSessions();
    } catch (err: any) {
      console.error('Failed to save session', err);
      addToast('error', `Failed to save session: ${err?.message || err}`);
    }
  };

  const handleDeleteAdminSession = async (sessionId: string) => {
    try {
      await deleteSessionApi(sessionId);
      addToast('info', 'Session deleted');
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeAdminSession?.id === sessionId) {
        setActiveAdminSession(null);
      }
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
      await refreshSessions();
    } catch (err: any) {
      console.error('Failed to delete session', err);
      addToast('error', `Failed to delete session: ${err?.message || err}`);
    }
  };

  const rawSelectedSession = sessions.find(s => s.id === selectedSessionId);
  const selectedSession = rawSelectedSession ? {
    ...rawSelectedSession,
    studyMaterials: rawSelectedSession.studyMaterials || [],
    providedMaterials: Array.isArray(rawSelectedSession.providedMaterials) && rawSelectedSession.providedMaterials.length > 0
      ? rawSelectedSession.providedMaterials
      : (rawSelectedSession.studyMaterials || []).filter(m => (m.materialCategory || m.materialType || '').toLowerCase() !== 'additional' && (m.materialCategory || m.materialType || '').toLowerCase() !== 'extra'),
    additionalMaterials: Array.isArray(rawSelectedSession.additionalMaterials) && rawSelectedSession.additionalMaterials.length > 0
      ? rawSelectedSession.additionalMaterials
      : (rawSelectedSession.studyMaterials || []).filter(m => (m.materialCategory || m.materialType || '').toLowerCase() === 'additional' || (m.materialCategory || m.materialType || '').toLowerCase() === 'extra'),
    assignments: rawSelectedSession.assignments || [],
    quizzes: rawSelectedSession.quizzes || []
  } : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 text-slate-900 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      
      {/* Top Fixed Header */}
      <Header
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        activePortal={activePortal}
        setActivePortal={(portal) => {
          if (!isAuthenticated && portal !== 'Landing') {
            handleOpenLogin(portal);
            return;
          }
          const isAdminUser = currentUser.role === 'Admin' || (typeof currentUser.role === 'string' && currentUser.role.toLowerCase().includes('admin'));
          if (portal === 'Admin' && !isAdminUser) {
            addToast('error', 'Access Denied (RBAC): Admin console is restricted to L&D Administrators.');
            return;
          }
          setActivePortal(portal);
          setSelectedSessionId(null);
          setActiveQuiz(null);
          if (portal === 'Admin') {
            setIsAdminAuthenticated(true);
            setAdminViewMode('tracker');
          }
          if (portal !== 'GT') {
            setInspectModeActive(false);
          }
        }}
        inspectModeActive={inspectModeActive}
        setInspectModeActive={setInspectModeActive}
        onOpenLogin={handleOpenLogin}
        onOpenChangePassword={handleOpenChangePassword}
        onLogout={handleLogout}
        onOpenPlayground={() => {
          if (!isAuthenticated) {
            handleOpenLogin('GT');
            return;
          }
          setActivePortal('GT');
          setGtViewMode('playground' as any);
          setSelectedSessionId(null);
          logActivityApi('OpenPlayground', 'User opened the interactive coding playground');
        }}
        onOpenUserGuide={() => setIsUserGuideOpen(true)}
      />

      {/* Main Body View Switching */}
      <main className="flex-1 w-full mx-auto">
        
        {/* Landing Page View */}
        {(!isAuthenticated || activePortal === 'Landing') && (
          <LandingPage
            onOpenLogin={handleOpenLogin}
            onOpenUserGuide={() => setIsUserGuideOpen(true)}
            isAuthenticated={isAuthenticated}
            currentUser={currentUser}
            onNavigateToPortal={(portal) => {
              const isAdminUser = currentUser.role === 'Admin' || (typeof currentUser.role === 'string' && currentUser.role.toLowerCase().includes('admin'));
              if (portal === 'Admin' && !isAdminUser) {
                addToast('error', 'Access Denied (RBAC): Admin console is restricted to L&D Administrators.');
                return;
              }
              setActivePortal(portal);
              setSelectedSessionId(null);
              setActiveQuiz(null);
              if (portal === 'Admin') {
                setIsAdminAuthenticated(true);
                setAdminViewMode('tracker');
              }
            }}
            onLogout={handleLogout}
          />
        )}

        {/* Authenticated GT View */}
        {isAuthenticated && activePortal === 'GT' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            
            {/* Sub-Navigation Bar for GT Portal */}
            {/* <div className="bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 overflow-x-auto no-scrollbar shadow-sm">
              <button
                onClick={() => { setGtViewMode('sessions'); setSelectedSessionId(null); setActiveQuiz(null); }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  gtViewMode === 'sessions' && !selectedSessionId && !activeQuiz 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
                }`}
              >
                <BookOpen className={`w-4 h-4 ${gtViewMode === 'sessions' && !selectedSessionId && !activeQuiz ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                <span>Learning Sessions ({sessions.length})</span>
              </button>

              <button
                onClick={() => { setGtViewMode('knowledge-hub'); setSelectedSessionId(null); setActiveQuiz(null); }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  gtViewMode === 'knowledge-hub' && !selectedSessionId && !activeQuiz 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${gtViewMode === 'knowledge-hub' && !selectedSessionId && !activeQuiz ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                <span>Knowledge Hub</span>
              </button>
            </div> */}

            {/* View Render Logic */}
            {activeQuiz ? (
              <QuizView
                quiz={activeQuiz}
                onBack={() => {
                  setActiveQuiz(null);
                  sessionStorage.removeItem('activeQuizId');
                }}
                onQuizCompleted={(score) => {
                  setCurrentUser(prev => ({
                    ...prev,
                    xp: prev.xp + Math.round(score * 1.5)
                  }));
                  addToast('success', `Quiz completed! You earned ${Math.round(score * 1.5)} XP.`);
                }}
              />
            ) : selectedSession ? (
              <SessionDetailView
                session={selectedSession}
                currentUser={currentUser}
                onBack={() => {
                  setSelectedSessionId(null);
                  setActiveQuiz(null);
                }}
                onStartQuiz={(quiz) => {
                  setActiveQuiz(quiz);
                  sessionStorage.setItem('activeQuizId', quiz.id);
                  logActivityApi('StartQuiz', `User started quiz for session: ${selectedSession.name}`);
                }}
                initialTab={sessionDetailTab}
                initialTopicId={sessionDetailTopicId}
                onStateChange={(tab, topicId) => {
                  setSessionDetailTab(tab);
                  if (topicId !== undefined) setSessionDetailTopicId(topicId);
                }}
              />
            ) : (
              <SessionsList
                sessions={publishedSessions}
                onSelectSession={(id) => {
                  setSelectedSessionId(id);
                  const sessionName = publishedSessions.find(s => s.id === id)?.name || id;
                  logActivityApi('StartLearning', `User opened learning session: ${sessionName}`);
                }}
              />
            )}

          </div>
        )}

        {/* Authenticated Admin View */}
        {isAuthenticated && activePortal === 'Admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {!isAdminAuthenticated ? (
              <AdminAuthGate
                onLoginSuccess={(userData) => {
                  handleAuthSuccess('Admin', userData);
                }}
                onCancel={() => setActivePortal('GT')}
              />
            ) : selectedSession ? (
              <SessionDetailView
                session={selectedSession}
                currentUser={currentUser}
                onBack={() => setSelectedSessionId(null)}
                onStartQuiz={(quiz) => {
                  setActiveQuiz(quiz);
                  sessionStorage.setItem('activeQuizId', quiz.id);
                }}
              />
            ) : (
              <div className="space-y-6">
                
                {/* Sub-Navigation Bar for Admin Portal */}
                <div className="bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-sm">
                  <button
                    onClick={() => setAdminViewMode('tracker')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                      adminViewMode === 'tracker'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
                    }`}
                  >
                    <Table className={`w-3.5 h-3.5 ${adminViewMode === 'tracker' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span>Session Tracker</span>
                  </button>
                  <button
                    onClick={() => setAdminViewMode('sessions')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                      adminViewMode === 'sessions'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
                    }`}
                  >
                    <BookOpen className={`w-3.5 h-3.5 ${adminViewMode === 'sessions' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span>Session Management</span>
                  </button>
                  <button
                    onClick={() => setAdminViewMode('dashboard')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                      adminViewMode === 'dashboard'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
                    }`}
                  >
                    <LayoutDashboard className={`w-3.5 h-3.5 ${adminViewMode === 'dashboard' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span>Session Overview</span>
                  </button>
                  <button
                    onClick={() => setAdminViewMode('user-management')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                      adminViewMode === 'user-management'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
                    }`}
                  >
                    <Users className={`w-3.5 h-3.5 ${adminViewMode === 'user-management' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span>User Management</span>
                  </button>
                </div>

                {adminViewMode === 'tracker' ? (
                  <SessionTracker sessions={sessions} />
                ) : adminViewMode === 'sessions' ? (
                  <SessionManager
                    sessions={sessions}
                    onSaveSession={handleSaveAdminSession}
                    onDeleteSession={handleDeleteAdminSession}
                    onOpenRoadmapBuilder={(s) => {
                      setActiveAdminSession(s);
                      setAdminViewMode('roadmap-builder');
                    }}
                    onOpenMaterialUploader={(s) => {
                      setActiveAdminSession(s);
                      setAdminViewMode('material-uploader');
                    }}
                    onOpenQuizBuilder={(s) => {
                      setActiveAdminSession(s);
                      setAdminViewMode('quiz-builder');
                    }}
                    onBackToDashboard={() => setAdminViewMode('dashboard')}
                  />
                ) : adminViewMode === 'dashboard' ? (
                  <AdminDashboard
                    sessions={sessions}
                    onAddNewSession={() => setAdminViewMode('sessions')}
                    onManageSessions={() => setAdminViewMode('sessions')}
                    onOpenSessionTracker={() => setAdminViewMode('tracker')}
                    onSaveSession={handleSaveAdminSession}
                    onDeleteSession={handleDeleteAdminSession}
                    onOpenRoadmapBuilder={(s) => {
                      setActiveAdminSession(s);
                      setAdminViewMode('roadmap-builder');
                    }}
                    onOpenMaterialUploader={(s) => {
                      setActiveAdminSession(s);
                      setAdminViewMode('material-uploader');
                    }}
                    onOpenQuizBuilder={(s) => {
                      setActiveAdminSession(s);
                      setAdminViewMode('quiz-builder');
                    }}
                    onSelectSession={(id) => {
                      setSelectedSessionId(id);
                    }}
                  />
                ) : adminViewMode === 'user-management' ? (
                  <UserManagement />
                ) : adminViewMode === 'roadmap-builder' && activeAdminSession ? (
                  <RoadmapBuilder
                    session={activeAdminSession}
                    onSave={(updatedTopics) => {
                      handleSaveAdminSession({ ...activeAdminSession, topics: updatedTopics });
                      setAdminViewMode('sessions');
                    }}
                    onBack={() => setAdminViewMode('sessions')}
                  />
                ) : adminViewMode === 'material-uploader' && activeAdminSession ? (
                  <MaterialUploader
                    session={activeAdminSession}
                    onSaveMaterials={(mats) => {
                      handleSaveAdminSession({ ...activeAdminSession, studyMaterials: mats });
                      setAdminViewMode('sessions');
                    }}
                    onBack={() => setAdminViewMode('sessions')}
                  />
                ) : adminViewMode === 'quiz-builder' && activeAdminSession ? (
                  <QuizBuilder
                    session={activeAdminSession}
                    onSaveQuiz={(quiz) => {
                      handleSaveAdminSession({ ...activeAdminSession, quizzes: [quiz] });
                      setAdminViewMode('sessions');
                    }}
                    onBack={() => setAdminViewMode('sessions')}
                  />
                ) : (
                  <SessionTracker sessions={sessions} />
                )}

              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating AI Learning Assistant - Available in authenticated GT Portal */}
      {isAuthenticated && activePortal === 'GT' && (
        <AIAssistant
          currentSessionName={selectedSession?.name}
        />
      )}

      {/* Flagship Feature: Learning Inspect Mode Drawer - Available in authenticated GT Portal */}
      {isAuthenticated && activePortal === 'GT' && (
        <InspectModeOverlay
          isActive={inspectModeActive}
          onToggle={() => setInspectModeActive(!inspectModeActive)}
        />
      )}

      {/* Auth Modal (Clean Login & Multi-Step Forgot Password) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialRole={authModalRole}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Change Password Modal (For Authenticated Users from Profile) */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        userEmail={currentUser.email}
        userRole={currentUser.role}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Global Command-K Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        sessions={sessions}
        onSelectSession={(id) => {
          if (!isAuthenticated) {
            handleOpenLogin('GT');
            return;
          }
          setActivePortal('GT');
          setSelectedSessionId(id);
        }}
      />



      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 py-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-center text-xs text-slate-600 dark:text-slate-400 font-sans shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>
              This web application is developed and managed by Team{' '}
              <a
                href="https://prismiq26.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                title="PrismIQ | Mission Possible 2026"
                className="text-blue-600 dark:text-blue-400 font-extrabold hover:underline inline-flex items-center gap-1 transition-colors"
              >
                PrismIQ
                {/* <ExternalLink className="w-3.5 h-3.5 inline shrink-0" /> */}
              </a>
            </span>
          </div>
          <div className="hidden sm:block text-slate-300 dark:text-slate-700">•</div>
        </div>
      </footer>

      {/* User Guide Full-Screen Modal */}
      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
      />

    </div>
  );
}

export default App;

// viewed
