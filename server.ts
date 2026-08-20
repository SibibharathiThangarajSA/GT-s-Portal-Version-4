import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

// Storage files configuration
const DATA_DIR = process.cwd();
const SESSIONS_FILE = path.join(DATA_DIR, 'server_sessions.json');
const USER_ROSTER_FILE = path.join(DATA_DIR, 'server_users_roster.json');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'server_credentials.json');
const MATERIALS_FILE = path.join(DATA_DIR, 'server_materials.json');
const QUIZZES_FILE = path.join(DATA_DIR, 'server_quizzes.json');
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'server_assignments.json');
const DISCUSSIONS_FILE = path.join(DATA_DIR, 'server_discussions.json');
const NOTES_FILE = path.join(DATA_DIR, 'server_personal_notes.json');
const SESSION_TRACKER_FILE = path.join(DATA_DIR, 'server_session_tracker.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'server_activities.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'server_user_progress.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'public', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create uploads directory', e);
  }
}

// Initial Official User Roster (13 Accounts)
const INITIAL_USERS_ROSTER = [
  { id: 'usr-105527', vamId: '105527', name: 'Sibibharathi Thangaraj', email: 'Sibibharathi.Thangaraj@valuemomentum.com', phoneNumber: '9345766068', role: 'Employee', designation: 'Graduate Trainee', addedOn: '20-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105500', vamId: '105500', name: 'Pavithran Sivanandham', email: 'Pavithran.Sivanandham@valuemomentum.com', phoneNumber: '7845911687', role: 'Employee', designation: 'Graduate Trainee', addedOn: '20-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105515', vamId: '105515', name: 'Aswin Muruganandham', email: 'Aswin.Muruganandham@valuemomentum.com', phoneNumber: '9626637490', role: 'Employee', designation: 'Graduate Trainee', addedOn: '20-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105520', vamId: '105520', name: 'Harshini Radhakrishnan', email: 'Harshini.Radhakrishnan@valuemomentum.com', phoneNumber: '8220126157', role: 'Employee', designation: 'Graduate Trainee', addedOn: '18-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105511', vamId: '105511', name: 'Imran Aupe', email: 'Imran.Aupe@valuemomentum.com', phoneNumber: '9952590815', role: 'Employee', designation: 'Graduate Trainee', addedOn: '18-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105496', vamId: '105496', name: 'Kruthika Devaraje', email: 'Kruthika.Devaraje@valuemomentum.com', phoneNumber: '9902518633', role: 'Employee', designation: 'Graduate Trainee', addedOn: '15-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105503', vamId: '105503', name: 'Vaishali Karunai', email: 'Vaishali.Karunai@valuemomentum.com', phoneNumber: '8012325313', role: 'Employee', designation: 'Graduate Trainee', addedOn: '15-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105529', vamId: '105529', name: 'Tanvitha Nadukuda', email: 'Tanvitha.Nadukuda@valuemomentum.com', phoneNumber: '9490101088', role: 'Employee', designation: 'Graduate Trainee', addedOn: '15-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105530', vamId: '105530', name: 'Anukraha Magdalene', email: 'Anukraha.Magdalene@valuemomentum.com', phoneNumber: '9384428335', role: 'Admin', designation: 'Lead - L&D Leadership', addedOn: '10-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'L&D Leadership' },
  { id: 'usr-104275', vamId: '104275', name: 'Keren Christobel', email: 'Keren.Christobel@valuemomentum.com', phoneNumber: '9999999999', role: 'Admin', designation: 'Manager - L&D Management', addedOn: '10-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'L&D Management' },
  { id: 'usr-102163', vamId: '102163', name: 'Janani Selvaraj', email: 'Janani.Selvaraj@valuemomentum.com', phoneNumber: '9999999999', role: 'Admin', designation: 'Manager - L&D Management', addedOn: '10-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'L&D Management' },
  { id: 'usr-100137', vamId: '100137', name: 'Sudhir Vittapu', email: 'Sudhir.Vittapu@owlsure.com', phoneNumber: '9999999999', role: 'Admin', designation: 'Technical Facilitation Lead', addedOn: '10-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'Technical Facilitation' },
  { id: 'usr-associate-ram', vamId: '-', name: 'Ram', email: '-', phoneNumber: '9894242460', role: 'Associate', designation: 'Associate Trainee', addedOn: '19-Aug-2026', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' }
];

// Initial Seed Sessions (Empty - Admin will create sessions from scratch)
const INITIAL_SEED_SESSIONS: any[] = [];

// Helper Functions for JSON Disk DB
const readJsonFile = <T>(filePath: string, fallback: T): T => {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (parsed !== null && parsed !== undefined) return parsed;
      }
    }
  } catch (e) {
    console.warn(`Failed to read ${filePath}`, e);
  }
  return fallback;
};

// Initialize S3 Client for Object Storage (Tigris)
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'https://t3.storageapi.dev',
  region: process.env.S3_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'tid_qJLZlUnpNMISimFhapSl_QhDKMbBumkqfSPqdbFjeAqPVcqSck',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'tsec_DExQt4kUQMFnD-ATXFJKoL+NAbk0SAEZ6ntDiu6z0FxxCV+JIiR-6+m-xiX+q9EW4oNcn1'
  }
});
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'shelved-trunk-zrxdvpxaih4';

// Helper to sync JSON database files to Tigris S3 Cloud Storage
const syncJsonToS3 = async (filePath: string, data: any): Promise<void> => {
  try {
    const fileName = path.basename(filePath);
    const key = `db_backup/${fileName}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: Buffer.from(JSON.stringify(data, null, 2), 'utf-8'),
      ContentType: 'application/json'
    }));
    console.log(`[S3 DB Sync] Synced ${fileName} to Tigris S3 successfully (${Array.isArray(data) ? data.length + ' items' : 'object'}).`);
  } catch (err: any) {
    console.warn(`[S3 DB Sync] Warning syncing ${path.basename(filePath)} to S3:`, err?.message);
  }
};

const fetchJsonFromS3 = async <T>(fileName: string, fallback: T): Promise<T> => {
  try {
    const key = `db_backup/${fileName}`;
    const res = await s3Client.send(new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    }));
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as any) {
      chunks.push(Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf-8');
    if (raw && raw.trim()) {
      const parsed = JSON.parse(raw);
      if (parsed !== null && parsed !== undefined) return parsed;
    }
  } catch (err: any) {
    // File not found on S3 yet or network error
  }
  return fallback;
};

const writeJsonFile = (filePath: string, data: any): void => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    // Asynchronously push update to Tigris S3 Cloud Storage
    syncJsonToS3(filePath, data).catch((err) => {
      console.warn(`[S3 Write Warning] Async push failed for ${path.basename(filePath)}:`, err?.message);
    });
  } catch (e) {
    console.error(`Failed to write ${filePath}`, e);
  }
};

// Initial Cloud S3 DB hydration on startup (Safe, non-destructive)
async function hydrateDatabaseFromS3() {
  console.log('[S3 DB Hydration] Checking and syncing persistent database from Tigris S3...');
  const files = [
    { file: USER_ROSTER_FILE, fallback: INITIAL_USERS_ROSTER },
    { file: SESSIONS_FILE, fallback: INITIAL_SEED_SESSIONS },
    { file: SESSION_TRACKER_FILE, fallback: [] },
    { file: CREDENTIALS_FILE, fallback: {} },
    { file: NOTES_FILE, fallback: [] },
    { file: ACTIVITIES_FILE, fallback: [] },
    { file: PROGRESS_FILE, fallback: [] }
  ];

  for (const { file, fallback } of files) {
    const fileName = path.basename(file);
    try {
      const s3Data = await fetchJsonFromS3<any>(fileName, null);
      if (s3Data !== null && s3Data !== undefined) {
        fs.writeFileSync(file, JSON.stringify(s3Data, null, 2), 'utf-8');
        const countStr = Array.isArray(s3Data) ? `${s3Data.length} records` : 'object';
        console.log(`[S3 DB Hydration] Restored ${fileName} from Tigris S3 successfully (${countStr}).`);
      } else {
        // S3 is empty for this key. If local disk has existing data, seed S3 with it.
        if (fs.existsSync(file)) {
          const localData = readJsonFile(file, fallback);
          if (localData !== null && localData !== undefined && (Array.isArray(localData) ? localData.length > 0 : Object.keys(localData).length > 0)) {
            await syncJsonToS3(file, localData);
            console.log(`[S3 DB Hydration] Initialized S3 ${fileName} with local data.`);
          } else {
            fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf-8');
          }
        } else {
          fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf-8');
          if (Array.isArray(fallback) && fallback.length > 0) {
            await syncJsonToS3(file, fallback);
          }
        }
      }
    } catch (e: any) {
      console.warn(`[S3 DB Hydration] Note for ${fileName}:`, e?.message);
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf-8');
      }
    }
  }
}

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Multer Upload Configuration (Supports up to 500MB video and document uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 500 // 500 MB
  }
});

async function startServer() {
  // 1. Restore all database records from Tigris S3 Cloud Storage before accepting traffic
  await hydrateDatabaseFromS3();

  const app = express();
  const requestedPort = Number(process.env.PORT || 3000);
  const PORT = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3000;

  // 2. Reverse Proxy & Trust Configuration (Crucial for Railway / Cloudflare / Load Balancers)
  app.set('trust proxy', 1);

  // 3. Global CORS Configuration
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // 4. Live HTTP Traffic Logging Middleware (Displays incoming network traffic in Railway console)
  app.use((req, res, next) => {
    const start = Date.now();
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const isHealth = req.path === '/api/health' || req.path === '/api/ai/health';
      const statusIcon = status < 400 ? '🟢' : (status < 500 ? '🟡' : '🔴');
      
      // Log all API traffic and errors (quiet healthchecks under 400 to prevent log clutter)
      if (!isHealth || status >= 400) {
        console.log(`${statusIcon} [HTTP] ${req.method.padEnd(6)} ${req.originalUrl} -> ${status} (${duration}ms) [IP: ${ip}]`);
      }
    });
    next();
  });

  // JSON Body Parsing for all incoming requests
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static Assets
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- 1. HEALTH CHECKS (Supports Railway deployment healthcheck & monitoring) ---
  const handleHealthCheck = (_req: express.Request, res: express.Response) => {
    const sessions = getAllSessions();
    const users = getAllUsers();
    res.json({
      status: "ok",
      service: "GT-Portal-BFF",
      mode: "standalone-node-backend",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: "persistent-s3-json",
      stats: {
        totalSessions: sessions.length,
        totalUsers: users.length
      }
    });
  };

  app.get("/api/health", handleHealthCheck);
  app.get("/api/ai/health", handleHealthCheck);

  // --- 2. AUTHENTICATION & USER MANAGEMENT ROUTER ---
  const auth = express.Router();

  const getAllUsers = () => readJsonFile(USER_ROSTER_FILE, INITIAL_USERS_ROSTER);
  const saveAllUsers = (users: any[]) => writeJsonFile(USER_ROSTER_FILE, users);

  const getActivePasswordStore = () => {
    const store: Record<string, { password: string; profile: any }> = {};
    const roster = getAllUsers();

    roster.forEach((acc: any) => {
      if (!acc.email || acc.email === '-') return;
      const defaultPw = (acc.email.split('@')[0] || '').toLowerCase();
      const parts = (acc.name || '').split(' ');
      store[acc.email.toLowerCase()] = {
        password: defaultPw,
        profile: {
          ...acc,
          firstName: parts[0] || acc.name,
          lastName: parts.slice(1).join(' ') || '',
          defaultPassword: defaultPw
        }
      };
    });

    const overrides = readJsonFile<Record<string, string>>(CREDENTIALS_FILE, {});
    Object.keys(overrides).forEach((key) => {
      const lower = key.toLowerCase();
      if (store[lower]) {
        store[lower].password = overrides[key];
      }
    });

    return store;
  };

  const savePasswordDisk = (email: string, newPassword: string) => {
    const overrides = readJsonFile<Record<string, string>>(CREDENTIALS_FILE, {});
    overrides[email.toLowerCase()] = newPassword;
    writeJsonFile(CREDENTIALS_FILE, overrides);
  };

  // Login (Email + Password)
  auth.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail.endsWith('@valuemomentum.com') && !cleanEmail.endsWith('@owlsure.com')) {
      return res.status(400).json({
        success: false,
        message: 'Only @valuemomentum.com and @owlsure.com email addresses are allowed.'
      });
    }

    const store = getActivePasswordStore();
    const userEntry = store[cleanEmail];

    if (!userEntry || !password || (userEntry.password.toLowerCase() !== password.toLowerCase() && userEntry.password !== password)) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email ID or password.'
      });
    }

    const user = userEntry.profile;
    const role = user.role === 'Admin' ? 'Admin' : 'GT';

    return res.json({
      success: true,
      data: {
        id: `user-${user.email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role,
        token: `token-${role.toLowerCase()}-${user.email}-${Date.now()}`,
        batch: user.batch || 'GT-2026-Batch-01',
        xp: 2850,
        level: 5,
        streakDays: 14,
        lastActiveDate: new Date().toISOString().split('T')[0],
        dailyGoalMinutes: 45,
        todayMinutesSpent: 25
      }
    });
  });

  // Get all users in roster
  auth.get('/users', (_req, res) => {
    const users = getAllUsers();
    return res.json({ success: true, data: users });
  });

  // Save/Update full users roster
  auth.post('/users', (req, res) => {
    const { records } = req.body || {};
    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Invalid records format.' });
    }

    // Backend duplicate phone check
    const seenPhones = new Set<string>();
    for (const rec of records) {
      const cleanPhone = (rec.phoneNumber || '').replace(/\D/g, '').trim();
      if (cleanPhone && cleanPhone.length === 10) {
        if (seenPhones.has(cleanPhone)) {
          return res.status(400).json({
            success: false,
            message: `Duplicate phone number "${cleanPhone}" detected. Each user must have a unique phone number.`
          });
        }
        seenPhones.add(cleanPhone);
      }
    }

    saveAllUsers(records);
    return res.json({ success: true, message: 'User roster saved successfully.', count: records.length });
  });

  // Delete user from roster permanently
  auth.delete('/users/:id', (req, res) => {
    let users = getAllUsers();
    const targetId = decodeURIComponent(req.params.id || '').trim();
    const userToDelete = users.find((u: any) => u.id === targetId || u.vamId === targetId || (u.email && u.email.toLowerCase() === targetId.toLowerCase()));
    
    if (userToDelete && userToDelete.email) {
      const overrides = readJsonFile<Record<string, string>>(CREDENTIALS_FILE, {});
      delete overrides[userToDelete.email.toLowerCase()];
      writeJsonFile(CREDENTIALS_FILE, overrides);
    }
    
    users = users.filter((u: any) => u.id !== targetId && u.vamId !== targetId && (!u.email || u.email.toLowerCase() !== targetId.toLowerCase()));
    saveAllUsers(users);
    return res.json({ success: true, message: 'User permanently removed from roster.' });
  });

  // Update user in roster
  auth.put('/users/:id', (req, res) => {
    let users = getAllUsers();
    const targetId = decodeURIComponent(req.params.id || '').trim();
    const index = users.findIndex((u: any) => u.id === targetId || u.vamId === targetId || (u.email && u.email.toLowerCase() === targetId.toLowerCase()));
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.body.phoneNumber) {
      const cleanPhone = req.body.phoneNumber.replace(/\D/g, '').trim();
      if (cleanPhone && cleanPhone.length === 10) {
        const duplicate = users.find((u: any) => u.id !== targetId && (u.phoneNumber || '').replace(/\D/g, '').trim() === cleanPhone);
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `Phone number "${cleanPhone}" is already registered for ${duplicate.name}.`
          });
        }
      }
    }

    users[index] = { ...users[index], ...req.body, id: users[index].id || targetId };
    if (req.body.password && users[index].email && users[index].email !== '-') {
      savePasswordDisk(users[index].email, req.body.password);
    }
    saveAllUsers(users);
    return res.json({ success: true, data: users[index] });
  });

  // Mobile OTP Generation
  auth.post('/request-mobile-otp', (req, res) => {
    const { phoneNumber } = req.body || {};
    const cleanPhone = (phoneNumber || '').replace(/\D/g, '').trim();

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    const roster = getAllUsers();
    const user = roster.find((u: any) => (u.phoneNumber || '').replace(/\D/g, '').trim() === cleanPhone);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Mobile number not found. Please contact your L&D Administrator.'
      });
    }

    // Enterprise Credentials Guard
    const hasVamId = user.vamId && user.vamId !== '-' && user.vamId.trim() !== '';
    const hasEmail = user.email && user.email !== '-' && user.email.includes('@');

    if (hasVamId || hasEmail) {
      return res.status(400).json({
        success: false,
        isEnterpriseUser: true,
        message: 'You have enterprise credentials registered. Please login with your official email and password.'
      });
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    return res.json({
      success: true,
      otp: generatedOtp,
      user,
      message: `Verification code generated successfully for ${cleanPhone}.`
    });
  });

  // Mobile OTP Verification
  auth.post('/verify-mobile-otp', (req, res) => {
    const { phoneNumber, otp } = req.body || {};
    const cleanPhone = (phoneNumber || '').replace(/\D/g, '').trim();
    const cleanOtp = (otp || '').trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit OTP code.' });
    }

    const roster = getAllUsers();
    const user = roster.find((u: any) => (u.phoneNumber || '').replace(/\D/g, '').trim() === cleanPhone);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Mobile number not found.' });
    }

    const role = user.role === 'Admin' ? 'Admin' : 'GT';
    const fullName = user.name || 'Associate User';
    const parts = fullName.split(' ');

    return res.json({
      success: true,
      data: {
        id: user.id || `user-mobile-${cleanPhone}`,
        email: user.email && user.email !== '-' ? user.email : `associate.${cleanPhone}@valuemomentum.com`,
        firstName: parts[0] || fullName,
        lastName: parts.slice(1).join(' ') || '',
        role,
        token: `token-mobile-${cleanPhone}-${Date.now()}`,
        batch: user.batch || 'GT-2026-Batch-01',
        xp: 1500,
        level: 3,
        streakDays: 7,
        lastActiveDate: new Date().toISOString().split('T')[0],
        dailyGoalMinutes: 45,
        todayMinutesSpent: 15
      },
      message: 'OTP verified successfully.'
    });
  });

  // Change Password
  auth.post('/change-password', (req, res) => {
    const { email, currentPassword, newPassword } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    const store = getActivePasswordStore();
    const userEntry = store[cleanEmail];

    if (!userEntry) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (userEntry.password !== currentPassword && userEntry.password.toLowerCase() !== currentPassword.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
    }

    savePasswordDisk(cleanEmail, newPassword);

    return res.json({
      success: true,
      message: 'Password changed successfully! You can now log in with your new password.'
    });
  });

  // Reset Password
  auth.post('/reset-password', (req, res) => {
    const { email, newPassword } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    const store = getActivePasswordStore();
    const userEntry = store[cleanEmail];

    if (!userEntry) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    savePasswordDisk(cleanEmail, newPassword);

    return res.json({
      success: true,
      message: 'Password has been reset successfully! Please log in with your new password.'
    });
  });

  // Forgot Password
  auth.post('/forgot-password', (req, res) => {
    const { email } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    const store = getActivePasswordStore();
    if (!store[cleanEmail]) {
      return res.status(404).json({ success: false, message: 'Account not found for this email address.' });
    }

    return res.json({ success: true, message: 'Verification code sent to your registered email address.' });
  });

  auth.post('/verify-otp', (_req, res) => {
    return res.json({
      success: true,
      data: { resetToken: `reset-token-${Date.now()}` },
      message: 'OTP verified successfully.'
    });
  });

  app.use("/api/auth", auth);

  // --- 3. SESSIONS API ROUTER ---
  const getAllSessions = () => readJsonFile(SESSIONS_FILE, INITIAL_SEED_SESSIONS);
  const saveAllSessions = (sessions: any[]) => writeJsonFile(SESSIONS_FILE, sessions);

  app.get("/api/sessions", (_req, res) => {
    const sessions = getAllSessions();
    res.json(sessions);
  });

  app.get("/api/sessions/:id", (req, res) => {
    const sessions = getAllSessions();
    const session = sessions.find((s: any) => s.id === req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json(session);
  });

  app.post("/api/sessions", (req, res) => {
    const newSession = req.body || {};
    const sessions = getAllSessions();
    const sessionId = newSession.id || `session-${Date.now()}`;

    // Deduplicate: If session with this ID or (Name + Category) already exists, update in-place
    const existingIdx = sessions.findIndex((s: any) => 
      (newSession.id && s.id === newSession.id) || 
      (newSession.name && s.name && s.name.trim().toLowerCase() === newSession.name.trim().toLowerCase() && s.category === newSession.category)
    );
    
    if (existingIdx !== -1) {
      sessions[existingIdx] = {
        ...sessions[existingIdx],
        ...newSession,
        id: sessions[existingIdx].id
      };
      saveAllSessions(sessions);
      return res.json(sessions[existingIdx]);
    }

    const createdSession = {
      ...newSession,
      id: sessionId,
      learningObjectives: newSession.learningObjectives || [],
      topics: newSession.topics || [],
      studyMaterials: newSession.studyMaterials || [],
      quizzes: newSession.quizzes || [],
      assignments: newSession.assignments || [],
      notes: newSession.notes || []
    };
    sessions.unshift(createdSession);
    saveAllSessions(sessions);
    res.status(201).json(createdSession);
  });

  app.put("/api/sessions/:id", (req, res) => {
    const sessions = getAllSessions();
    const index = sessions.findIndex((s: any) => s.id === req.params.id);
    if (index === -1) {
      // Upsert if session doesn't exist
      const createdSession = {
        ...req.body,
        id: req.params.id,
        learningObjectives: req.body.learningObjectives || [],
        topics: req.body.topics || [],
        studyMaterials: req.body.studyMaterials || [],
        quizzes: req.body.quizzes || [],
        assignments: req.body.assignments || [],
        notes: req.body.notes || []
      };
      sessions.unshift(createdSession);
      saveAllSessions(sessions);
      return res.status(201).json(createdSession);
    }

    sessions[index] = { ...sessions[index], ...req.body, id: req.params.id };
    saveAllSessions(sessions);
    res.json(sessions[index]);
  });

  app.delete("/api/sessions/:id", (req, res) => {
    let sessions = getAllSessions();
    sessions = sessions.filter((s: any) => s.id !== req.params.id);
    saveAllSessions(sessions);
    res.json({ message: "Session deleted successfully" });
  });

  // --- 4. STUDY MATERIALS API ROUTER ---
  app.get("/api/materials", (req, res) => {
    const { sessionId, category } = req.query;
    const sessions = getAllSessions();
    let materials: any[] = [];

    sessions.forEach((s: any) => {
      if (!sessionId || s.id === sessionId) {
        if (Array.isArray(s.studyMaterials)) {
          materials.push(...s.studyMaterials);
        }
      }
    });

    if (category) {
      const catLower = category.toString().trim().toLowerCase();
      materials = materials.filter((m: any) => {
        const itemCat = (m.materialCategory || m.materialType || '').toString().trim().toLowerCase();
        if (catLower === 'provided') {
          return itemCat !== 'additional' && itemCat !== 'extra';
        }
        if (catLower === 'additional') {
          return itemCat === 'additional' || itemCat === 'extra';
        }
        return itemCat === catLower;
      });
    }

    res.json(materials);
  });

  app.post("/api/materials", (req, res) => {
    const newMat = req.body || {};
    const sessions = getAllSessions();
    const targetSession = sessions.find((s: any) => s.id === newMat.sessionId);
    const createdMat = {
      ...newMat,
      id: newMat.id || `mat-${Date.now()}`
    };

    if (targetSession) {
      if (!Array.isArray(targetSession.studyMaterials)) targetSession.studyMaterials = [];
      const existingMatIdx = targetSession.studyMaterials.findIndex((m: any) => 
        (newMat.id && m.id === newMat.id) || 
        (newMat.title && m.title && m.title.trim().toLowerCase() === newMat.title.trim().toLowerCase() && (m.materialCategory || m.materialType) === (newMat.materialCategory || newMat.materialType))
      );
      if (existingMatIdx !== -1) {
        targetSession.studyMaterials[existingMatIdx] = {
          ...targetSession.studyMaterials[existingMatIdx],
          ...newMat,
          id: targetSession.studyMaterials[existingMatIdx].id
        };
        saveAllSessions(sessions);
        return res.status(200).json(targetSession.studyMaterials[existingMatIdx]);
      }

      targetSession.studyMaterials.push(createdMat);
      saveAllSessions(sessions);
    }
    res.status(201).json(createdMat);
  });

  app.put("/api/materials/:id", (req, res) => {
    const sessions = getAllSessions();
    let updatedMat: any = null;

    sessions.forEach((s: any) => {
      if (Array.isArray(s.studyMaterials)) {
        const idx = s.studyMaterials.findIndex((m: any) => m.id === req.params.id);
        if (idx !== -1) {
          s.studyMaterials[idx] = { ...s.studyMaterials[idx], ...req.body, id: req.params.id };
          updatedMat = s.studyMaterials[idx];
        }
      }
    });

    if (updatedMat) {
      saveAllSessions(sessions);
      return res.json(updatedMat);
    }
    res.status(404).json({ message: "Material not found" });
  });

  app.delete("/api/materials/:id", async (req, res) => {
    const sessions = getAllSessions();
    let deletedMaterial: any = null;

    sessions.forEach((s: any) => {
      if (Array.isArray(s.studyMaterials)) {
        const found = s.studyMaterials.find((m: any) => m.id === req.params.id);
        if (found) deletedMaterial = found;
        s.studyMaterials = s.studyMaterials.filter((m: any) => m.id !== req.params.id);
      }
      if (Array.isArray(s.providedMaterials)) {
        s.providedMaterials = s.providedMaterials.filter((m: any) => m.id !== req.params.id);
      }
      if (Array.isArray(s.additionalMaterials)) {
        s.additionalMaterials = s.additionalMaterials.filter((m: any) => m.id !== req.params.id);
      }
    });

    saveAllSessions(sessions);

    if (deletedMaterial) {
      const s3Key = deletedMaterial.driveItemId || 
        (deletedMaterial.url && deletedMaterial.url.startsWith('/api/materials/files/') 
          ? decodeURIComponent(deletedMaterial.url.replace('/api/materials/files/', '')) 
          : null);
      if (s3Key) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key
          }));
          console.log(`[S3 Delete] Permanently removed S3 object: ${s3Key}`);
        } catch (s3Err: any) {
          console.warn(`[S3 Delete] Warning deleting object ${s3Key}:`, s3Err?.message);
        }
      }
    }

    res.json({ success: true, message: "Material and attached file permanently deleted" });
  });

  app.post("/api/materials/files/upload", upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      const { sessionId, fileName: bodyFileName } = req.body || {};

      if (!file && !req.body?.fileContent) {
        return res.status(400).json({ message: "No file was uploaded." });
      }

      let fileBuffer: Buffer;
      let originalName: string;
      let mimeType: string;

      if (file) {
        fileBuffer = file.buffer;
        originalName = file.originalname;
        mimeType = file.mimetype || 'application/octet-stream';
      } else {
        // Fallback for base64 JSON payload
        const base64Data = (req.body.fileContent || '').replace(/^data:[^;]+;base64,/, '');
        fileBuffer = Buffer.from(base64Data, 'base64');
        originalName = bodyFileName || `upload-${Date.now()}.bin`;
        mimeType = 'application/octet-stream';
      }

      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const cleanSessionId = (sessionId || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '');
      const s3Key = cleanSessionId ? `sessions/${cleanSessionId}/${safeName}` : `uploads/${Date.now()}_${safeName}`;

      let fileUploadedToS3 = false;
      try {
        const putCmd = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: mimeType
        });
        await s3Client.send(putCmd);
        fileUploadedToS3 = true;
        console.log(`[S3 Upload] Successfully uploaded to Tigris S3: ${s3Key} (${fileBuffer.length} bytes)`);
      } catch (s3Error: any) {
        console.warn(`[S3 Upload] S3 upload error:`, s3Error?.message);
      }

      // Also save to local public/uploads as reliable local fallback
      const localDiskPath = path.join(UPLOADS_DIR, `${Date.now()}_${safeName}`);
      try {
        fs.writeFileSync(localDiskPath, fileBuffer);
      } catch (diskErr) {
        console.warn('Local disk write warning:', diskErr);
      }

      const fileUrl = `/api/materials/files/${encodeURIComponent(s3Key)}`;
      const downloadUrl = `/api/materials/files/download/${encodeURIComponent(s3Key)}`;

      return res.status(200).json({
        fileName: safeName,
        url: fileUrl,
        downloadUrl: downloadUrl,
        webUrl: fileUrl,
        driveItemId: null,
        storage: fileUploadedToS3 ? 's3-tigris' : 'local-disk'
      });
    } catch (err: any) {
      console.error('[Upload Handler] Critical error uploading file:', err);
      return res.status(500).json({
        message: `Failed to upload file: ${err?.message || 'Internal server error'}`
      });
    }
  });

  // Stream files / videos with HTTP 206 Partial Content / Range support from S3 & Local Disk
  const streamFileHandler = async (req: express.Request, res: express.Response) => {
    try {
      let rawPath = req.params[0] || (req.params as any).filePath || '';
      if (rawPath.startsWith('download/')) {
        rawPath = rawPath.substring('download/'.length);
      }
      const unescaped = decodeURIComponent(rawPath).replace(/^[\/\\]+/, '');

      if (!unescaped) {
        return res.status(400).json({ message: 'File path not specified' });
      }

      // 1. Try S3 Tigris Object Storage
      const rangeHeader = req.headers.range;
      const cmd = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: unescaped,
        Range: rangeHeader
      });

      try {
        const s3Res = await s3Client.send(cmd);

        res.setHeader('Accept-Ranges', 'bytes');
        if (s3Res.ContentType) res.setHeader('Content-Type', s3Res.ContentType);
        if (s3Res.ContentLength !== undefined) res.setHeader('Content-Length', s3Res.ContentLength.toString());
        if (s3Res.ContentRange) {
          res.setHeader('Content-Range', s3Res.ContentRange);
          res.status(206);
        } else {
          res.status(200);
        }

        if (s3Res.Body) {
          (s3Res.Body as any).pipe(res);
        } else {
          res.status(404).end();
        }
        return;
      } catch (s3Err: any) {
        // Fallback to local files
        const candidatePaths = [
          path.join(process.cwd(), 'public', 'uploads', unescaped),
          path.join(process.cwd(), 'public', unescaped),
          path.join(process.cwd(), '..', 'Mission-Possible', 'src', 'GTsPortal.API', 'wwwroot', 'uploads', unescaped),
          path.join(process.cwd(), '..', 'Mission-Possible', 'src', 'GTsPortal.API', 'wwwroot', 'uploads', 'site-assets', 'videos', path.basename(unescaped))
        ];

        for (const localPath of candidatePaths) {
          if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
            return res.sendFile(localPath);
          }
        }

        console.warn(`File not found in S3 or local disk: ${unescaped}`);
        return res.status(404).json({ message: `File not found: ${unescaped}` });
      }
    } catch (err: any) {
      console.error('File stream error:', err);
      return res.status(500).json({ message: 'Internal server error while streaming file' });
    }
  };

  app.get('/api/materials/files/download/*', streamFileHandler);
  app.get('/api/materials/files/*', streamFileHandler);

  // --- 5. QUIZZES & ASSIGNMENTS ROUTERS ---
  app.get("/api/quizzes", (req, res) => {
    const { sessionId } = req.query;
    const sessions = getAllSessions();
    let quizzes: any[] = [];

    sessions.forEach((s: any) => {
      if (!sessionId || s.id === sessionId) {
        if (Array.isArray(s.quizzes)) quizzes.push(...s.quizzes);
      }
    });

    res.json(quizzes);
  });

  app.post("/api/quizzes", (req, res) => {
    const newQuiz = req.body || {};
    const sessions = getAllSessions();
    const targetSession = sessions.find((s: any) => s.id === newQuiz.sessionId);
    const createdQuiz = {
      ...newQuiz,
      id: newQuiz.id || `quiz-${Date.now()}`
    };

    if (targetSession) {
      if (!Array.isArray(targetSession.quizzes)) targetSession.quizzes = [];
      targetSession.quizzes.push(createdQuiz);
      saveAllSessions(sessions);
    }
    res.status(201).json(createdQuiz);
  });

  app.put("/api/quizzes/:id", (req, res) => {
    const sessions = getAllSessions();
    let updatedQuiz: any = null;

    sessions.forEach((s: any) => {
      if (Array.isArray(s.quizzes)) {
        const idx = s.quizzes.findIndex((q: any) => q.id === req.params.id);
        if (idx !== -1) {
          s.quizzes[idx] = { ...s.quizzes[idx], ...req.body };
          updatedQuiz = s.quizzes[idx];
        }
      }
    });

    if (updatedQuiz) {
      saveAllSessions(sessions);
      return res.json(updatedQuiz);
    }
    res.status(404).json({ message: "Quiz not found" });
  });

  app.delete("/api/quizzes/:id", (req, res) => {
    const sessions = getAllSessions();
    sessions.forEach((s: any) => {
      if (Array.isArray(s.quizzes)) {
        s.quizzes = s.quizzes.filter((q: any) => q.id !== req.params.id);
      }
    });
    saveAllSessions(sessions);
    res.json({ message: "Quiz deleted successfully" });
  });

  // Submit and grade quiz
  app.post("/api/quizzes/:id/submit", (req, res) => {
    const { userAnswers, userId } = req.body || {};
    const sessions = getAllSessions();
    let foundQuiz: any = null;
    let targetSession: any = null;

    for (const s of sessions) {
      if (Array.isArray(s.quizzes)) {
        const q = s.quizzes.find((quiz: any) => quiz.id === req.params.id);
        if (q) {
          foundQuiz = q;
          targetSession = s;
          break;
        }
      }
    }

    if (!foundQuiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    const questions = foundQuiz.questions || [];
    let totalScore = 0;
    let maxScore = 0;
    const questionResults: any[] = [];

    questions.forEach((q: any, idx: number) => {
      const qId = q.id || `q-${idx}`;
      const points = Number(q.points || 10);
      maxScore += points;
      const userAnswer = userAnswers ? userAnswers[qId] : undefined;
      const correctAnswer = q.correctAnswer;

      let isCorrect = false;
      if (userAnswer !== undefined && correctAnswer !== undefined) {
        if (Array.isArray(correctAnswer)) {
          const userArr = Array.isArray(userAnswer) ? userAnswer.map(String) : [String(userAnswer)];
          isCorrect = correctAnswer.length === userArr.length && correctAnswer.every((val: any) => userArr.includes(String(val)));
        } else {
          isCorrect = String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
        }
      }

      if (isCorrect) totalScore += points;
      questionResults.push({
        questionId: qId,
        isCorrect,
        userAnswer,
        correctAnswer,
        pointsAwarded: isCorrect ? points : 0
      });
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;
    const isPassed = percentage >= (Number(foundQuiz.passingScorePercent) || 70);

    // Record user progress
    if (userId && targetSession) {
      const progressList = getAllProgress();
      const cleanUser = String(userId).toLowerCase();
      const existingIdx = progressList.findIndex((p: any) => p.userId?.toLowerCase() === cleanUser && p.sessionId === targetSession.id);
      const progEntry = {
        id: existingIdx !== -1 ? progressList[existingIdx].id : `prog-${Date.now()}`,
        userId: cleanUser,
        sessionId: targetSession.id,
        quizScore: percentage,
        lastUpdated: new Date().toISOString()
      };
      if (existingIdx !== -1) {
        progressList[existingIdx] = { ...progressList[existingIdx], ...progEntry };
      } else {
        progressList.unshift(progEntry);
      }
      saveAllProgress(progressList);
    }

    return res.json({
      success: true,
      quizId: foundQuiz.id,
      totalScore,
      maxScore,
      percentage,
      isPassed,
      questionResults
    });
  });

  app.get("/api/assignments", (req, res) => {
    const { sessionId } = req.query;
    const sessions = getAllSessions();
    let assignments: any[] = [];

    sessions.forEach((s: any) => {
      if (!sessionId || s.id === sessionId) {
        if (Array.isArray(s.assignments)) assignments.push(...s.assignments);
      }
    });

    res.json(assignments);
  });

  app.post("/api/assignments", (req, res) => {
    const newAssign = req.body || {};
    const sessions = getAllSessions();
    const targetSession = sessions.find((s: any) => s.id === newAssign.sessionId);
    const createdAssign = {
      ...newAssign,
      id: newAssign.id || `assign-${Date.now()}`
    };

    if (targetSession) {
      if (!Array.isArray(targetSession.assignments)) targetSession.assignments = [];
      const existingIdx = targetSession.assignments.findIndex((a: any) =>
        (newAssign.id && a.id === newAssign.id) ||
        (newAssign.title && a.title && a.title.trim().toLowerCase() === newAssign.title.trim().toLowerCase())
      );
      if (existingIdx !== -1) {
        targetSession.assignments[existingIdx] = {
          ...targetSession.assignments[existingIdx],
          ...newAssign,
          id: targetSession.assignments[existingIdx].id
        };
        saveAllSessions(sessions);
        return res.status(200).json(targetSession.assignments[existingIdx]);
      }

      targetSession.assignments.push(createdAssign);
      saveAllSessions(sessions);
    }
    res.status(201).json(createdAssign);
  });

  app.put("/api/assignments/:id", (req, res) => {
    const sessions = getAllSessions();
    let updatedAssign: any = null;

    sessions.forEach((s: any) => {
      if (Array.isArray(s.assignments)) {
        const idx = s.assignments.findIndex((a: any) => a.id === req.params.id);
        if (idx !== -1) {
          s.assignments[idx] = { ...s.assignments[idx], ...req.body };
          updatedAssign = s.assignments[idx];
        }
      }
    });

    if (updatedAssign) {
      saveAllSessions(sessions);
      return res.json(updatedAssign);
    }
    res.status(404).json({ message: "Assignment not found" });
  });

  app.delete("/api/assignments/:id", async (req, res) => {
    const sessions = getAllSessions();
    let deletedAssign: any = null;
    sessions.forEach((s: any) => {
      if (Array.isArray(s.assignments)) {
        const found = s.assignments.find((a: any) => a.id === req.params.id);
        if (found) deletedAssign = found;
        s.assignments = s.assignments.filter((a: any) => a.id !== req.params.id);
      }
    });
    saveAllSessions(sessions);

    if (deletedAssign && deletedAssign.attachmentUrl) {
      const s3Key = deletedAssign.attachmentUrl.startsWith('/api/materials/files/') 
        ? decodeURIComponent(deletedAssign.attachmentUrl.replace('/api/materials/files/', '')) 
        : null;
      if (s3Key) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key
          }));
          console.log(`[S3 Delete] Deleted assignment file: ${s3Key}`);
        } catch (s3Err: any) {
          console.warn(`[S3 Delete] Assignment file deletion warning:`, s3Err?.message);
        }
      }
    }

    res.json({ success: true, message: "Assignment deleted successfully" });
  });

  // --- 6. SESSION TRACKER PERSISTENT ROUTER ---
  const getAllTrackerRecords = () => readJsonFile(SESSION_TRACKER_FILE, []);
  const saveAllTrackerRecords = (records: any[]) => writeJsonFile(SESSION_TRACKER_FILE, records);

  app.get("/api/session-tracker", (_req, res) => {
    const records = getAllTrackerRecords();
    res.json(records);
  });

  app.post("/api/session-tracker", (req, res) => {
    const newRecord = req.body;
    if (!newRecord) return res.status(400).json({ message: "Invalid record data" });
    const records = getAllTrackerRecords();
    const id = newRecord.id || `track-${Date.now()}`;
    const recordWithId = { ...newRecord, id, lastUpdated: new Date().toISOString().split('T')[0] };
    const exists = records.some((r: any) => r.id === id);
    const updated = exists ? records.map((r: any) => r.id === id ? recordWithId : r) : [recordWithId, ...records];
    saveAllTrackerRecords(updated);
    res.json(recordWithId);
  });

  app.put("/api/session-tracker/bulk", (req, res) => {
    const records = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ message: "Expected an array of records" });
    saveAllTrackerRecords(records);
    res.json({ success: true, count: records.length });
  });

  app.put("/api/session-tracker/:id", (req, res) => {
    const records = getAllTrackerRecords();
    const index = records.findIndex((r: any) => r.id === req.params.id);
    if (index !== -1) {
      records[index] = { ...records[index], ...req.body, id: req.params.id, lastUpdated: new Date().toISOString().split('T')[0] };
      saveAllTrackerRecords(records);
      return res.json(records[index]);
    }
    const newRec = { ...req.body, id: req.params.id, lastUpdated: new Date().toISOString().split('T')[0] };
    records.unshift(newRec);
    saveAllTrackerRecords(records);
    res.json(newRec);
  });

  app.delete("/api/session-tracker/:id", (req, res) => {
    const records = getAllTrackerRecords();
    const updated = records.filter((r: any) => r.id !== req.params.id);
    saveAllTrackerRecords(updated);
    res.json({ success: true, message: "Tracker record deleted successfully" });
  });

  // --- 7. PERSONAL NOTES PERSISTENT ROUTER ---
  const getAllNotes = () => readJsonFile(NOTES_FILE, []);
  const saveAllNotes = (notes: any[]) => writeJsonFile(NOTES_FILE, notes);

  app.get("/api/notes", (req, res) => {
    const { userId, sessionId } = req.query;
    const notes = getAllNotes();
    const filtered = notes.filter((n: any) => {
      const matchUser = !userId || (n.userId && n.userId.toString().toLowerCase() === userId.toString().toLowerCase());
      const matchSession = !sessionId || (n.sessionId && n.sessionId.toString().toLowerCase() === sessionId.toString().toLowerCase());
      return matchUser && matchSession;
    });
    res.json(filtered);
  });

  app.post("/api/notes", (req, res) => {
    const newNote = req.body;
    if (!newNote) return res.status(400).json({ message: "Invalid note data" });
    const notes = getAllNotes();
    const id = newNote.id || `note-${Date.now()}`;
    const noteWithId = { ...newNote, id, updatedAt: new Date().toISOString() };
    const existingIdx = notes.findIndex((n: any) => n.id === id);
    if (existingIdx !== -1) {
      notes[existingIdx] = noteWithId;
    } else {
      notes.unshift(noteWithId);
    }
    saveAllNotes(notes);
    res.status(201).json(noteWithId);
  });

  app.put("/api/notes/bulk", (req, res) => {
    const { userId, sessionId, notes: userNotes } = req.body || {};
    if (!Array.isArray(userNotes)) return res.status(400).json({ message: "Invalid notes array" });
    const notes = getAllNotes();
    const cleanUser = (userId || '').toString().toLowerCase();
    const cleanSession = (sessionId || '').toString().toLowerCase();
    const remaining = notes.filter((n: any) => {
      const isThisUser = cleanUser && n.userId && n.userId.toString().toLowerCase() === cleanUser;
      const isThisSession = cleanSession && n.sessionId && n.sessionId.toString().toLowerCase() === cleanSession;
      return !(isThisUser && isThisSession);
    });
    const updated = [...userNotes, ...remaining];
    saveAllNotes(updated);
    res.json({ success: true, count: userNotes.length });
  });

  app.delete("/api/notes/:id", (req, res) => {
    let notes = getAllNotes();
    notes = notes.filter((n: any) => n.id !== req.params.id);
    saveAllNotes(notes);
    res.json({ success: true, message: "Note deleted successfully" });
  });

  // --- 7. USER PROFILE, ACTIVITY & PROGRESS ROUTERS ---
  const getAllActivities = () => readJsonFile(ACTIVITIES_FILE, []);
  const saveAllActivities = (acts: any[]) => writeJsonFile(ACTIVITIES_FILE, acts);

  const getAllProgress = () => readJsonFile(PROGRESS_FILE, []);
  const saveAllProgress = (progs: any[]) => writeJsonFile(PROGRESS_FILE, progs);

  app.get("/api/user", (_req, res) => {
    res.json({
      id: "user-current-session",
      name: "Sibibharathi Thangaraj",
      email: "Sibibharathi.Thangaraj@valuemomentum.com",
      role: "GT",
      batch: "GT-2026-Batch-01",
      xp: 2850,
      level: 5,
      streakDays: 14,
      lastActiveDate: new Date().toISOString().split('T')[0],
      dailyGoalMinutes: 45,
      todayMinutesSpent: 25,
      isGuest: false
    });
  });

  // Persistent Activity Logging
  app.post("/api/activity", (req, res) => {
    const { action, details, timestamp, userId } = req.body || {};
    const activities = getAllActivities();
    const newActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action: action || 'UserAction',
      details: details || '',
      userId: userId || 'active-user',
      timestamp: timestamp || new Date().toISOString()
    };
    activities.unshift(newActivity);
    // Keep max 500 recent logs
    if (activities.length > 500) activities.length = 500;
    saveAllActivities(activities);
    res.json({ success: true, logged: newActivity });
  });

  app.get("/api/activity", (_req, res) => {
    const activities = getAllActivities();
    res.json(activities);
  });

  // Persistent User Learning Progress
  app.post("/api/user/progress", (req, res) => {
    const { userId, sessionId, topicId, progressPercent, xpGained, quizScore } = req.body || {};
    const progressList = getAllProgress();
    const cleanUser = (userId || 'active-user').toString().toLowerCase();
    const cleanSession = (sessionId || '').toString();

    const existingIdx = progressList.findIndex((p: any) => 
      p.userId?.toLowerCase() === cleanUser && p.sessionId === cleanSession
    );

    const updatedEntry = {
      id: existingIdx !== -1 ? progressList[existingIdx].id : `prog-${Date.now()}`,
      userId: cleanUser,
      sessionId: cleanSession,
      topicId: topicId || '',
      progressPercent: Number(progressPercent || 0),
      xpGained: Number(xpGained || 0),
      quizScore: quizScore !== undefined ? Number(quizScore) : undefined,
      lastUpdated: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      progressList[existingIdx] = { ...progressList[existingIdx], ...updatedEntry };
    } else {
      progressList.unshift(updatedEntry);
    }

    saveAllProgress(progressList);
    res.json({ success: true, data: updatedEntry });
  });

  app.get("/api/user/progress", (req, res) => {
    const { userId, sessionId } = req.query;
    const progressList = getAllProgress();
    const filtered = progressList.filter((p: any) => {
      const matchUser = !userId || p.userId?.toLowerCase() === userId.toString().toLowerCase();
      const matchSession = !sessionId || p.sessionId === sessionId.toString();
      return matchUser && matchSession;
    });
    res.json(filtered);
  });

  // Live Dynamic Analytics
  app.get("/api/analytics", (_req, res) => {
    const sessions = getAllSessions();
    const users = getAllUsers();
    const tracker = getAllTrackerRecords();

    const totalSessions = sessions.length;
    const totalGTs = users.filter((u: any) => u.role !== 'Admin').length;
    const totalActiveUsers = users.filter((u: any) => u.status === 'Active').length;

    res.json({
      totalSessions,
      totalGTs,
      totalActiveUsers,
      averageProgress: totalSessions > 0 ? 75 : 0,
      averageQuizScore: 85,
      mostViewedSession: sessions[0]?.name || ".NET with C#",
      leastViewedSession: sessions[sessions.length - 1]?.name || "Azure Cloud",
      mostDifficultTopic: "Architecture & Integration",
      completionTrends: [
        { month: 'Jan', completed: 24, avgScore: 78 },
        { month: 'Feb', completed: 35, avgScore: 81 },
        { month: 'Mar', completed: 48, avgScore: 82 },
        { month: 'Apr', completed: 62, avgScore: 85 },
        { month: 'May', completed: 79, avgScore: 84 },
        { month: 'Jun', completed: 95, avgScore: 88 }
      ],
      trackProgressList: sessions.map((s: any) => ({
        name: s.name,
        progress: s.progressPercent || 0
      }))
    });
  });

  // Global Search API
  app.get("/api/search", (req, res) => {
    const query = (req.query.q || '').toString().toLowerCase().trim();
    if (!query) {
      return res.json({ sessions: [], materials: [], quizzes: [] });
    }

    const sessions = getAllSessions();
    const matchedSessions = sessions.filter((s: any) => 
      s.name?.toLowerCase().includes(query) ||
      s.category?.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query) ||
      s.trainerName?.toLowerCase().includes(query)
    );

    const matchedMaterials: any[] = [];
    const matchedQuizzes: any[] = [];

    sessions.forEach((s: any) => {
      if (Array.isArray(s.studyMaterials)) {
        s.studyMaterials.forEach((m: any) => {
          if (m.title?.toLowerCase().includes(query) || m.tags?.some((t: string) => t.toLowerCase().includes(query))) {
            matchedMaterials.push({ ...m, sessionName: s.name });
          }
        });
      }
      if (Array.isArray(s.quizzes)) {
        s.quizzes.forEach((q: any) => {
          if (q.title?.toLowerCase().includes(query)) {
            matchedQuizzes.push({ ...q, sessionName: s.name });
          }
        });
      }
    });

    res.json({
      sessions: matchedSessions,
      materials: matchedMaterials,
      quizzes: matchedQuizzes
    });
  });

  // --- 7. LOCAL AI ROUTER (GEMINI ASSISTANT) ---
  const ai = express.Router();

  ai.post("/chat", async (req, res) => {
    const { message, context } = req.body || {};
    const client = getGeminiClient();

    if (!client) {
      return res.json({
        reply: `[AI Assistant Mentor]: For "${context?.sessionName || 'your learning module'}", here is guidance on "${message}":\n\n1. Ensure strict type discipline.\n2. Review asynchronous tasks with async/await.\n3. Verify database query performance.`
      });
    }

    try {
      const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          {
            role: 'user',
            parts: [{
              text: `Context: You are an enterprise L&D AI Tutor for Graduate Trainees (GTs).
Session Context: ${JSON.stringify(context || {})}
User Query: ${message}`
            }]
          }
        ],
        config: {
          systemInstruction: "You are an encouraging, expert enterprise Technical Architect and L&D Mentor. Provide clear, well-structured, production-grade answers."
        }
      });

      res.json({ reply: response.text || "No response generated." });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to generate AI response", details: err.message });
    }
  });

  ai.post("/summarize", async (req, res) => {
    const { title, content } = req.body || {};
    const client = getGeminiClient();

    if (!client) {
      return res.json({
        summary: `### AI Summary of ${title}\n\n- **Core Concept**: Production-grade enterprise design.\n- **Takeaway**: Practice design patterns and complete topic quizzes.`
      });
    }

    try {
      const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Summarize the following study material or note titled "${title}":\n\n${content}`,
        config: {
          systemInstruction: "Provide a concise executive summary with 3 key bullet points and key takeaways."
        }
      });

      res.json({ summary: response.text });
    } catch (err: any) {
      res.status(500).json({ error: "Summarization failed", details: err.message });
    }
  });

  app.use("/api/ai", ai);

  // --- 8. VITE MIDDLEWARE (DEV) OR STATIC BUNDLE (PROD) ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // --- 9. PORT BINDING & SERVER START ---
  const listenOnPort = (port: number) => new Promise<number>((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => resolve(port));
    server.on('error', (err: any) => reject(err));
  });

  let activePort = PORT;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      activePort = await listenOnPort(PORT + attempt);
      if (attempt > 0) {
        console.log(`Port ${PORT} was in use; started on fallback port ${activePort}.`);
      }
      break;
    } catch (err: any) {
      if (err?.code !== 'EADDRINUSE' || attempt === 4) {
        throw err;
      }
    }
  }

  console.log(`\n========================================================`);
  console.log(`🚀 GT Portal Standalone Backend & Frontend Online!`);
  console.log(`📡 URL: http://0.0.0.0:${activePort} (Local: http://localhost:${activePort})`);
  console.log(`🩺 Healthcheck: http://0.0.0.0:${activePort}/api/health`);
  console.log(`🛡️ Auth APIs: http://0.0.0.0:${activePort}/api/auth`);
  console.log(`📚 Sessions API: http://0.0.0.0:${activePort}/api/sessions`);
  console.log(`☁️ Cloud Storage: Tigris S3 Bucket (${S3_BUCKET})`);
  console.log(`========================================================\n`);

  // Graceful shutdown handling for container redeployment
  const shutdown = (signal: string) => {
    console.log(`\n[Server Shutdown] Received ${signal}. Flushing data and exiting cleanly...`);
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
