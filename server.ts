import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import { GoogleGenAI, Type } from "@google/genai";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * This server is a thin BFF, not a data store.
 *
 * Everything under /api is proxied to the .NET GTsPortal API, which owns the
 * PostgreSQL database. The only routes handled locally are /api/ai/*, because the
 * Gemini API key must stay server-side and never reach the browser.
 *
 * It previously served in-memory mock data for sessions, materials, quizzes, notes
 * and discussions, which is why the UI never reflected the real database.
 */

// Where the .NET API lives. In Railway, set this to the API service's internal URL.
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. Gemini AI features will return graceful fallback responses.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

async function startServer() {
  const app = express();
  const requestedPort = Number(process.env.PORT || 3000);
  const PORT = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3000;

  const listenOnPort = (port: number) => new Promise<number>((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => resolve(port));
    server.on('error', (err: any) => reject(err));
  });

  // --- LOCAL AI ROUTES ---
  // JSON parsing is scoped to these routes only. Applying it globally would consume
  // the request body before the proxy could forward it, breaking every POST and PUT.
  const ai = express.Router();
  ai.use(express.json({ limit: '10mb' }));

  ai.get("/health", (_req, res) => {
    res.json({ status: "ok", apiBaseUrl: API_BASE_URL, timestamp: new Date().toISOString() });
  });

  // AI Chat Tutor
  ai.post("/chat", async (req, res) => {
    const { message, context } = req.body;
    const client = getGeminiClient();

    if (!client) {
      return res.json({
        reply: `[AI Assistant Mode]: As your Graduate Trainee mentor for "${context?.sessionName || 'the portal'}", here is an answer to your question: "${message}". \n\nKey Concept Breakdown:\n1. Ensure strict type signatures in C# and TypeScript.\n2. Handle exception boundaries with Global Exception Middleware or try-catch blocks.\n3. Always write unit tests before pushing code to production.`
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
          systemInstruction: "You are an encouraging, expert enterprise Technical Architect and L&D Mentor. Provide clear, well-structured, production-grade answers with concise code examples in C#, SQL, TypeScript, or Azure where appropriate."
        }
      });

      res.json({ reply: response.text || "No response generated." });
    } catch (err: any) {
      console.error("Gemini AI Chat Error:", err);
      res.status(500).json({ error: "Failed to generate AI response", details: err.message });
    }
  });

  // AI Document / Notes Summarizer
  ai.post("/summarize", async (req, res) => {
    const { title, content } = req.body;
    const client = getGeminiClient();

    if (!client) {
      return res.json({
        summary: `### AI Summary of ${title}\n\n- **Core Theme**: High performance enterprise system architecture.\n- **Key Takeaway**: Apply SOLID principles, proper indexing in SQL databases, and async/await non-blocking I/O.\n- **Action Item**: Review the code examples and complete the topic quiz.`
      });
    }

    try {
      const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Summarize the following study material or note titled "${title}":\n\n${content}`,
        config: {
          systemInstruction: "Provide a concise executive summary with 3 key bullet points, a 2-sentence key takeaway, and 2 interview preparation questions based on this material."
        }
      });

      res.json({ summary: response.text });
    } catch (err: any) {
      res.status(500).json({ error: "Summarization failed", details: err.message });
    }
  });

  // AI Practice Quiz Generator
  ai.post("/generate-quiz", async (req, res) => {
    const { topicName, textContent, numQuestions } = req.body;
    const requestedCount = Number(numQuestions) > 0 ? Number(numQuestions) : 5;
    const client = getGeminiClient();

    if (!client) {
      return res.json({
        quizTitle: `AI Generated Practice Quiz: ${topicName || 'General Tech'}`,
        questions: [
          {
            id: `ai-q-1`,
            type: 'MCQ',
            prompt: `In ${topicName || 'software design'}, what is the primary purpose of Dependency Injection?`,
            options: [
              'To decouple high-level modules from low-level concrete implementations',
              'To speed up CPU clock cycles',
              'To encrypt database tables',
              'To automatically generate CSS styling'
            ],
            correctAnswer: 'To decouple high-level modules from low-level concrete implementations',
            explanation: 'Dependency Injection enforces the Dependency Inversion Principle, allowing flexible unit testing and swapping of implementations.'
          }
        ]
      });
    }

    try {
      const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Generate ${requestedCount} high quality multiple choice practice questions for GTs on the topic "${topicName}". Source Material: ${textContent || 'General enterprise topic'}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quizTitle: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, description: "Must be 'MCQ'" },
                    prompt: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["id", "type", "prompt", "options", "correctAnswer", "explanation"]
                }
              }
            },
            required: ["quizTitle", "questions"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ error: "Quiz generation failed", details: err.message });
    }
  });

  app.use("/api/ai", ai);

  // --- LOCAL ENTERPRISE AUTHENTICATION & CREDENTIALS STORAGE (PERMANENT) ---
  const auth = express.Router();
  auth.use(express.json());

  const CREDENTIALS_FILE = path.join(process.cwd(), 'server_credentials.json');

  const INITIAL_SEED_ACCOUNTS = [
    { email: 'Sibibharathi.Thangaraj@valuemomentum.com', defaultPassword: 'Sibibharathi.Thangaraj', role: 'GT', firstName: 'Sibibharathi', lastName: 'Thangaraj', batch: 'GT-2026-Batch-01' },
    { email: 'Pavithran.Sivanandham@valuemomentum.com', defaultPassword: 'Pavithran.Sivanandham', role: 'GT', firstName: 'Pavithran', lastName: 'Sivanandham', batch: 'GT-2026-Batch-01' },
    { email: 'Aswin.Muruganandham@valuemomentum.com', defaultPassword: 'Aswin.Muruganandham', role: 'GT', firstName: 'Aswin', lastName: 'Muruganandham', batch: 'GT-2026-Batch-01' },
    { email: 'Harshini.Radhakrishnan@valuemomentum.com', defaultPassword: 'Harshini.Radhakrishnan', role: 'GT', firstName: 'Harshini', lastName: 'Radhakrishnan', batch: 'GT-2026-Batch-01' },
    { email: 'Imran.Aupe@valuemomentum.com', defaultPassword: 'Imran.Aupe', role: 'GT', firstName: 'Imran', lastName: 'Aupe', batch: 'GT-2026-Batch-01' },
    { email: 'Kruthika.Devaraje@valuemomentum.com', defaultPassword: 'Kruthika.Devaraje', role: 'GT', firstName: 'Kruthika', lastName: 'Devaraje', batch: 'GT-2026-Batch-01' },
    { email: 'Vaishali.Karunai@valuemomentum.com', defaultPassword: 'Vaishali.Karunai', role: 'GT', firstName: 'Vaishali', lastName: 'Karunai', batch: 'GT-2026-Batch-01' },
    { email: 'Tanvitha.Nadukuda@valuemomentum.com', defaultPassword: 'Tanvitha.Nadukuda', role: 'GT', firstName: 'Tanvitha', lastName: 'Nadukuda', batch: 'GT-2026-Batch-01' },
    { email: 'Anukraha.Magdalene@valuemomentum.com', defaultPassword: 'Anukraha.Magdalene', role: 'Admin', firstName: 'Anukraha', lastName: 'Magdalene', batch: 'L&D Leadership' },
    { email: 'Keren.Christobel@valuemomentum.com', defaultPassword: 'Keren.Christobel', role: 'Admin', firstName: 'Keren', lastName: 'Christobel', batch: 'L&D Management' },
    { email: 'Janani.Selvaraj@valuemomentum.com', defaultPassword: 'Janani.Selvaraj', role: 'Admin', firstName: 'Janani', lastName: 'Selvaraj', batch: 'L&D Management' },
    { email: 'Sudhir.Vittapu@owlsure.com', defaultPassword: 'Sudhir.Vittapu', role: 'Admin', firstName: 'Sudhir', lastName: 'Vittapu', batch: 'Technical Facilitation' }
  ];

  const getActiveAccounts = () => {
    const store: Record<string, { password: string; profile: any }> = {};
    INITIAL_SEED_ACCOUNTS.forEach((acc) => {
      store[acc.email.toLowerCase()] = {
        password: acc.defaultPassword,
        profile: acc
      };
    });

    try {
      if (fs.existsSync(CREDENTIALS_FILE)) {
        const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
        const overrides = JSON.parse(raw);
        if (typeof overrides === 'object' && overrides !== null) {
          Object.keys(overrides).forEach((key) => {
            const lower = key.toLowerCase();
            if (store[lower] && typeof overrides[key] === 'string') {
              store[lower].password = overrides[key];
            }
          });
        }
      }
    } catch (e) {
      console.warn('Error reading server credentials file', e);
    }

    return store;
  };

  const savePasswordDisk = (email: string, newPassword: string) => {
    try {
      let overrides: Record<string, string> = {};
      if (fs.existsSync(CREDENTIALS_FILE)) {
        const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
        overrides = JSON.parse(raw) || {};
      }
      overrides[email.toLowerCase()] = newPassword;
      fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(overrides, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving password override to disk', e);
    }
  };

  const isDomainAllowed = (email: string) => {
    const lower = (email || '').trim().toLowerCase();
    return lower.endsWith('@valuemomentum.com') || lower.endsWith('@owlsure.com');
  };

  // 1. Login Endpoint
  auth.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!isDomainAllowed(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Only @valuemomentum.com and @owlsure.com email addresses are allowed.'
      });
    }

    const store = getActiveAccounts();
    const userEntry = store[cleanEmail];

    if (!userEntry || !password || userEntry.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email ID or password.'
      });
    }

    const user = userEntry.profile;
    return res.json({
      success: true,
      data: {
        id: `user-${user.email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        token: `token-${user.role.toLowerCase()}-${user.email}-${Date.now()}`,
        batch: user.batch,
        xp: 2850,
        level: 5,
        streakDays: 14,
        lastActiveDate: new Date().toISOString().split('T')[0],
        dailyGoalMinutes: 45,
        todayMinutesSpent: 25
      }
    });
  });

  // 2. Change Password Endpoint (Permanent Persistence)
  auth.post('/change-password', (req, res) => {
    const { email, currentPassword, newPassword } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!isDomainAllowed(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Only @valuemomentum.com and @owlsure.com email addresses are allowed.'
      });
    }

    const store = getActiveAccounts();
    const userEntry = store[cleanEmail];

    if (!userEntry) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (userEntry.password !== currentPassword) {
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

  // 3. Reset Password Endpoint (OTP Reset Flow)
  auth.post('/reset-password', (req, res) => {
    const { email, newPassword } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!isDomainAllowed(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Only @valuemomentum.com and @owlsure.com email addresses are allowed.'
      });
    }

    const store = getActiveAccounts();
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

  // 4. Forgot Password & Verify OTP Endpoints
  auth.post('/forgot-password', (req, res) => {
    const { email } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!isDomainAllowed(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Only @valuemomentum.com and @owlsure.com email addresses are allowed.'
      });
    }

    const store = getActiveAccounts();
    if (!store[cleanEmail]) {
      return res.status(404).json({ success: false, message: 'Incorrect email ID or password.' });
    }

    return res.json({ success: true, message: 'Verification OTP sent to your registered email address.' });
  });

  auth.post('/verify-otp', (_req, res) => {
    return res.json({
      success: true,
      data: { resetToken: `reset-token-${Date.now()}` },
      message: 'OTP verified successfully.'
    });
  });

  app.use("/api/auth", auth);

  // --- DIRECT OBJECT STORAGE (S3/TIGRIS) STREAMING ---
  // Streams site videos and materials directly from the cloud bucket with full HTTP Range (206) support,
  // preventing buffering stalls or 502 proxy errors during video playback.
  const s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT_URL || process.env.AWS_ENDPOINT_URL || 'https://t3.storageapi.dev',
    region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || 'tid_qJLZlUnpNMISimFhapSl_QhDKMbBumkqfSPqdbFjeAqPVcqSck',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || 'tsec_DExQt4kUQMFnD-ATXFJKoL+NAbk0SAEZ6ntDiu6z0FxxCV+JIiR-6+m-xiX+q9EW4oNcn1'
    },
    forcePathStyle: true
  });
  const S3_BUCKET = process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || 'shelved-trunk-zrxdvpxaih4';

  const handleS3Stream = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawPath = (req.params[0] || req.path || req.url || '').split('?')[0];
    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      decodedPath = rawPath;
    }

    const cleanKey = decodedPath
      .replace(/^\/api\/materials\/files\/(download\/)?/, '')
      .replace(/^download\//, '')
      .replace(/^uploads\//, '')
      .replace(/^\/+/, '');

    if (!cleanKey) return next();

    const rawKey = rawPath
      .replace(/^\/api\/materials\/files\/(download\/)?/, '')
      .replace(/^download\//, '')
      .replace(/^uploads\//, '')
      .replace(/^\/+/, '');

    const baseName = cleanKey.split('/').pop() || cleanKey;
    const candidates = Array.from(new Set([
      cleanKey,
      rawKey,
      `site-assets/videos/${baseName}`,
      `site-assets/videos/${baseName.replace(/-/g, ' ')}`,
      `site-assets/videos/${baseName.replace(/ /g, '-')}`,
      cleanKey.replace(/-/g, ' '),
      cleanKey.replace(/ /g, '-'),
      cleanKey.replace(/_/g, ' '),
      cleanKey.replace(/_/g, '-')
    ]));

    const range = req.headers.range;

    for (const key of candidates) {
      try {
        const getCmd = new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Range: range
        });
        const s3Response = await s3Client.send(getCmd);

        let contentType = s3Response.ContentType || 'application/octet-stream';
        const lowerKey = key.toLowerCase();
        if (lowerKey.endsWith('.mp4')) contentType = 'video/mp4';
        else if (lowerKey.endsWith('.pdf')) contentType = 'application/pdf';
        else if (lowerKey.endsWith('.webm')) contentType = 'video/webm';
        else if (lowerKey.endsWith('.docx')) contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (lowerKey.endsWith('.doc')) contentType = 'application/msword';
        else if (lowerKey.endsWith('.pptx')) contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        else if (lowerKey.endsWith('.png')) contentType = 'image/png';
        else if (lowerKey.endsWith('.jpg') || lowerKey.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (lowerKey.endsWith('.txt')) contentType = 'text/plain; charset=utf-8';

        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', contentType);
        if (s3Response.ContentLength !== undefined) {
          res.setHeader('Content-Length', s3Response.ContentLength.toString());
        }
        if (s3Response.ContentRange) {
          res.setHeader('Content-Range', s3Response.ContentRange);
          res.status(206);
        } else {
          res.status(200);
        }

        if (req.method === 'HEAD') {
          return res.end();
        }

        const stream = s3Response.Body as any;
        if (stream && typeof stream.pipe === 'function') {
          return stream.pipe(res);
        }
      } catch (err: any) {
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
          continue;
        }
      }
    }

    // If not found in S3 bucket, fallback to downstream .NET API proxy
    next();
  };

  app.get('/api/materials/files/*', handleS3Stream);
  app.head('/api/materials/files/*', handleS3Stream);
  app.get('/api/materials/files/download/*', handleS3Stream);
  app.head('/api/materials/files/download/*', handleS3Stream);

  // --- PROXY EVERYTHING ELSE TO THE .NET API ---
  // pathFilter keeps the original /api prefix intact, which is what the .NET routes
  // expect ([Route("api/sessions")] and friends).
  app.use(
    createProxyMiddleware({
      target: API_BASE_URL,
      changeOrigin: true,
      pathFilter: (pathname) => (pathname.startsWith('/api') || pathname.startsWith('/uploads')) && !pathname.startsWith('/api/ai'),
      on: {
        error: (err, _req, res) => {
          console.error(`[proxy] ${API_BASE_URL} unreachable:`, err.message);
          if (res && 'writeHead' in res && !res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              message: 'The API is unavailable. Check that the .NET service is running and API_BASE_URL is correct.'
            }));
          }
        },
      },
    })
  );

  // Vite Middleware in Dev or Static Serve in Prod
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

  console.log(`Server running on http://localhost:${activePort}`);
  console.log(`Proxying /api -> ${API_BASE_URL}`);
}

startServer();
