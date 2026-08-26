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
    defaultPassword: 'sibibharathi.thangaraj',
    role: 'GT',
    name: 'Sibibharathi Thangaraj',
    firstName: 'Sibibharathi',
    lastName: 'Thangaraj',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Pavithran.Sivanandham@valuemomentum.com',
    defaultPassword: 'pavithran.sivanandham',
    role: 'GT',
    name: 'Pavithran Sivanandham',
    firstName: 'Pavithran',
    lastName: 'Sivanandham',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Aswin.Muruganandham@valuemomentum.com',
    defaultPassword: 'aswin.muruganandham',
    role: 'GT',
    name: 'Aswin Muruganandham',
    firstName: 'Aswin',
    lastName: 'Muruganandham',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Harshini.Radhakrishnan@valuemomentum.com',
    defaultPassword: 'harshini.radhakrishnan',
    role: 'GT',
    name: 'Harshini Radhakrishnan',
    firstName: 'Harshini',
    lastName: 'Radhakrishnan',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Imran.Aupe@valuemomentum.com',
    defaultPassword: 'imran.aupe',
    role: 'GT',
    name: 'Imran Aupe',
    firstName: 'Imran',
    lastName: 'Aupe',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Kruthika.Devaraje@valuemomentum.com',
    defaultPassword: 'kruthika.devaraje',
    role: 'GT',
    name: 'Kruthika Devaraje',
    firstName: 'Kruthika',
    lastName: 'Devaraje',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Vaishali.Karunai@valuemomentum.com',
    defaultPassword: 'vaishali.karunai',
    role: 'GT',
    name: 'Vaishali Karunai',
    firstName: 'Vaishali',
    lastName: 'Karunai',
    batch: 'GT-2026-Batch-01',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Tanvitha.Nadukuda@valuemomentum.com',
    defaultPassword: 'tanvitha.nadukuda',
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
    defaultPassword: 'anukraha.magdalene',
    role: 'Admin',
    name: 'Anukraha Magdalene',
    firstName: 'Anukraha',
    lastName: 'Magdalene',
    batch: 'L&D Leadership',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Keren.Christobel@valuemomentum.com',
    defaultPassword: 'keren.christobel',
    role: 'Admin',
    name: 'Keren Christobel',
    firstName: 'Keren',
    lastName: 'Christobel',
    batch: 'L&D Management',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Janani.Selvaraj@valuemomentum.com',
    defaultPassword: 'janani.selvaraj',
    role: 'Admin',
    name: 'Janani Selvaraj',
    firstName: 'Janani',
    lastName: 'Selvaraj',
    batch: 'L&D Management',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'Sudhir.Vittapu@owlsure.com',
    defaultPassword: 'sudhir.vittapu',
    role: 'Admin',
    name: 'Sudhir Vittapu',
    firstName: 'Sudhir',
    lastName: 'Vittapu',
    batch: 'Technical Facilitation',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
  }
];

const STORAGE_KEY = 'gt_custom_credentials_store_v2';

export const getCredentialStorageKey = (role: string, identifier: string): string => {
  const cleanRole = (role || 'employee').trim().toLowerCase();
  const cleanId = (identifier || '').trim().toLowerCase();
  return `${cleanRole}:${cleanId}`;
};

// Safe localStorage abstraction supporting both browser and server/test environments
let memoryStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch {
        // fallback
      }
    }
    return memoryStorage[key] || null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch {
        // fallback
      }
    }
    memoryStorage[key] = value;
  },
  removeItem: (key: string): void => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch {
        // fallback
      }
    }
    delete memoryStorage[key];
  },
  clear: (): void => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.clear();
      } catch {
        // fallback
      }
    }
    memoryStorage = {};
  }
};

/**
 * Retrieves the current credentials store, merging initial seed data with user updates
 */
export const getCredentialsStore = (): Record<string, { password: string; profile: RegisteredCredential }> => {
  const store: Record<string, { password: string; profile: RegisteredCredential }> = {};

  // 1. Seed initial credentials
  INITIAL_CREDENTIALS.forEach((cred) => {
    const lowerEmail = cred.email.trim().toLowerCase();
    const roleKey = getCredentialStorageKey(cred.role, lowerEmail);

    store[roleKey] = {
      password: cred.defaultPassword,
      profile: { ...cred }
    };
    store[lowerEmail] = {
      password: cred.defaultPassword,
      profile: { ...cred }
    };
  });

  // 2. Dynamically load / merge from active user management records roster
  const activeRoster = getUserManagementRecords();

  activeRoster.forEach((u) => {
    if (!u.email || u.email === '-' || !u.email.includes('@')) return;
    const lowerEmail = u.email.trim().toLowerCase();
    const userRole: 'Admin' | 'GT' | 'Associate' = u.role === 'Admin' ? 'Admin' : u.role === 'Associate' ? 'Associate' : 'GT';
    const roleKey = getCredentialStorageKey(userRole, lowerEmail);

    const defaultPw = u.password || getDefaultPasswordForEmail(lowerEmail);
    const parts = (u.name || '').trim().split(' ');

    const profileData: RegisteredCredential = {
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
    };

    store[roleKey] = {
      password: defaultPw,
      profile: profileData
    };
    store[lowerEmail] = {
      password: defaultPw,
      profile: profileData
    };
  });

  // 3. Overlay persistent changes from localStorage password overrides
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (raw) {
      const overrides = JSON.parse(raw);
      if (typeof overrides === 'object' && overrides !== null) {
        Object.keys(overrides).forEach((key) => {
          if (typeof overrides[key] === 'string' && store[key.toLowerCase()]) {
            store[key.toLowerCase()].password = overrides[key];
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
 * Syncs cross-browser password overrides from the backend server
 */
export const syncServerCredentialsOverrides = async (): Promise<void> => {
  try {
    const res = await fetch('/api/auth/credentials');
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && data.overrides && typeof data.overrides === 'object') {
        const currentRaw = safeLocalStorage.getItem(STORAGE_KEY);
        let currentOverrides: Record<string, string> = {};
        if (currentRaw) {
          try { currentOverrides = JSON.parse(currentRaw); } catch {}
        }
        const merged = { ...currentOverrides, ...data.overrides };
        safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
    }
  } catch {
    // Offline mode
  }
};

/**
 * Checks if the email domain is permitted (strictly @valuemomentum.com or @owlsure.com)
 */
export const isAllowedDomain = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const lower = email.trim().toLowerCase();
  return lower.endsWith('@valuemomentum.com') || lower.endsWith('@owlsure.com');
};

/**
 * Authenticates a user against the registered credentials store with strict Role-Scoping
 */
export const authenticateLocalUser = (
  email: string,
  password?: string,
  targetRole?: string
): { success: boolean; data?: AuthUserDto; message?: string } => {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Validate email domain
  if (!isAllowedDomain(cleanEmail)) {
    return {
      success: false,
      message: 'Only @valuemomentum.com and @owlsure.com email addresses are allowed.'
    };
  }

  // 2. Load roster records and seed credentials matching cleanEmail
  const roster = getUserManagementRecords();
  const rosterMatches = roster.filter(
    (u) => u.email && u.email !== '-' && u.email.trim().toLowerCase() === cleanEmail
  );

  const seedMatches = INITIAL_CREDENTIALS.filter(
    (c) => c.email.trim().toLowerCase() === cleanEmail
  );

  let rawOverrides: Record<string, string> = {};
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (raw) rawOverrides = JSON.parse(raw) || {};
  } catch {}

  const cleanPassword = (password || '').trim();

  // Helper to determine active password for a given candidate role & account
  const getAccountPassword = (role: string, uId?: string, recordPassword?: string): string => {
    const rKey = getCredentialStorageKey(role, cleanEmail);
    if (rawOverrides[rKey]) return rawOverrides[rKey].trim();
    if (uId && rawOverrides[uId]) return rawOverrides[uId].trim();
    if (recordPassword && recordPassword.trim() && recordPassword !== '-') return recordPassword.trim();
    return getDefaultPasswordForEmail(cleanEmail);
  };

  // Build candidate account list (roster records take precedence over seed data)
  let candidateAccounts: Array<{
    id: string;
    email: string;
    role: 'Admin' | 'Employee' | 'Associate';
    name: string;
    activePassword: string;
    batch?: string;
  }> = [];

  if (rosterMatches.length > 0) {
    rosterMatches.forEach((r) => {
      const rRole: 'Admin' | 'Employee' | 'Associate' =
        r.role === 'Admin' ? 'Admin' : r.role === 'Associate' ? 'Associate' : 'Employee';
      candidateAccounts.push({
        id: r.id,
        email: r.email,
        role: rRole,
        name: r.name,
        activePassword: getAccountPassword(rRole, r.id, r.password),
        batch: r.batch
      });
    });
  } else {
    seedMatches.forEach((s) => {
      const sRole: 'Admin' | 'Employee' | 'Associate' = s.role === 'Admin' ? 'Admin' : 'Employee';
      candidateAccounts.push({
        id: `seed-${sRole.toLowerCase()}-${cleanEmail}`,
        email: s.email,
        role: sRole,
        name: s.name,
        activePassword: getAccountPassword(sRole, undefined, s.defaultPassword),
        batch: s.batch
      });
    });
  }

  if (candidateAccounts.length === 0) {
    return {
      success: false,
      message: 'Incorrect email ID or password.'
    };
  }

  // Filter or prioritize targetRole if specified
  if (targetRole) {
    const cleanTargetRole = targetRole.trim().toLowerCase();
    const isCompanionTarget = cleanTargetRole === 'gt' || cleanTargetRole === 'employee' || cleanTargetRole === 'associate';

    const roleMatched = candidateAccounts.filter((acc) => {
      const accRole = acc.role.toLowerCase();
      if (cleanTargetRole === 'admin') return accRole === 'admin';
      if (isCompanionTarget) return accRole === 'employee' || accRole === 'gt' || accRole === 'associate';
      return accRole === cleanTargetRole;
    });
    if (roleMatched.length > 0) {
      candidateAccounts = roleMatched;
    }
  }

  // Match password: check exact match or case-insensitive default password match
  const matchedAccount = candidateAccounts.find((acc) => {
    const activePw = (acc.activePassword || '').trim();
    const inputPw = cleanPassword.trim();
    if (!inputPw || !activePw) return false;
    if (activePw === inputPw) return true;
    if (activePw.toLowerCase() === inputPw.toLowerCase()) return true;
    return false;
  });

  if (!matchedAccount || !password) {
    return {
      success: false,
      message: 'Incorrect email ID or password.'
    };
  }

  const parts = matchedAccount.name.trim().split(' ');
  const token = `token-${matchedAccount.role.toLowerCase()}-${matchedAccount.email}-${Date.now()}`;

  return {
    success: true,
    data: {
      id: matchedAccount.id,
      email: matchedAccount.email,
      firstName: parts[0] || matchedAccount.name,
      lastName: parts.slice(1).join(' ') || '',
      role: matchedAccount.role,
      token,
      batch: matchedAccount.batch || 'GT-2026-Batch-01',
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
 * Changes a user's password strictly for their specific Role Account and persists it
 */
export const changeUserPassword = (
  email: string,
  currentPassword: string,
  newPassword: string,
  targetRole?: string
): { success: boolean; message: string } => {
  const cleanEmail = email.trim().toLowerCase();

  if (!isAllowedDomain(cleanEmail)) {
    return {
      success: false,
      message: 'Only @valuemomentum.com and @owlsure.com email addresses are allowed.'
    };
  }

  const authResult = authenticateLocalUser(cleanEmail, currentPassword, targetRole);
  if (!authResult.success || !authResult.data) {
    return {
      success: false,
      message: 'Current password is incorrect.'
    };
  }

  if (currentPassword === newPassword) {
    return {
      success: false,
      message: 'New password cannot be the same as your current password. Please choose a different password.'
    };
  }

  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      message: 'New password must be at least 8 characters long.'
    };
  }

  const userRole = authResult.data.role;
  const rKey = getCredentialStorageKey(userRole, cleanEmail);

  // 1. Save new password into persistent storage override under role-scoped key
  try {
    let overrides: Record<string, string> = {};
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (raw) overrides = JSON.parse(raw) || {};
    overrides[rKey] = newPassword;
    overrides[authResult.data.id] = newPassword;
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Failed to persist new password to storage', e);
  }

  // 2. Also update User Management roster record for THAT SPECIFIC RECORD ONLY
  try {
    const roster = getUserManagementRecords();
    let updated = false;
    const updatedRoster = roster.map((r) => {
      if (
        r.id === authResult.data?.id ||
        (r.email &&
          r.email.trim().toLowerCase() === cleanEmail &&
          (r.role.toLowerCase() === userRole.toLowerCase() ||
            (r.role === 'Employee' && userRole === 'GT') ||
            (r.role === 'Associate' && userRole === 'Associate')))
      ) {
        updated = true;
        return { ...r, password: newPassword };
      }
      return r;
    });
    if (updated) {
      saveUserManagementRecords(updatedRoster);
    }
  } catch (e) {
    console.warn('Failed to sync updated password into user management roster', e);
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
  newPassword: string,
  targetRole?: string
): { success: boolean; message: string } => {
  const cleanEmail = email.trim().toLowerCase();

  if (!isAllowedDomain(cleanEmail)) {
    return {
      success: false,
      message: 'Only @valuemomentum.com and @owlsure.com email addresses are allowed.'
    };
  }

  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      message: 'New password must be at least 8 characters long.'
    };
  }

  const roster = getUserManagementRecords();
  let matched = roster.find(
    (u) =>
      u.email &&
      u.email.trim().toLowerCase() === cleanEmail &&
      (!targetRole || u.role.toLowerCase() === targetRole.toLowerCase())
  );

  const matchedRole = matched ? matched.role : targetRole || 'Employee';
  const rKey = getCredentialStorageKey(matchedRole, cleanEmail);

  try {
    let overrides: Record<string, string> = {};
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (raw) overrides = JSON.parse(raw) || {};
    overrides[rKey] = newPassword;
    if (matched) overrides[matched.id] = newPassword;
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Failed to persist reset password to storage', e);
  }

  try {
    let updated = false;
    const updatedRoster = roster.map((r) => {
      if (
        (matched && r.id === matched.id) ||
        (r.email && r.email.trim().toLowerCase() === cleanEmail && r.role === matchedRole)
      ) {
        updated = true;
        return { ...r, password: newPassword };
      }
      return r;
    });
    if (updated) {
      saveUserManagementRecords(updatedRoster);
    }
  } catch (e) {
    console.warn('Failed to sync reset password into user management roster', e);
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
  return email.split('@')[0].trim().toLowerCase();
};

export const getUserManagementRecords = (): UserManagementRecord[] => {
  try {
    const raw = safeLocalStorage.getItem(USER_MGMT_STORAGE_KEY);
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
    const current = getUserManagementRecords();
    const currentIds = new Set(current.map((c) => c.id));
    const newIds = new Set(records.map((r) => r.id));

    // Identify deleted records to clear password overrides
    const deletedRecords = current.filter((c) => !newIds.has(c.id));
    if (deletedRecords.length > 0) {
      try {
        const rawOverrides = safeLocalStorage.getItem(STORAGE_KEY);
        if (rawOverrides) {
          const overrides = JSON.parse(rawOverrides) || {};
          deletedRecords.forEach((d) => {
            const cleanEmail = (d.email || '').trim().toLowerCase();
            const cleanPhone = (d.phoneNumber || '').replace(/\D/g, '').trim();
            const rRole = d.role || 'Employee';

            delete overrides[getCredentialStorageKey(rRole, cleanEmail)];
            delete overrides[getCredentialStorageKey(rRole, cleanPhone)];
            delete overrides[d.id];
            delete overrides[cleanEmail];
            delete overrides[cleanPhone];
          });
          safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
        }
      } catch {}
    }

    safeLocalStorage.setItem(USER_MGMT_STORAGE_KEY, JSON.stringify(records));
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

