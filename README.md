# AI Meeting Assistant

AI Meeting Assistant is a production-ready, full-stack web application designed to automate the capture, transcription, summarization, and follow-up lifecycle of team meetings. By combining browser-based audio capture, manual meeting notes input, secure Express/JWT authentication, Gemini-powered language models, dual-mode search, and interactive Recharts dashboards, the platform transforms raw meeting audio and unstructured notes into structured, searchable intelligence.

---

## 🌟 Key Features

### 🎙️ 1. Multi-Input Meeting Processing
- **Live Audio Recording**: Record meetings directly in the browser via the Web Audio API with a real-time Web Audio `AnalyserNode` frequency canvas visualizer.
- **Audio File Upload**: Drag-and-drop or select audio files (`MP3`, `WAV`, `M4A`, `WebM`).
- **Manual Notes & Minutes Entry**: Type or paste raw meeting notes, minutes, agendas, or transcripts directly. Converts unstructured notes into structured bulleted speaker turns, summaries, action items, and emails.
- **Simulation Templates**: Pre-configured meeting presets (*Sprint Planning*, *AI Assistant Kickoff*, *Database Optimization*, *Marketing Strategy*) for instant demonstration.

### 🔐 2. Authentication & Enhanced Password Security
- **JWT-Based Authentication**: Custom JWT sign/verify system built on Express and Node.js.
- **Normalized Email & Duplicate Account Prevention**: Emails are sanitized (`email.trim().toLowerCase()`) to prevent duplicate user registrations, featuring an interactive *"Switch to Sign In →"* prompt when registering existing emails.
- **Password Complexity Enforcement**: Passwords must satisfy strict complexity rules (at least 6 characters, 1 uppercase letter `A-Z`, 1 lowercase letter `a-z`, and 1 number `0-9`).
- **Dynamic Disappearing Requirement Checklist**: Real-time visual feedback where satisfied rules dynamically disappear as the user types.
- **Password Visibility Toggle**: Show/Hide password toggle button (`Eye` / `EyeOff` icons) inside input fields.

### 📝 3. AI Summarization & Automation
- **Structured Transcripts**: Chronological speaker-turn identification and dialogue grouping.
- **Executive Summaries**: AI-generated executive summaries, key discussion points, and key decisions.
- **Action Item Checklists**: Automatically extracts tasks, assignees, and deadlines into interactive checklists.
- **Automated Follow-up Emails**: Automatically drafts professional follow-up email templates summarizing key decisions and next steps.

### 🗑️ 4. Recycle Bin & Meeting Recovery
- **Soft Delete & Restore**: Move meetings to a **Recycle Bin / Trash** section to prevent accidental data loss.
- **Full Restoration**: Restore deleted meetings back to active history or permanently purge them.

### 🌐 5. Multi-Language Engine & Fallback Translation
- **11 Supported Languages**: Native processing and output in English, Spanish, French, German, Hindi, Telugu, Tamil, Kannada, Japanese, Chinese, and Portuguese.
- **Free Translation Fallback**: Automated fallback to Google Translate API when a Gemini API key is missing or encounters rate limits.

### 🔍 6. Dual-Mode Search Engine
- **Semantic Search**: Gemini-powered relevance scoring that matches conceptual queries against meeting transcripts and summaries.
- **Keyword Search**: Regex-based local search for fast keyword matching.

### 📊 7. Analytics Dashboards & Export
- **Recharts Dashboards**: Visualize meeting frequency, duration trends, activity distributions, and team productivity rates.
- **Export Options**: Download transcripts and summaries as formatted **PDF** or **TXT** files.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Motion (Framer), Recharts, Lucide Icons, Web Audio API |
| **Backend** | Node.js, Express.js, TypeScript, `tsx`, `esbuild` |
| **Authentication** | Custom JWT (JSON Web Token) authentication with SHA-256 password hashing & salt |
| **AI / LLM** | Google Gemini (`@google/genai` SDK - `gemini-3.5-flash`) |
| **Database** | JSON File Database (`db.json`) / Local Storage |
| **Deployment** | Vercel Serverless Functions (`api/server.cjs` CJS bundle) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/BALAMANIKANTA29/AI-Meeting-Assistant.git
cd AI-Meeting-Assistant
npm install
```

### 2. Environment Configuration
Create a `.env` file in the project root:
```env
PORT=3001
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
Start the Express server and Vite frontend compiler:
```bash
npm run dev
```

Open your browser and navigate to:
```text
http://localhost:3001
```

---

## 📜 Available Scripts

- `npm run dev` - Starts the development server with live reload (`tsx server.ts`).
- `npm run build` - Builds production frontend assets (`vite build`) and bundles backend serverless function (`esbuild`).
- `npm run start` - Starts the production server (`node api/server.cjs`).
- `npm run lint` - Runs TypeScript type checking (`tsc --noEmit`).

---

## ☁️ Deployment on Vercel

This repository is configured for serverless deployment on Vercel using `vercel.json` and a single-file CJS serverless function (`api/server.cjs`).

### Environment Variables on Vercel:
1. Go to your project on the [Vercel Dashboard](https://vercel.com).
2. Navigate to **Settings** > **Environment Variables**.
3. Add the following environment variables:
   - `GEMINI_API_KEY`: Your Google Gemini API key.
   - `JWT_SECRET`: Secret key for JWT token signing.
4. Save and trigger a **Redeploy** (or push a new commit to `main`).

---

