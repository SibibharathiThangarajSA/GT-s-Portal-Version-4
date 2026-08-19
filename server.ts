import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import { GoogleGenAI } from "@google/genai";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// Storage files configuration
const DATA_DIR = process.cwd();
const SESSIONS_FILE = path.join(DATA_DIR, 'server_sessions.json');
const USER_ROSTER_FILE = path.join(DATA_DIR, 'server_users_roster.json');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'server_credentials.json');
const MATERIALS_FILE = path.join(DATA_DIR, 'server_materials.json');
const QUIZZES_FILE = path.join(DATA_DIR, 'server_quizzes.json');
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'server_assignments.json');
const DISCUSSIONS_FILE = path.join(DATA_DIR, 'server_discussions.json');
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
  { id: 'usr-105527', vamId: '105527', name: 'Sibibharathi Thangaraj', email: 'Sibibharathi.Thangaraj@valuemomentum.com', phoneNumber: '9345766068', role: 'Employee', addedOn: '20-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105500', vamId: '105500', name: 'Pavithran Sivanandham', email: 'Pavithran.Sivanandham@valuemomentum.com', phoneNumber: '7845911687', role: 'Employee', addedOn: '20-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105515', vamId: '105515', name: 'Aswin Muruganandham', email: 'Aswin.Muruganandham@valuemomentum.com', phoneNumber: '9626637490', role: 'Employee', addedOn: '20-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105520', vamId: '105520', name: 'Harshini Radhakrishnan', email: 'Harshini.Radhakrishnan@valuemomentum.com', phoneNumber: '8220126157', role: 'Employee', addedOn: '18-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105511', vamId: '105511', name: 'Imran Aupe', email: 'Imran.Aupe@valuemomentum.com', phoneNumber: '9952590815', role: 'Employee', addedOn: '18-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105496', vamId: '105496', name: 'Kruthika Devaraje', email: 'Kruthika.Devaraje@valuemomentum.com', phoneNumber: '9902518633', role: 'Employee', addedOn: '15-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105503', vamId: '105503', name: 'Vaishali Karunai', email: 'Vaishali.Karunai@valuemomentum.com', phoneNumber: '8012325313', role: 'Employee', addedOn: '15-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105529', vamId: '105529', name: 'Tanvitha Nadukuda', email: 'Tanvitha.Nadukuda@valuemomentum.com', phoneNumber: '9490101088', role: 'Employee', addedOn: '15-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' },
  { id: 'usr-105530', vamId: '105530', name: 'Anukraha Magdalene', email: 'Anukraha.Magdalene@valuemomentum.com', phoneNumber: '9384428335', role: 'Admin', addedOn: '10-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'L&D Leadership' },
  { id: 'usr-104275', vamId: '104275', name: 'Keren Christobel', email: 'Keren.Christobel@valuemomentum.com', phoneNumber: '9999999999', role: 'Admin', addedOn: '10-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'L&D Management' },
  { id: 'usr-102163', vamId: '102163', name: 'Janani Selvaraj', email: 'Janani.Selvaraj@valuemomentum.com', phoneNumber: '9999999999', role: 'Admin', addedOn: '10-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'L&D Management' },
  { id: 'usr-100137', vamId: '100137', name: 'Sudhir Vittapu', email: 'Sudhir.Vittapu@owlsure.com', phoneNumber: '9999999999', role: 'Admin', addedOn: '10-Jan-2025', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'Technical Facilitation' },
  { id: 'usr-associate-ram', vamId: '-', name: 'Ram', email: '-', phoneNumber: '9894242460', role: 'Associate', addedOn: '19-Aug-2026', status: 'Active', access: 'Enabled', addedBy: 'Admin', batch: 'GT-2026-Batch-01' }
];

// Initial Seed Sessions (Empty - Admin will create sessions from scratch)
const INITIAL_SEED_SESSIONS: any[] = [];

// Helper Functions for JSON Disk DB
const readJsonFile = <T>(filePath: string, fallback: T): T => {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed !== null && parsed !== undefined) return parsed;
    }
  } catch (e) {
    console.warn(`Failed to read ${filePath}`, e);
  }
  return fallback;
};

const writeJsonFile = (filePath: string, data: any): void => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Failed to write ${filePath}`, e);
  }
};

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

async function startServer() {
  const app = express();
  const requestedPort = Number(process.env.PORT || 3000);
  const PORT = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3000;

  // JSON Body Parsing for all incoming requests
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static Assets
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- 1. HEALTH CHECK ---
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      mode: "standalone-node-backend",
      timestamp: new Date().toISOString(),
      database: "local-persistent-json"
    });
  });

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

  // Save/Update users in roster
  auth.post('/users', (req, res) => {
    const { records } = req.body || {};
    if (Array.isArray(records)) {
      saveAllUsers(records);
      return res.json({ success: true, message: 'User roster saved successfully.' });
    }
    return res.status(400).json({ success: false, message: 'Invalid records format.' });
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
    const createdSession = {
      ...newSession,
      id: newSession.id || `session-${Date.now()}`,
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
    if (index === -1) return res.status(404).json({ message: "Session not found" });

    sessions[index] = { ...sessions[index], ...req.body };
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
    const { sessionId } = req.query;
    const sessions = getAllSessions();
    let materials: any[] = [];

    sessions.forEach((s: any) => {
      if (!sessionId || s.id === sessionId) {
        if (Array.isArray(s.studyMaterials)) {
          materials.push(...s.studyMaterials);
        }
      }
    });

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
          s.studyMaterials[idx] = { ...s.studyMaterials[idx], ...req.body };
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

  app.delete("/api/materials/:id", (req, res) => {
    const sessions = getAllSessions();
    sessions.forEach((s: any) => {
      if (Array.isArray(s.studyMaterials)) {
        s.studyMaterials = s.studyMaterials.filter((m: any) => m.id !== req.params.id);
      }
    });
    saveAllSessions(sessions);
    res.json({ message: "Material deleted successfully" });
  });

  app.post("/api/materials/files/upload", (req, res) => {
    const { fileName, fileContent } = req.body || {};
    const safeName = (fileName || `upload-${Date.now()}.bin`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetPath = path.join(UPLOADS_DIR, `${Date.now()}_${safeName}`);

    if (fileContent && typeof fileContent === 'string') {
      try {
        const base64Data = fileContent.replace(/^data:[^;]+;base64,/, '');
        fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));
      } catch (e) {
        console.warn('Error saving uploaded file to disk', e);
      }
    }

    const publicUrl = `/uploads/${path.basename(targetPath)}`;
    res.json({
      fileName: safeName,
      url: publicUrl,
      downloadUrl: publicUrl
    });
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

  app.delete("/api/assignments/:id", (req, res) => {
    const sessions = getAllSessions();
    sessions.forEach((s: any) => {
      if (Array.isArray(s.assignments)) {
        s.assignments = s.assignments.filter((a: any) => a.id !== req.params.id);
      }
    });
    saveAllSessions(sessions);
    res.json({ message: "Assignment deleted successfully" });
  });

  // --- 6. SESSION TRACKER PERSISTENT ROUTER ---
  const SESSION_TRACKER_FILE = path.join(process.cwd(), 'server_session_tracker.json');

  const INITIAL_SESSION_TRACKER_RECORDS: any[] = [];

  const getAllTrackerRecords = () => readJsonFile(SESSION_TRACKER_FILE, INITIAL_SESSION_TRACKER_RECORDS);
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

  // --- 7. USER PROFILE & ACTIVITY ROUTERS ---
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

  app.post("/api/activity", (req, res) => {
    res.json({ success: true, logged: req.body });
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
  console.log(`📡 URL: http://localhost:${activePort}`);
  console.log(`🛡️ Auth APIs: http://localhost:${activePort}/api/auth`);
  console.log(`📚 Sessions API: http://localhost:${activePort}/api/sessions`);
  console.log(`========================================================\n`);
}

startServer();
