import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for JSON parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Database initialization & functions
const DB_FILE = path.join(process.cwd(), "db.json");

function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ users: [], meetings: [], actionItems: [], emails: [] }, null, 2)
    );
  }
}

function readDb() {
  initDb();
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return { users: [], meetings: [], actionItems: [], emails: [] };
  }
}

function writeDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Simple Native JWT System
const JWT_SECRET = process.env.JWT_SECRET || "ai-meeting-assistant-secret-key-12345";

function generateToken(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token: string): string | null {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");
    if (signature !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.exp < Math.floor(Date.now() / 1000)) return null; // expired
    return data.userId;
  } catch (e) {
    return null;
  }
}

// Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const userId = verifyToken(token);
  if (!userId) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  req.userId = userId;
  next();
}

// Lazy Gemini Client Initialization
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Preset Conversations for Meeting Simulation
const PRESETS = {
  standup: {
    title: "Daily Standup - Project Alpha",
    category: "Engineering",
    description: "Daily synchronization of the engineering team regarding front-end components, back-end APIs, and Postgres schema migrations.",
    duration: 185,
  },
  kickoff: {
    title: "AI Meeting Assistant Kickoff",
    category: "Product Planning",
    description: "Initial scoping session defining the speech-to-text engine, meeting summaries, search features, and integration roadmap.",
    duration: 320,
  },
  database: {
    title: "Database Scaling & Optimization",
    category: "Infrastructure",
    description: "Architecture deep dive discussing database load balancing, pgpool, index optimization, and Neon serverless Postgres auto-scaling.",
    duration: 250,
  },
  marketing: {
    title: "Launch & Go-To-Market Sync",
    category: "Marketing",
    description: "Strategy discussion about pricing models, social media campaigns, early adopter rewards, and beta test releases.",
    duration: 410,
  },
};

/* ==================== API ROUTES ==================== */

// POST /api/register
app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  const db = readDb();
  if (db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = crypto.createHmac("sha256", salt).update(password).digest("hex");

  const newUser = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash: hashedPassword,
    salt,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDb(db);

  const token = generateToken(newUser.id);
  res.status(201).json({
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, createdAt: newUser.createdAt },
  });
});

// POST /api/login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  const hashedPassword = crypto.createHmac("sha256", user.salt).update(password).digest("hex");
  if (hashedPassword !== user.passwordHash) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  const token = generateToken(user.id);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
  });
});

// GET /api/me
app.get("/api/me", authenticateToken, (req: any, res) => {
  const db = readDb();
  const user = db.users.find((u: any) => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
});

// POST /api/upload - Audio uploads, recordings, or simulations
app.post("/api/upload", authenticateToken, async (req: any, res) => {
  const { title, duration, category, topic, presetId, audioData } = req.body;
  
  const finalTitle = title || "Untitled Meeting";
  const finalCategory = category || "General";
  const finalDuration = duration ? parseInt(duration, 10) : 120;

  try {
    const db = readDb();
    let transcriptObj: any[] = [];
    
    // Check if we can trigger Gemini client
    let geminiAvailable = false;
    try {
      getGeminiClient();
      geminiAvailable = true;
    } catch (e) {
      console.log("Gemini API key not found, using rules-based content generation.");
    }

    if (geminiAvailable) {
      const ai = getGeminiClient();

      if (audioData) {
        // If the user recorded audio and sent it, we can actually transcribing it with Gemini!
        // To be extremely robust, we can extract base64 clean content
        const base64Data = audioData.includes(",") ? audioData.split(",")[1] : audioData;
        const mimeType = audioData.includes(";") ? audioData.split(";")[0].split(":")[1] : "audio/webm";

        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType,
                },
              },
              {
                text: "Transcribe the following meeting audio. Correct grammar and divide into speaker turns. Format strictly as a JSON array of speaker turns: [{\"speaker\": \"Speaker 1\", \"text\": \"...\", \"timestamp\": \"00:15\"}]. Identify speakers if possible, or use 'Speaker 1', 'Speaker 2'. Respond ONLY with the raw JSON array. No markdown, no triple backticks.",
              }
            ],
            config: {
              responseMimeType: "application/json",
            }
          });

          if (response.text) {
            transcriptObj = JSON.parse(response.text.trim());
          }
        } catch (audioErr) {
          console.error("Direct audio transcription failed, falling back to text simulation:", audioErr);
        }
      }

      // If transcriptObj is still empty (either fallback or simulation requested)
      if (transcriptObj.length === 0) {
        const promptTopic = presetId && PRESETS[presetId as keyof typeof PRESETS]
          ? PRESETS[presetId as keyof typeof PRESETS].description
          : (topic || "Weekly progress review and milestone discussion.");

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Generate a highly realistic and detailed meeting transcript for a meeting titled "${finalTitle}". 
          Category of meeting: "${finalCategory}".
          Topic and Description: "${promptTopic}".
          The transcript should contain 2 to 4 distinct speakers, realistic and natural conversation (agreements, questions, comments, decisions), and specific assignable tasks.
          Format the output strictly as a JSON array of speaker turns:
          [
            {
              "speaker": "Speaker Name",
              "text": "What they said",
              "timestamp": "MM:SS"
            }
          ]
          Make the transcript around 10 to 15 turns long. Do not include markdown wraps or backticks. Output only raw valid JSON.`,
          config: {
            responseMimeType: "application/json",
          }
        });

        if (response.text) {
          transcriptObj = JSON.parse(response.text.trim());
        }
      }
    }

    // Backup Local Generation if Gemini fails or is missing
    if (transcriptObj.length === 0) {
      transcriptObj = [
        { speaker: "Bala", text: `Good morning everyone. Let's kickoff our review for ${finalTitle}.`, timestamp: "00:00" },
        { speaker: "Ramana", text: "I've completed the initial draft of the interface layout.", timestamp: "00:25" },
        { speaker: "Gowtham", text: "Excellent! I am working on index optimization to ensure we query search terms instantly.", timestamp: "01:10" },
        { speaker: "Bala", text: "Great progress. Ramana, let's make sure the timeline charts are fully responsive. Gowtham, keep me updated on the database queries.", timestamp: "01:50" },
        { speaker: "Gowtham", text: "Understood. I will have the database optimization benchmark ready by Friday.", timestamp: "02:30" },
        { speaker: "Ramana", text: "I will finalize the dashboard components by tomorrow evening.", timestamp: "03:02" },
      ];
    }

    const meetingId = crypto.randomUUID();
    const transcriptText = JSON.stringify(transcriptObj);

    // Now, run Gemini to create the summary, action items, and email dynamically!
    let summary = "";
    let actionItems: any[] = [];
    let emailObj = { subject: "", body: "" };

    if (geminiAvailable) {
      const ai = getGeminiClient();
      const transcriptFormatted = transcriptObj.map(t => `${t.speaker} [${t.timestamp}]: ${t.text}`).join("\n");

      // 1. Generate Summary
      try {
        const sumRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Given the following meeting transcript, generate a beautiful structured meeting summary.
          Use bullet points and clear headings.
          Include:
          - Executive Summary (a short paragraph)
          - Key Discussion Points (bullet points)
          - Key Decisions Made (bullet points)

          Transcript:
          ${transcriptFormatted}`,
        });
        summary = sumRes.text || "Summary generation completed.";
      } catch (sumErr) {
        summary = `A meeting summary for "${finalTitle}" discussing key technical developments and milestones.`;
      }

      // 2. Extract Action Items
      try {
        const actionRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Analyze the following meeting transcript and extract all action items.
          For each task, find:
          - The task description
          - The person responsible (assignee)
          - A specific deadline or suggested date based on the discussion (e.g. "This Friday" or "Tomorrow")
          
          Format strictly as a JSON array:
          [
            {
              "task": "Task description",
              "assignedTo": "Assignee Name",
              "deadline": "Deadline"
            }
          ]
          Output only raw valid JSON.`,
          config: {
            responseMimeType: "application/json",
          }
        });
        if (actionRes.text) {
          actionItems = JSON.parse(actionRes.text.trim());
        }
      } catch (actionErr) {
        actionItems = [
          { task: "Optimize database queries", assignedTo: "Gowtham", deadline: "This Friday" },
          { task: "Responsive frontend layout", assignedTo: "Ramana", deadline: "Tomorrow" },
        ];
      }

      // 3. Generate Email
      try {
        const emailRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Generate a polite, professional meeting follow-up email based on this meeting summary and action items.
          Format the output strictly as a JSON object:
          {
            "subject": "Email Subject",
            "body": "Email Body text (use \\n for line breaks)"
          }
          Output only raw valid JSON.

          Summary:
          ${summary}

          Action Items:
          ${JSON.stringify(actionItems)}`,
          config: {
            responseMimeType: "application/json",
          }
        });
        if (emailRes.text) {
          emailObj = JSON.parse(emailRes.text.trim());
        }
      } catch (emailErr) {
        emailObj = {
          subject: `Meeting Follow-up: ${finalTitle}`,
          body: `Hi Team,\n\nHere is a quick follow-up regarding our meeting "${finalTitle}".\n\n${summary}\n\nBest regards,\nAI Meeting Assistant`,
        };
      }
    } else {
      // Fallback if no Gemini API key
      summary = `The team discussed core tasks for "${finalTitle}". Work is currently on track. Front-end designs are nearing completion and database performance is being audited.`;
      actionItems = [
        { task: "Optimize database indexes", assignedTo: "Gowtham", deadline: "Friday" },
        { task: "Finish responsive layouts", assignedTo: "Ramana", deadline: "Tomorrow" },
      ];
      emailObj = {
        subject: `Follow-up: ${finalTitle}`,
        body: `Hello Team,\n\nHere is the summary of today's meeting "${finalTitle}":\n\n- Discussions were held around engineering deliverables.\n- Tasks are on track.\n\nBest regards,\nAI Meeting Assistant`,
      };
    }

    const newMeeting = {
      id: meetingId,
      userId: req.userId,
      title: finalTitle,
      date: new Date().toISOString(),
      duration: finalDuration,
      category: finalCategory,
      transcript: transcriptText,
      summary,
    };

    db.meetings.push(newMeeting);

    // Save action items
    actionItems.forEach((item: any) => {
      db.actionItems.push({
        id: crypto.randomUUID(),
        meetingId: meetingId,
        task: item.task,
        assignedTo: item.assignedTo,
        deadline: item.deadline || "TBD",
        status: "pending",
      });
    });

    // Save Email template
    db.emails.push({
      id: crypto.randomUUID(),
      meetingId: meetingId,
      subject: emailObj.subject || `Meeting Follow-up: ${finalTitle}`,
      body: emailObj.body || `Follow up details for ${finalTitle}`,
    });

    writeDb(db);

    res.status(201).json(newMeeting);
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || "Failed to process meeting" });
  }
});

// GET /api/meetings - List meetings of logged-in user
app.get("/api/meetings", authenticateToken, (req: any, res) => {
  const db = readDb();
  const userMeetings = db.meetings.filter((m: any) => m.userId === req.userId);
  res.json(userMeetings);
});

// GET /api/meetings/:id - Get meeting details
app.get("/api/meetings/:id", authenticateToken, (req: any, res) => {
  const db = readDb();
  const meeting = db.meetings.find((m: any) => m.id === req.params.id && m.userId === req.userId);
  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  const actionItems = db.actionItems.filter((a: any) => a.meetingId === req.params.id);
  const email = db.emails.find((e: any) => e.meetingId === req.params.id);

  res.json({
    ...meeting,
    actionItems,
    email,
  });
});

// DELETE /api/meetings/:id - Delete a meeting
app.delete("/api/meetings/:id", authenticateToken, (req: any, res) => {
  const db = readDb();
  const meetingIndex = db.meetings.findIndex(
    (m: any) => m.id === req.params.id && m.userId === req.userId
  );
  if (meetingIndex === -1) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  db.meetings.splice(meetingIndex, 1);
  db.actionItems = db.actionItems.filter((a: any) => a.meetingId !== req.params.id);
  db.emails = db.emails.filter((e: any) => e.meetingId !== req.params.id);

  writeDb(db);
  res.json({ message: "Meeting deleted successfully" });
});

// POST /api/action-items/:id/toggle - Toggle action item status
app.post("/api/action-items/:id/toggle", authenticateToken, (req: any, res) => {
  const db = readDb();
  const actionItem = db.actionItems.find((a: any) => a.id === req.params.id);
  if (!actionItem) {
    return res.status(404).json({ error: "Action item not found" });
  }

  // Verify the action item belongs to one of this user's meetings
  const meeting = db.meetings.find((m: any) => m.id === actionItem.meetingId && m.userId === req.userId);
  if (!meeting) {
    return res.status(403).json({ error: "Unauthorized access" });
  }

  actionItem.status = actionItem.status === "pending" ? "completed" : "pending";
  writeDb(db);
  res.json(actionItem);
});

// GET /api/search - Semantic Search
app.get("/api/search", authenticateToken, async (req: any, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: "Search query required" });
  }

  try {
    const db = readDb();
    const userMeetings = db.meetings.filter((m: any) => m.userId === req.userId);

    if (userMeetings.length === 0) {
      return res.json([]);
    }

    let geminiAvailable = false;
    try {
      getGeminiClient();
      geminiAvailable = true;
    } catch (e) {}

    if (geminiAvailable) {
      const ai = getGeminiClient();
      const meetingsMeta = userMeetings.map((m: any) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        summary: m.summary || "",
      }));

      const searchPrompt = `You are an advanced AI semantic search engine for a meeting intelligence application.
      The user is searching for: "${q}".
      Analyze the list of user meetings provided below, evaluate their titles, categories, and summaries, and determine which ones are relevant to the query and why.
      Return the relevant meeting IDs ordered by matching confidence (most relevant first).
      For each matching meeting, provide a short 1-sentence relevance explanation explaining why it matches.
      
      Meetings Data:
      ${JSON.stringify(meetingsMeta)}
      
      Format the output strictly as a JSON object:
      {
        "matches": [
          {
            "id": "meeting-id",
            "relevanceExplanation": "Short explanation of relevance"
          }
        ]
      }
      Do not include markdown or code wraps, return ONLY valid raw JSON. If no meetings match, return matches: [].`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: searchPrompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      if (response.text) {
        const result = JSON.parse(response.text.trim());
        const matchedList = result.matches || [];
        
        // Assemble matched meetings with relevance explanations
        const finalResults = matchedList
          .map((match: any) => {
            const meetingObj = userMeetings.find((m: any) => m.id === match.id);
            if (meetingObj) {
              return {
                ...meetingObj,
                relevanceExplanation: match.relevanceExplanation,
              };
            }
            return null;
          })
          .filter(Boolean);

        return res.json(finalResults);
      }
    }

    // Traditional Fallback keyword matcher
    const queryLower = q.toLowerCase();
    const matches = userMeetings
      .map((m: any) => {
        let score = 0;
        if (m.title.toLowerCase().includes(queryLower)) score += 10;
        if (m.category && m.category.toLowerCase().includes(queryLower)) score += 5;
        if (m.summary && m.summary.toLowerCase().includes(queryLower)) score += 3;

        if (score > 0) {
          return {
            ...m,
            relevanceExplanation: `Matched keyword "${q}" found in meeting details.`,
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json(matches);
  } catch (error: any) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search processing failed" });
  }
});

// GET /api/analytics - Get computed dashboard stats
app.get("/api/analytics", authenticateToken, (req: any, res) => {
  const db = readDb();
  const userMeetings = db.meetings.filter((m: any) => m.userId === req.userId);
  const userMeetingIds = userMeetings.map((m: any) => m.id);
  const userActionItems = db.actionItems.filter((a: any) => userMeetingIds.includes(a.meetingId));

  const totalMeetings = userMeetings.length;
  const totalDuration = Math.round(userMeetings.reduce((acc: number, cur: any) => acc + (cur.duration || 0), 0) / 60);
  const pendingTasks = userActionItems.filter((a: any) => a.status === "pending").length;
  const completedTasks = userActionItems.filter((a: any) => a.status === "completed").length;

  const productivityRate =
    userActionItems.length > 0
      ? Math.round((completedTasks / userActionItems.length) * 100)
      : 100;

  // Compute meetings and duration by month
  const monthMap: { [key: string]: { count: number; duration: number } } = {};
  userMeetings.forEach((m: any) => {
    const d = new Date(m.date);
    const label = d.toLocaleString("default", { month: "short" }) + " " + d.getFullYear().toString().substring(2);
    if (!monthMap[label]) {
      monthMap[label] = { count: 0, duration: 0 };
    }
    monthMap[label].count += 1;
    monthMap[label].duration += Math.round((m.duration || 0) / 60);
  });

  const meetingsByMonth = Object.keys(monthMap).map((key) => ({
    month: key,
    count: monthMap[key].count,
  }));

  const durationByMonth = Object.keys(monthMap).map((key) => ({
    month: key,
    duration: monthMap[key].duration,
  }));

  res.json({
    totalMeetings,
    totalDuration,
    pendingTasks,
    completedTasks,
    recentMeetings: userMeetings.slice(-5).reverse(),
    meetingsByMonth: meetingsByMonth.slice(-6),
    durationByMonth: durationByMonth.slice(-6),
    productivityRate,
  });
});

/* ==================== VITE SERVER & PRODUCTION SERVING ==================== */

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
