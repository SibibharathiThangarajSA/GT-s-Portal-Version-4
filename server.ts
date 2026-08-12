import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

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

  app.use(['/api/materials', '/uploads', '/api/sessions', '/api/quizzes', '/api/analytics'], express.raw({ type: '*/*', limit: '50mb' }));
  app.use(express.json({ limit: '10mb' }));

  const BACKEND_API_BASE = process.env.API_BACKEND_URL || 'http://localhost:5000';

  const proxyToBackend = async (req: express.Request, res: express.Response) => {
    const targetUrl = `${BACKEND_API_BASE}${req.originalUrl}`;
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (!value || key.toLowerCase() === 'host' || key.toLowerCase() === 'content-length') {
        return;
      }

      if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      } else {
        headers.set(key, value.toString());
      }
    });

    const body = req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : req.body && Buffer.isBuffer(req.body)
        ? req.body
        : req.body && typeof req.body === 'string'
          ? req.body
          : req.body
            ? JSON.stringify(req.body)
            : undefined;

    try {
      const upstreamResponse = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
        redirect: 'manual'
      });

      res.status(upstreamResponse.status);
      upstreamResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'transfer-encoding') return;
        res.setHeader(key, value);
      });

      const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
      if (responseBuffer.length) {
        res.send(responseBuffer);
      } else {
        res.end();
      }
    } catch (err: any) {
      console.error(`Proxy failed for ${req.originalUrl}`, err);
      res.status(502).json({
        success: false,
        message: 'Backend proxy failed.',
        details: err?.message || String(err)
      });
    }
  };

  // --- API ROUTES ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth/profile routes are proxied to the backend in development.

  // Proxy backend routes for materials, sessions, quizzes, analytics, and uploads.
  app.use(['/api/materials', '/uploads', '/api/sessions', '/api/quizzes', '/api/analytics'], async (req, res) => {
    await proxyToBackend(req, res);
  });

  // Local mock fallback routes for auth, profile, notes, and AI remain available.

  // --- GEMINI AI ENDPOINTS ---

  // AI Chat Tutor
  app.post("/api/ai/chat", async (req, res) => {
    const { message, context, chatHistory } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        reply: `[AI Assistant Mode]: As your Graduate Trainee mentor for "${context?.sessionName || 'the portal'}", here is an answer to your question: "${message}". \n\nKey Concept Breakdown:\n1. Ensure strict type signatures in C# and TypeScript.\n2. Handle exception boundaries with Global Exception Middleware or try-catch blocks.\n3. Always write unit tests before pushing code to production.`
      });
    }

    try {
      const response = await ai.models.generateContent({
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
  app.post("/api/ai/summarize", async (req, res) => {
    const { title, content } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        summary: `### AI Summary of ${title}\n\n- **Core Theme**: High performance enterprise system architecture.\n- **Key Takeaway**: Apply SOLID principles, proper indexing in SQL databases, and async/await non-blocking I/O.\n- **Action Item**: Review the code examples and complete the topic quiz.`
      });
    }

    try {
      const response = await ai.models.generateContent({
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
  app.post("/api/ai/generate-quiz", async (req, res) => {
    const { topicName, textContent } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
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
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Generate 3 high quality multiple choice practice questions for GTs on the topic "${topicName}". Source Material: ${textContent || 'General enterprise topic'}`,
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
    app.get('*', (req, res) => {
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
}

startServer();
