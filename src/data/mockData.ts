import {
  Session,
  User,
  StudyMaterial,
  Quiz,
  CodePlaygroundExercise,
  InspectMetadata,
  PersonalNote,
  SessionTrackerRecord
} from '../types';

export const mockCurrentUser: User = {
  id: 'gt-101',
  name: 'Sibibharathi Thangaraj',
  email: 'Sibibharathi.Thangaraj@valuemomentum.com',
  role: 'GT',
  batch: 'GT-2026-Batch-01',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  xp: 2850,
  level: 5,
  streakDays: 14,
  lastActiveDate: '2026-08-18',
  dailyGoalMinutes: 45,
  todayMinutesSpent: 38,
};

export const mockUser = mockCurrentUser;

// Clean Empty Sessions - User / Admin creates and manages all sessions from scratch
export const mockSessions: Session[] = [];

// Clean Empty Study Materials
export const mockStudyMaterials: StudyMaterial[] = [];

// Clean Empty Quizzes
export const mockQuizzes: Quiz[] = [];

// Clean Empty Coding Exercises
export const mockCodingExercises: CodePlaygroundExercise[] = [];

// Clean Empty Personal Notes
export const mockPersonalNotes: PersonalNote[] = [];

// Clean Empty Session Tracker Records
export const mockSessionTrackerRecords: SessionTrackerRecord[] = [];
