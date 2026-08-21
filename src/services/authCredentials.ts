/**
 * Enterprise Authentication & User Credentials Service
 * 
 * Supports:
 * - 6 Graduate Trainee / Associate Accounts (@valuemomentum.com)
 * - 4 L&D Team / Administrator Accounts (@valuemomentum.com & @owlsure.com)
 * - Strict Domain Validation (only @valuemomentum.com and @owlsure.com permitted)
 * - Individual Persistent Password Management (localStorage backed)
 */

import { AuthUserDto } from '../services/api';

export interface RegisteredCredential {
  email: string;
  defaultPassword: string;
  role: 'GT' | 'Admin' | 'Associate';
  name: string;
  firstName: string;
  lastName: string;
  batch?: string;
  avatar?: string;
}

// Official Initial Seed Credentials
export const INITIAL_CREDENTIALS: RegisteredCredential[] = [
  // ==========================================
  // ASSOCIATES (Role: GT)
  // ==========================================
  {
    email: 'Sibibharathi.Thangaraj@valuemomentum.com',
    defaultPassword: 'Sibibharathi.Thangaraj',
    role: 'GT',
    name: 'Sibibharathi Thangaraj',
    firstName: 'Sibibharathi',
    lastName: 'Thangaraj',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Pavithran.Sivanandham@valuemomentum.com',
    defaultPassword: 'Pavithran.Sivanandham',
    role: 'GT',
    name: 'Pavithran Sivanandham',
    firstName: 'Pavithran',
    lastName: 'Sivanandham',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Aswin.Muruganandham@valuemomentum.com',
    defaultPassword: 'Aswin.Muruganandham',
    role: 'GT',
    name: 'Aswin Muruganandham',
    firstName: 'Aswin',
    lastName: 'Muruganandham',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Harshini.Radhakrishnan@valuemomentum.com',
    defaultPassword: 'Harshini.Radhakrishnan',
    role: 'GT',
    name: 'Harshini Radhakrishnan',
    firstName: 'Harshini',
    lastName: 'Radhakrishnan',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Imran.Aupe@valuemomentum.com',
    defaultPassword: 'Imran.Aupe',
    role: 'GT',
    name: 'Imran Aupe',
    firstName: 'Imran',
    lastName: 'Aupe',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Kruthika.Devaraje@valuemomentum.com',
    defaultPassword: 'Kruthika.Devaraje',
    role: 'GT',
    name: 'Kruthika Devaraje',
    firstName: 'Kruthika',
    lastName: 'Devaraje',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Vaishali.Karunai@valuemomentum.com',
    defaultPassword: 'Vaishali.Karunai',
    role: 'GT',
    name: 'Vaishali Karunai',
    firstName: 'Vaishali',
    lastName: 'Karunai',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Tanvitha.Nadukuda@valuemomentum.com',
    defaultPassword: 'Tanvitha.Nadukuda',
    role: 'GT',
    name: 'Tanvitha Nadukuda',
    firstName: 'Tanvitha',
    lastName: 'Nadukuda',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },

  // ==========================================
  // L&D TEAM (Role: Admin)
  // ==========================================
  {
    email: 'Anukraha.Magdalene@valuemomentum.com',
    defaultPassword: 'Anukraha.Magdalene',
    role: 'Admin',
    name: 'Anukraha Magdalene',
    firstName: 'Anukraha',
    lastName: 'Magdalene',
    batch: 'L&D Leadership',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Keren.Christobel@valuemomentum.com',
    defaultPassword: 'Keren.Christobel',
    role: 'Admin',
    name: 'Keren Christobel',
    firstName: 'Keren',
    lastName: 'Christobel',
    batch: 'L&D Management',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Janani.Selvaraj@valuemomentum.com',
    defaultPassword: 'Janani.Selvaraj',
    role: 'Admin',
    name: 'Janani Selvaraj',
    firstName: 'Janani',
    lastName: 'Selvaraj',
    batch: 'L&D Management',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Sudhir.Vittapu@owlsure.com',
    defaultPassword: 'Sudhir.Vittapu',
    role: 'Admin',
    name: 'Sudhir Vittapu',
    firstName: 'Sudhir',
    lastName: 'Vittapu',
    batch: 'Technical Facilitation',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
  }
];

const STORAGE_KEY = 'gt_custom_credentials_store_v2';

/**
 * Retrieves the current credentials store, merging initial seed data with user updates
 */
export const getCredentialsStore = (): Record<string, { password: string; profile: RegisteredCredential }> => {
  const store: Record<string, { password: string; profile: RegisteredCredential }> = {};

  // 1. Dynamically load from active user management records roster
  const activeRoster = getUserManagementRecords();

  activeRoster.forEach((u) => {
    if (!u.email || u.email === '-' || !u.email.includes('@')) return;
    const lowerEmail = u.email.trim().toLowerCase();
    const defaultPw = (lowerEmail.split('@')[0] || '').toLowerCase();
    const parts = (u.name || '').trim().split(' ');

    const userRole: 'Admin' | 'GT' | 'Associate' = u.role === 'Admin' ? 'Admin' : u.role === 'Associate' ? 'Associate' : 'GT';

    store[lowerEmail] = {
      password: u.password || defaultPw,
      profile: {
        email: u.email.trim(),
        defaultPassword: defaultPw,
        role: userRole,
        name: u.name,
        firstName: parts[0] || u.name,
        lastName: parts.slice(1).join(' ') || '',
        batch: u.batch || 'GT-2026-Batch-01',
        avatar: u.role === 'Admin'
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      }
    };
  });

  // 2. Overlay persistent changes from localStorage password overrides
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const overrides = JSON.parse(raw);
      if (typeof overrides === 'object' && overrides !== null) {
        Object.keys(overrides).forEach((emailKey) => {
          const lowerKey = emailKey.toLowerCase();
          if (store[lowerKey] && typeof overrides[emailKey] === 'string') {
            store[lowerKey].password = overrides[emailKey];
          }
        });
      }
    }
  } catch (e) {
    console.warn('Failed to parse persistent credentials store', e);
  }

  return store;
};

/**
 * Checks if the email domain is permitted (@valuemomentum.com, @owlsure.com, or registered in User Management)
 */
export const isAllowedDomain = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const lower = email.trim().toLowerCase();
  if (lower.endsWith('@valuemomentum.com') || lower.endsWith('@owlsure.com')) {
    return true;
  }
  const records = getUserManagementRecords();
  return records.some((r) => r.email && r.email !== '-' && r.email.trim().toLowerCase() === lower);
};

/**
 * Authenticates a user against the registered credentials store
 */
export const authenticateLocalUser = (
  email: string,
  password?: string
): { success: boolean; data?: AuthUserDto; message?: string } => {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Validate email domain
  if (!isAllowedDomain(cleanEmail)) {
    return {
      success: false,
      message: 'Only @valuemomentum.com and @owlsure.com email addresses are allowed.'
    };
  }

  const store = getCredentialsStore();
  const userEntry = store[cleanEmail];

  // 2. Check if user exists in credentials store
  if (!userEntry) {
    return {
      success: false,
      message: 'Incorrect email ID or password.'
    };
  }

  // 3. Strict Case-Sensitive Password Match (BUG_LOGIN_002 Fix)
  const cleanPassword = (password || '').trim();
  const storedPassword = (userEntry.password || '').trim();
  const defaultPw = (userEntry.profile.defaultPassword || '').trim();

  // Password matching must be strictly case-sensitive.
  const isMatch =
    cleanPassword === storedPassword ||
    (cleanPassword && defaultPw && cleanPassword === defaultPw);

  if (!password || !isMatch) {
    return {
      success: false,
      message: 'Incorrect email ID or password.'
    };
  }

  // 4. Return valid authenticated user DTO
  const user = userEntry.profile;
  const token = `token-${user.role.toLowerCase()}-${user.email}-${Date.now()}`;

  return {
    success: true,
    data: {
      id: `user-${user.email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      token,
      batch: user.batch || 'GT-2026-Batch-01',
      xp: 2850,
      level: 5,
      streakDays: 14,
      lastActiveDate: new Date().toISOString().split('T')[0],
      dailyGoalMinutes: 45,
      todayMinutesSpent: 25
    }
  };
};

/**
 * Changes a user's password and persists it to localStorage
 */
export const changeUserPassword = (
  email: string,
  currentPassword: string,
  newPassword: string
): { success: boolean; message: string } => {
  const cleanEmail = email.trim().toLowerCase();

  if (!isAllowedDomain(cleanEmail)) {
    return {
      success: false,
      message: 'Only @valuemomentum.com and @owlsure.com email addresses are allowed.'
    };
  }

  const store = getCredentialsStore();
  const userEntry = store[cleanEmail];

  if (!userEntry) {
    return {
      success: false,
      message: 'User account not found.'
    };
  }

  if (currentPassword !== userEntry.password) {
    return {
      success: false,
      message: 'Current password is incorrect.'
    };
  }

  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      message: 'New password must be at least 8 characters long.'
    };
  }

  // Save new password into localStorage
  try {
    let overrides: Record<string, string> = {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      overrides = JSON.parse(raw) || {};
    }
    overrides[cleanEmail] = newPassword;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Failed to persist new password to localStorage', e);
  }

  return {
    success: true,
    message: 'Password changed successfully! You can now log in with your new password.'
  };
};

/**
 * Resets a user's password (e.g. from Forgot Password OTP flow)
 */
export const resetUserPassword = (
  email: string,
  newPassword: string
): { success: boolean; message: string } => {
  const cleanEmail = email.trim().toLowerCase();

  if (!isAllowedDomain(cleanEmail)) {
    return {
      success: false,
      message: 'Only @valuemomentum.com and @owlsure.com email addresses are allowed.'
    };
  }

  const store = getCredentialsStore();
  const userEntry = store[cleanEmail];

  if (!userEntry) {
    return {
      success: false,
      message: 'User account not found.'
    };
  }

  try {
    let overrides: Record<string, string> = {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      overrides = JSON.parse(raw) || {};
    }
    overrides[cleanEmail] = newPassword;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Failed to persist reset password to localStorage', e);
  }

  return {
    success: true,
    message: 'Password has been reset successfully! Please log in with your new password.'
  };
};

// ============================================================================
// USER MANAGEMENT & DIRECTORY STORAGE
// ============================================================================

import { UserManagementRecord } from '../types';

export const INITIAL_USER_MANAGEMENT_RECORDS: UserManagementRecord[] = [
  {
    id: 'usr-105527',
    vamId: '105527',
    name: 'Sibibharathi Thangaraj',
    email: 'Sibibharathi.Thangaraj@valuemomentum.com',
    phoneNumber: '9345766068',
    role: 'Employee',
    designation: 'Graduate Trainee',
    addedOn: '20-Jan-2025',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'GT-2026-Batch-01'
  },
  {
    id: 'usr-105500',
    vamId: '105500',
    name: 'Pavithran Sivanandham',
    email: 'Pavithran.Sivanandham@valuemomentum.com',
    phoneNumber: '7845911687',
    role: 'Employee',
    designation: 'Graduate Trainee',
    addedOn: '20-Jan-2025',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'GT-2026-Batch-01'
  },
  {
    id: 'usr-105515',
    vamId: '105515',
    name: 'Aswin Muruganandham',
    email: 'Aswin.Muruganandham@valuemomentum.com',
    phoneNumber: '9626637490',
    role: 'Employee',
    designation: 'Graduate Trainee',
    addedOn: '20-Jan-2025',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'GT-2026-Batch-01'
  },
  {
    id: 'usr-105520',
    vamId: '105520',
    name: 'Harshini Radhakrishnan',
    email: 'Harshini.Radhakrishnan@valuemomentum.com',
    phoneNumber: '8220126157',
    role: 'Employee',
    designation: 'Graduate Trainee',
    addedOn: '18-Jan-2025',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'GT-2026-Batch-01'
  },
  {
    id: 'usr-105511',
    vamId: '105511',
    name: 'Imran Aupe',
    email: 'Imran.Aupe@valuemomentum.com',
    phoneNumber: '9952590815',
    role: 'Employee',
    designation: 'Graduate Trainee',
    addedOn: '18-Jan-2025',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'GT-2026-Batch-01'
  },
  {
    id: 'usr-104496',
    vamId: '105496',
    name: 'Kruthika Devaraje',
    email: 'Kruthika.Devaraje@valuemomentum.com',
    phoneNumber: '9902518633',
    role: 'Employee',
    designation: 'Graduate Trainee',
    addedOn: '15-Jan-2025',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'GT-2026-Batch-01'
  },
  {
    id: 'usr-105503',
    vamId: '105503',
    name: 'Vaishali Karunai',
    email: 'Vaishali.Karunai@valuemomentum.com',
    phoneNumber: '8012325313',
    role: 'Employee',
    designation: 'Graduate Trainee',
    addedOn: '15-Jan-2025',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'GT-2026-Batch-01'
  },
  {
    id: 'usr-105529',
    vamId: '105529',
    name: 'Tanvitha Nadukuda',
    email: 'Tanvitha.Nadukuda@valuemomentum.com',
    phoneNumber: '9490101088',
    role: 'Employee',
    designation: 'Graduate Trainee',
    addedOn: '15-Jan-2025',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'GT-2026-Batch-01'
  },
  {
    id: 'usr-105530',
    vamId: '105530',
    name: 'Anukraha Magdalene',
    email: 'Anukraha.Magdalene@valuemomentum.com',
    phoneNumber: '9384428335',
    role: 'Admin',
    designation: 'Lead - L&D Leadership',
    addedOn: '10-Jan-2025',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'L&D Leadership'
  },
  {
    id: 'usr-104275',
    vamId: '104275',
    name: 'Keren Christobel',
    email: 'Keren.Christobel@valuemomentum.com',
    phoneNumber: '9999999999',
    role: 'Admin',
    designation: 'Manager - L&D Management',
    addedOn: '10-Jan-2025',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'L&D Management'
  },
  {
    id: 'usr-102163',
    vamId: '102163',
    name: 'Janani Selvaraj',
    email: 'Janani.Selvaraj@valuemomentum.com',
    phoneNumber: '9999999999',
    role: 'Admin',
    designation: 'Manager - L&D Management',
    addedOn: '10-Jan-2025',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'L&D Management'
  },
  {
    id: 'usr-100137',
    vamId: '100137',
    name: 'Sudhir Vittapu',
    email: 'Sudhir.Vittapu@owlsure.com',
    phoneNumber: '9999999999',
    role: 'Admin',
    designation: 'Technical Facilitation Lead',
    addedOn: '10-Jan-2025',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'Technical Facilitation'
  },
  {
    id: 'usr-associate-ram',
    vamId: '-',
    name: 'Ram',
    email: '-',
    phoneNumber: '9894242460',
    role: 'Associate',
    designation: 'Associate Trainee',
    addedOn: '19-Aug-2026',
    status: 'Active',
    access: 'Enabled',
    addedBy: 'Admin',
    batch: 'GT-2026-Batch-01'
  }
];

const USER_MGMT_STORAGE_KEY = 'gt_user_management_records_store_v1';

export const getDefaultPasswordForEmail = (email: string): string => {
  if (!email || email === '-' || !email.includes('@')) return '';
  return email.split('@')[0].toLowerCase();
};

export const getUserManagementRecords = (): UserManagementRecord[] => {
  try {
    const raw = localStorage.getItem(USER_MGMT_STORAGE_KEY);
    if (raw !== null && raw !== undefined) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read user management records from storage', e);
  }
  return INITIAL_USER_MANAGEMENT_RECORDS;
};

export const saveUserManagementRecords = (records: UserManagementRecord[]): void => {
  try {
    localStorage.setItem(USER_MGMT_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save user management records to storage', e);
  }
};

export const findUserByPhoneNumber = (phoneNumber: string): UserManagementRecord | undefined => {
  const cleanPhone = (phoneNumber || '').replace(/\D/g, '').trim();
  if (!cleanPhone) return undefined;
  const records = getUserManagementRecords();
  return records.find((r) => (r.phoneNumber || '').replace(/\D/g, '').trim() === cleanPhone);
};

