var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_genai = require("@google/genai");
var dotenv = __toESM(require("dotenv"), 1);
dotenv.config();
var LANGUAGE_CODES = {
  "English": "en",
  "Spanish": "es",
  "French": "fr",
  "German": "de",
  "Hindi": "hi",
  "Telugu": "te",
  "Tamil": "ta",
  "Kannada": "kn",
  "Japanese": "ja",
  "Chinese": "zh",
  "Portuguese": "pt"
};
async function translateTextFree(text, targetLanguage) {
  const langCode = LANGUAGE_CODES[targetLanguage] || "en";
  if (!text || text.trim() === "") return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${langCode}&dt=t`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `q=${encodeURIComponent(text)}`
    });
    if (!res.ok) throw new Error(`Translation request failed with status: ${res.status}`);
    const json = await res.json();
    if (Array.isArray(json) && Array.isArray(json[0])) {
      return json[0].map((item) => item[0]).join("");
    }
    return text;
  } catch (err) {
    console.error("Free translation fallback failed:", err);
    return text;
  }
}
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
var isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;
var DB_FILE = isVercel ? import_path.default.join("/tmp", "db.json") : import_path.default.join(process.cwd(), "db.json");
function initDb() {
  if (!import_fs.default.existsSync(DB_FILE)) {
    const seedPath = import_path.default.join(process.cwd(), "db.json");
    if (isVercel && import_fs.default.existsSync(seedPath)) {
      try {
        import_fs.default.copyFileSync(seedPath, DB_FILE);
        return;
      } catch (e) {
        console.error("Failed to copy seed db.json to /tmp:", e);
      }
    }
    import_fs.default.writeFileSync(
      DB_FILE,
      JSON.stringify({ users: [], meetings: [], actionItems: [], emails: [] }, null, 2)
    );
  }
}
function readDb() {
  initDb();
  try {
    const data = import_fs.default.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return { users: [], meetings: [], actionItems: [], emails: [] };
  }
}
function writeDb(data) {
  import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
var JWT_SECRET = process.env.JWT_SECRET || "ai-meeting-assistant-secret-key-12345";
function generateToken(userId) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Math.floor(Date.now() / 1e3) + 7 * 24 * 60 * 60 })
  ).toString("base64url");
  const signature = import_crypto.default.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}
function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;
    const expectedSig = import_crypto.default.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.exp < Math.floor(Date.now() / 1e3)) return null;
    return data.userId;
  } catch (e) {
    return null;
  }
}
function authenticateToken(req, res, next) {
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
function getGeminiClient(customApiKey) {
  let apiKey = customApiKey || process.env.GEMINI_API_KEY || "";
  if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
    apiKey = apiKey.slice(1, -1);
  }
  if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
    apiKey = apiKey.slice(1, -1);
  }
  apiKey = apiKey.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
var PRESETS = {
  standup: {
    title: "Daily Standup - Project Alpha",
    category: "Engineering",
    description: "Daily synchronization of the engineering team regarding front-end components, back-end APIs, and Postgres schema migrations.",
    duration: 185
  },
  kickoff: {
    title: "AI Meeting Assistant Kickoff",
    category: "Product Planning",
    description: "Initial scoping session defining the speech-to-text engine, meeting summaries, search features, and integration roadmap.",
    duration: 320
  },
  database: {
    title: "Database Scaling & Optimization",
    category: "Infrastructure",
    description: "Architecture deep dive discussing database load balancing, pgpool, index optimization, and Neon serverless Postgres auto-scaling.",
    duration: 250
  },
  marketing: {
    title: "Launch & Go-To-Market Sync",
    category: "Marketing",
    description: "Strategy discussion about pricing models, social media campaigns, early adopter rewards, and beta test releases.",
    duration: 410
  }
};
app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  const db = readDb();
  if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already registered" });
  }
  const salt = import_crypto.default.randomBytes(16).toString("hex");
  const hashedPassword = import_crypto.default.createHmac("sha256", salt).update(password).digest("hex");
  const newUser = {
    id: import_crypto.default.randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash: hashedPassword,
    salt,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.users.push(newUser);
  writeDb(db);
  const token = generateToken(newUser.id);
  res.status(201).json({
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, createdAt: newUser.createdAt }
  });
});
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(400).json({ error: "Invalid email or password" });
  }
  const hashedPassword = import_crypto.default.createHmac("sha256", user.salt).update(password).digest("hex");
  if (hashedPassword !== user.passwordHash) {
    return res.status(400).json({ error: "Invalid email or password" });
  }
  const token = generateToken(user.id);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
  });
});
app.get("/api/me", authenticateToken, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
});
app.post("/api/upload", authenticateToken, async (req, res) => {
  const { title, duration, category, topic, presetId, audioData, language } = req.body;
  const finalTitle = title || "Untitled Meeting";
  const finalCategory = category || "General";
  const finalDuration = duration ? parseInt(duration, 10) : 120;
  const finalLanguage = language || "English";
  try {
    const db = readDb();
    let transcriptObj = [];
    let geminiAvailable = false;
    const customApiKey = req.headers["x-gemini-key"];
    try {
      getGeminiClient(customApiKey);
      geminiAvailable = true;
    } catch (e) {
      console.log("Gemini API key not found, using rules-based content generation.");
    }
    if (geminiAvailable) {
      const ai = getGeminiClient(customApiKey);
      if (audioData) {
        const base64Data = audioData.includes(",") ? audioData.split(",")[1] : audioData;
        const mimeType = audioData.includes(";") ? audioData.split(";")[0].split(":")[1] : "audio/webm";
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType
                }
              },
              {
                text: `Analyze and transcribe the following audio file.
Translate the conversation into a highly structured, chronological point-wise outline in the target language: "${finalLanguage}".
Even if only one person is speaking, organize the transcription into logical sections or speaker turns.
For each turn or topic:
1. Identify the speaker (e.g. "Speaker A", "Speaker B", or their actual names if mentioned/known).
2. Represent the speech or ideas discussed in a detailed, point-wise (bulleted) format (using '-' for bullets).
3. Assign an estimated timestamp based on the progress of the audio (e.g. "00:00", "01:15").

Return the output strictly as a JSON array of objects, where each object has "speaker", "text", and "timestamp" fields.
Example output format:
[
  {
    "speaker": "Speaker A",
    "text": "- Highlighted the new project milestone.\\n- Discussed database scaling challenges.",
    "timestamp": "00:00"
  }
]
Respond ONLY with raw valid JSON. Do not include markdown code block formatting or backticks.`
              }
            ],
            config: {
              responseMimeType: "application/json"
            }
          });
          if (response.text) {
            const cleanText = response.text.trim();
            try {
              const parsed = JSON.parse(cleanText);
              if (Array.isArray(parsed) && parsed.length > 0) {
                transcriptObj = parsed.map((turn) => ({
                  speaker: turn.speaker || "Transcript",
                  text: turn.text || "",
                  timestamp: turn.timestamp || "00:00"
                }));
              } else {
                throw new Error("Parsed content is not a non-empty array");
              }
            } catch (jsonErr) {
              console.warn("JSON parsing of transcription failed, formatting plain text fallback:", jsonErr);
              transcriptObj = [{ speaker: "Transcript", text: cleanText, timestamp: "00:00" }];
            }
          } else {
            throw new Error("No transcription content returned by the model.");
          }
        } catch (audioErr) {
          console.error("Direct audio transcription failed:", audioErr);
          throw new Error("Direct audio transcription failed: " + (audioErr instanceof Error ? audioErr.message : String(audioErr)));
        }
      }
      if (transcriptObj.length === 0) {
        const promptTopic = presetId && PRESETS[presetId] ? PRESETS[presetId].description : topic || "Weekly progress review and milestone discussion.";
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: `Generate a detailed, structured meeting transcript for a meeting titled "${finalTitle}". 
            Category of meeting: "${finalCategory}".
            Topic and Description: "${promptTopic}".
            Output the transcript in the target language: "${finalLanguage}".
            Format the output strictly as a JSON array of objects representing chronological speaker turns or agenda segments.
            For each segment:
            1. Speaker name (e.g. "Speaker A", "Speaker B", or actual names)
            2. Speech/content formatted as clear, detailed bullet points (using '-' for bullets)
            3. Timestamp (e.g., "00:00", "01:30")
            
            Example output structure:
            [
              {
                "speaker": "Speaker A",
                "text": "- Discussed the main agenda points.\\n- Reviewed frontend mockups.",
                "timestamp": "00:00"
              }
            ]
            Output ONLY raw valid JSON.`,
            config: {
              responseMimeType: "application/json"
            }
          });
          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            if (Array.isArray(parsed) && parsed.length > 0) {
              transcriptObj = parsed.map((turn) => ({
                speaker: turn.speaker || "Transcript",
                text: turn.text || "",
                timestamp: turn.timestamp || "00:00"
              }));
            }
          }
        } catch (simErr) {
          console.error("Simulation generation failed, falling back to plain text:", simErr);
          transcriptObj = [{
            speaker: "Transcript",
            text: `Good morning everyone. I would like to review the progress for ${finalTitle}. I have completed the initial draft of the interface layout and Gowtham is working on database index optimization to ensure we query search terms instantly.`,
            timestamp: "00:00"
          }];
        }
      }
    }
    if (transcriptObj.length === 0) {
      if (audioData) {
        transcriptObj = [
          {
            speaker: "Transcript",
            text: `[Fallback Text Extraction for "${finalTitle}"]: Since a valid GEMINI_API_KEY is not configured in the backend environment, the audio file could not be sent to the transcription API. To enable real transcription, please configure your GEMINI_API_KEY in the backend .env configuration file.`,
            timestamp: "00:00"
          }
        ];
      } else {
        transcriptObj = [
          {
            speaker: "Transcript",
            text: `Good morning everyone. I would like to review the progress for ${finalTitle}. I have completed the initial draft of the interface layout and Gowtham is working on database index optimization to ensure we query search terms instantly. We need to make sure the timeline charts are fully responsive. I will finalize the dashboard components by tomorrow evening and database benchmark results will be ready by Friday. Let's keep working hard to meet the milestone.`,
            timestamp: "00:00"
          }
        ];
      }
    }
    const meetingId = import_crypto.default.randomUUID();
    const transcriptText = JSON.stringify(transcriptObj);
    let summary = "";
    let actionItems = [];
    let emailObj = { subject: "", body: "" };
    if (geminiAvailable) {
      const ai = getGeminiClient();
      const transcriptFormatted = transcriptObj.map((t) => `${t.speaker} [${t.timestamp}]: ${t.text}`).join("\n");
      try {
        const sumRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Given the following meeting transcript, generate a beautiful structured meeting summary.
          The summary MUST be written in the target language: "${finalLanguage}".
          Use bullet points and clear headings.
          Include:
          - Executive Summary (a short paragraph)
          - Key Discussion Points (bullet points)
          - Key Decisions Made (bullet points)

          Transcript:
          ${transcriptFormatted}`
        });
        summary = sumRes.text || "Summary generation completed.";
      } catch (sumErr) {
        summary = `A meeting summary for "${finalTitle}" discussing key technical developments and milestones.`;
      }
      try {
        const actionRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Analyze the following meeting transcript and extract all action items.
          The values of the action items (task, assignedTo, deadline) MUST be in the target language: "${finalLanguage}".
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
            responseMimeType: "application/json"
          }
        });
        if (actionRes.text) {
          actionItems = JSON.parse(actionRes.text.trim());
        }
      } catch (actionErr) {
        actionItems = [
          { task: "Optimize database queries", assignedTo: "Gowtham", deadline: "This Friday" },
          { task: "Responsive frontend layout", assignedTo: "Ramana", deadline: "Tomorrow" }
        ];
      }
      try {
        const emailRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Generate a polite, professional meeting follow-up email based on this meeting summary and action items.
          The email subject and body MUST be written in the target language: "${finalLanguage}".
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
            responseMimeType: "application/json"
          }
        });
        if (emailRes.text) {
          emailObj = JSON.parse(emailRes.text.trim());
        }
      } catch (emailErr) {
        emailObj = {
          subject: `Meeting Follow-up: ${finalTitle}`,
          body: `Hi Team,

Here is a quick follow-up regarding our meeting "${finalTitle}".

${summary}

Best regards,
AI Meeting Assistant`
        };
      }
    } else {
      summary = `The team discussed core tasks for "${finalTitle}". Work is currently on track. Front-end designs are nearing completion and database performance is being audited.`;
      actionItems = [
        { task: "Optimize database indexes", assignedTo: "Gowtham", deadline: "Friday" },
        { task: "Finish responsive layouts", assignedTo: "Ramana", deadline: "Tomorrow" }
      ];
      emailObj = {
        subject: `Follow-up: ${finalTitle}`,
        body: `Hello Team,

Here is the summary of today's meeting "${finalTitle}":

- Discussions were held around engineering deliverables.
- Tasks are on track.

Best regards,
AI Meeting Assistant`
      };
    }
    const newMeeting = {
      id: meetingId,
      userId: req.userId,
      title: finalTitle,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      duration: finalDuration,
      category: finalCategory,
      transcript: transcriptText,
      summary,
      language: finalLanguage || "English"
    };
    db.meetings.push(newMeeting);
    actionItems.forEach((item) => {
      db.actionItems.push({
        id: import_crypto.default.randomUUID(),
        meetingId,
        task: item.task,
        assignedTo: item.assignedTo,
        deadline: item.deadline || "TBD",
        status: "pending"
      });
    });
    db.emails.push({
      id: import_crypto.default.randomUUID(),
      meetingId,
      subject: emailObj.subject || `Meeting Follow-up: ${finalTitle}`,
      body: emailObj.body || `Follow up details for ${finalTitle}`
    });
    writeDb(db);
    res.status(201).json(newMeeting);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || "Failed to process meeting" });
  }
});
app.get("/api/meetings", authenticateToken, (req, res) => {
  const db = readDb();
  const userMeetings = db.meetings.filter((m) => m.userId === req.userId && !m.deleted);
  res.json(userMeetings);
});
app.get("/api/meetings/trash", authenticateToken, (req, res) => {
  const db = readDb();
  const trashedMeetings = db.meetings.filter((m) => m.userId === req.userId && m.deleted);
  res.json(trashedMeetings);
});
app.get("/api/meetings/:id", authenticateToken, (req, res) => {
  const db = readDb();
  const meeting = db.meetings.find((m) => m.id === req.params.id && m.userId === req.userId);
  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found" });
  }
  const actionItems = db.actionItems.filter((a) => a.meetingId === req.params.id);
  const email = db.emails.find((e) => e.meetingId === req.params.id);
  res.json({
    ...meeting,
    actionItems,
    email
  });
});
app.post("/api/meetings/:id/translate", authenticateToken, async (req, res) => {
  const { language } = req.body;
  if (!language) {
    return res.status(400).json({ error: "Language parameter is required" });
  }
  try {
    const db = readDb();
    const meeting = db.meetings.find((m) => m.id === req.params.id && m.userId === req.userId);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    const actionItems = db.actionItems.filter((a) => a.meetingId === req.params.id);
    const email = db.emails.find((e) => e.meetingId === req.params.id);
    let geminiAvailable = false;
    const customApiKey = req.headers["x-gemini-key"];
    try {
      getGeminiClient(customApiKey);
      geminiAvailable = true;
    } catch (e) {
    }
    let translatedSuccess = false;
    if (geminiAvailable) {
      const ai = getGeminiClient(customApiKey);
      try {
        const translationPrompt = `You are a master translator. Translate the following meeting details into the target language: "${language}".

Requirements:
1. For "transcript": Translate ONLY the "text" field of each speaker turn. Leave "speaker" and "timestamp" fields completely unchanged.
2. For "summary": Translate the markdown summary text, preserving all headings, markdown formatting, and bullet points.
3. For "actionItems": Translate ONLY the "task" field. Leave "id", "meetingId", "assignedTo", "deadline", and "status" fields completely unchanged.
4. For "email": Translate the subject and body of the email.

Input Data to Translate:
{
  "transcript": ${meeting.transcript},
  "summary": ${JSON.stringify(meeting.summary || "")},
  "actionItems": ${JSON.stringify(actionItems)},
  "email": ${email ? JSON.stringify({ subject: email.subject, body: email.body }) : "null"}
}

Respond strictly in the following JSON format:
{
  "transcript": <translated transcript JSON array>,
  "summary": <translated markdown summary string>,
  "actionItems": <translated action items JSON array>,
  "email": {
    "subject": <translated subject string>,
    "body": <translated body string>
  }
}
Respond ONLY with raw valid JSON. Do not include markdown code block formatting or backticks.`;
        const transRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: translationPrompt,
          config: {
            responseMimeType: "application/json"
          }
        });
        if (transRes.text) {
          const result = JSON.parse(transRes.text.trim());
          if (result.transcript && Array.isArray(result.transcript)) {
            meeting.transcript = JSON.stringify(result.transcript);
          }
          if (result.summary) {
            meeting.summary = result.summary;
          }
          if (result.actionItems && Array.isArray(result.actionItems)) {
            result.actionItems.forEach((updatedItem) => {
              if (updatedItem && updatedItem.id) {
                const itemInDb = db.actionItems.find((a) => a.id === updatedItem.id);
                if (itemInDb) {
                  itemInDb.task = updatedItem.task;
                }
              }
            });
          }
          if (email && result.email && result.email.subject && result.email.body) {
            const emailInDb = db.emails.find((e) => e.meetingId === req.params.id);
            if (emailInDb) {
              emailInDb.subject = result.email.subject;
              emailInDb.body = result.email.body;
            }
          }
          meeting.language = language;
          writeDb(db);
          translatedSuccess = true;
        }
      } catch (transErr) {
        console.warn("Gemini translation failed, falling back to Google Translate API:", transErr.message || transErr);
      }
    }
    if (!translatedSuccess) {
      console.log("Using free Google Translate API fallback for language translation...");
      try {
        const turns = JSON.parse(meeting.transcript);
        if (Array.isArray(turns)) {
          for (const turn of turns) {
            if (turn.text) {
              turn.text = await translateTextFree(turn.text, language);
            }
          }
          meeting.transcript = JSON.stringify(turns);
        }
      } catch (e) {
        console.error("Fallback transcript translation failed:", e);
      }
      try {
        meeting.summary = await translateTextFree(meeting.summary, language);
      } catch (e) {
        console.error("Fallback summary translation failed:", e);
      }
      try {
        for (const item of actionItems) {
          if (item.task) {
            item.task = await translateTextFree(item.task, language);
          }
        }
      } catch (e) {
        console.error("Fallback action items translation failed:", e);
      }
      if (email) {
        try {
          email.subject = await translateTextFree(email.subject, language);
          email.body = await translateTextFree(email.body, language);
        } catch (e) {
          console.error("Fallback email translation failed:", e);
        }
      }
      actionItems.forEach((updatedItem) => {
        const itemInDb = db.actionItems.find((a) => a.id === updatedItem.id);
        if (itemInDb) {
          itemInDb.task = updatedItem.task;
        }
      });
      if (email) {
        const emailInDb = db.emails.find((e) => e.meetingId === req.params.id);
        if (emailInDb) {
          emailInDb.subject = email.subject;
          emailInDb.body = email.body;
        }
      }
      meeting.language = language;
      writeDb(db);
    }
    res.json({
      ...meeting,
      actionItems: db.actionItems.filter((a) => a.meetingId === req.params.id),
      email: db.emails.find((e) => e.meetingId === req.params.id)
    });
  } catch (error) {
    console.error("Translation route error:", error);
    let errorMsg = "Failed to translate meeting details";
    if (error.message) {
      if (error.message.includes("quota") || error.message.includes("RESOURCE_EXHAUSTED") || error.message.includes("429")) {
        const match = error.message.match(/Please retry in ([0-9.]+[a-zA-Z]+)/i);
        const retryTime = match ? ` in ${match[1]}` : " in a few seconds";
        errorMsg = `Gemini API Rate Limit: You exceeded your current API quota limit. Please retry${retryTime}.`;
      } else {
        errorMsg = error.message;
      }
    }
    res.status(500).json({ error: errorMsg });
  }
});
app.delete("/api/meetings/:id", authenticateToken, (req, res) => {
  const db = readDb();
  const meeting = db.meetings.find((m) => m.id === req.params.id && m.userId === req.userId);
  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found" });
  }
  meeting.deleted = true;
  meeting.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
  writeDb(db);
  res.json({ message: "Meeting moved to Recycle Bin", meeting });
});
app.post("/api/meetings/:id/restore", authenticateToken, (req, res) => {
  const db = readDb();
  const meeting = db.meetings.find((m) => m.id === req.params.id && m.userId === req.userId);
  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found" });
  }
  meeting.deleted = false;
  delete meeting.deletedAt;
  writeDb(db);
  res.json({ message: "Meeting restored successfully", meeting });
});
app.delete("/api/meetings/:id/permanent", authenticateToken, (req, res) => {
  const db = readDb();
  const meetingIndex = db.meetings.findIndex(
    (m) => m.id === req.params.id && m.userId === req.userId
  );
  if (meetingIndex === -1) {
    return res.status(404).json({ error: "Meeting not found" });
  }
  db.meetings.splice(meetingIndex, 1);
  db.actionItems = db.actionItems.filter((a) => a.meetingId !== req.params.id);
  db.emails = db.emails.filter((e) => e.meetingId !== req.params.id);
  writeDb(db);
  res.json({ message: "Meeting permanently deleted successfully" });
});
app.post("/api/meetings/empty-trash", authenticateToken, (req, res) => {
  const db = readDb();
  const userMeetingsToPermanentlyDelete = db.meetings.filter(
    (m) => m.userId === req.userId && m.deleted
  );
  const idsToDelete = userMeetingsToPermanentlyDelete.map((m) => m.id);
  db.meetings = db.meetings.filter((m) => !(m.userId === req.userId && m.deleted));
  db.actionItems = db.actionItems.filter((a) => !idsToDelete.includes(a.meetingId));
  db.emails = db.emails.filter((e) => !idsToDelete.includes(e.meetingId));
  writeDb(db);
  res.json({ message: "Recycle Bin emptied successfully" });
});
app.post("/api/meetings/bulk-delete", authenticateToken, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: "Invalid meeting IDs" });
  }
  const db = readDb();
  let count = 0;
  db.meetings.forEach((m) => {
    if (ids.includes(m.id) && m.userId === req.userId) {
      m.deleted = true;
      m.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
      count++;
    }
  });
  writeDb(db);
  res.json({ message: `Successfully moved ${count} meetings to Recycle Bin` });
});
app.post("/api/meetings/bulk-restore", authenticateToken, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: "Invalid meeting IDs" });
  }
  const db = readDb();
  let count = 0;
  db.meetings.forEach((m) => {
    if (ids.includes(m.id) && m.userId === req.userId) {
      m.deleted = false;
      delete m.deletedAt;
      count++;
    }
  });
  writeDb(db);
  res.json({ message: `Successfully restored ${count} meetings` });
});
app.post("/api/meetings/bulk-permanent-delete", authenticateToken, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: "Invalid meeting IDs" });
  }
  const db = readDb();
  db.meetings = db.meetings.filter(
    (m) => !(ids.includes(m.id) && m.userId === req.userId)
  );
  db.actionItems = db.actionItems.filter((a) => !ids.includes(a.meetingId));
  db.emails = db.emails.filter((e) => !ids.includes(e.meetingId));
  writeDb(db);
  res.json({ message: "Successfully permanently deleted selected meetings" });
});
app.post("/api/action-items/:id/toggle", authenticateToken, (req, res) => {
  const db = readDb();
  const actionItem = db.actionItems.find((a) => a.id === req.params.id);
  if (!actionItem) {
    return res.status(404).json({ error: "Action item not found" });
  }
  const meeting = db.meetings.find((m) => m.id === actionItem.meetingId && m.userId === req.userId);
  if (!meeting) {
    return res.status(403).json({ error: "Unauthorized access" });
  }
  actionItem.status = actionItem.status === "pending" ? "completed" : "pending";
  writeDb(db);
  res.json(actionItem);
});
app.get("/api/search", authenticateToken, async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: "Search query required" });
  }
  try {
    const db = readDb();
    const userMeetings = db.meetings.filter((m) => m.userId === req.userId && !m.deleted);
    if (userMeetings.length === 0) {
      return res.json([]);
    }
    let geminiAvailable = false;
    const customApiKey = req.headers["x-gemini-key"];
    try {
      getGeminiClient(customApiKey);
      geminiAvailable = true;
    } catch (e) {
    }
    if (geminiAvailable) {
      const ai = getGeminiClient(customApiKey);
      const meetingsMeta = userMeetings.map((m) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        summary: m.summary || ""
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
          responseMimeType: "application/json"
        }
      });
      if (response.text) {
        const result = JSON.parse(response.text.trim());
        const matchedList = result.matches || [];
        const finalResults = matchedList.map((match) => {
          const meetingObj = userMeetings.find((m) => m.id === match.id);
          if (meetingObj) {
            return {
              ...meetingObj,
              relevanceExplanation: match.relevanceExplanation
            };
          }
          return null;
        }).filter(Boolean);
        return res.json(finalResults);
      }
    }
    const queryLower = q.toLowerCase();
    const matches = userMeetings.map((m) => {
      let score = 0;
      if (m.title.toLowerCase().includes(queryLower)) score += 10;
      if (m.category && m.category.toLowerCase().includes(queryLower)) score += 5;
      if (m.summary && m.summary.toLowerCase().includes(queryLower)) score += 3;
      if (score > 0) {
        return {
          ...m,
          relevanceExplanation: `Matched keyword "${q}" found in meeting details.`
        };
      }
      return null;
    }).filter(Boolean);
    res.json(matches);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search processing failed" });
  }
});
app.get("/api/analytics", authenticateToken, (req, res) => {
  const db = readDb();
  const userMeetings = db.meetings.filter((m) => m.userId === req.userId && !m.deleted);
  const userMeetingIds = userMeetings.map((m) => m.id);
  const userActionItems = db.actionItems.filter((a) => userMeetingIds.includes(a.meetingId));
  const totalMeetings = userMeetings.length;
  const totalDuration = Math.round(userMeetings.reduce((acc, cur) => acc + (cur.duration || 0), 0) / 60);
  const pendingTasks = userActionItems.filter((a) => a.status === "pending").length;
  const completedTasks = userActionItems.filter((a) => a.status === "completed").length;
  const productivityRate = userActionItems.length > 0 ? Math.round(completedTasks / userActionItems.length * 100) : 100;
  const monthMap = {};
  userMeetings.forEach((m) => {
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
    count: monthMap[key].count
  }));
  const durationByMonth = Object.keys(monthMap).map((key) => ({
    month: key,
    duration: monthMap[key].duration
  }));
  res.json({
    totalMeetings,
    totalDuration,
    pendingTasks,
    completedTasks,
    recentMeetings: userMeetings.slice(-5).reverse(),
    meetingsByMonth: meetingsByMonth.slice(-6),
    durationByMonth: durationByMonth.slice(-6),
    productivityRate
  });
});
var server_default = app;
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer();
}
//# sourceMappingURL=server.cjs.map
