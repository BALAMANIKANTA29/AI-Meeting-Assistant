# AI Meeting Assistant — Team Work Allocation & Timeline

Welcome to the official development roadmap and task allocation matrix for the **AI Meeting Assistant** project. This document serves as the single source of truth for our team of five, mapping out roles, deliverables, and a structured 4-week timeline.

---

## 👥 1. Team Roles & Responsibilities

Our team of 5 is structured with clear ownership boundaries to minimize integration friction and maximize velocity:

| Team Member | Core Role | Primary Ownership Areas | Secondary Ownership Areas |
| :--- | :--- | :--- | :--- |
| **Bala** | **Backend Lead & DevOps** | API Gateway, System Architecture, JWT Auth System, Production Deployment, and Gemini integration pipelines. | Security audits, environment variable management. |
| **Ramana** | **UI/UX & Frontend Engineer** | Responsive React layout, Tailwind styling, Recharts integration, interactive audio canvas, and component modularity. | Client-side caching, accessibility (a11y) review. |
| **Gowtham** | **DBA & Performance Specialist**| Schema design (db.json/SQL tables), index optimization, semantic search scoring, analytics calculations. | Data backup scripts, API testing. |
| **Priya** | **AI Logic & Audio Specialist** | Microphone capture modules, Audio Web API, speech segmentation, speaker turn identification, prompt refinement. | Multi-language transcript fallback logic. |
| **Kiran** | **Integrations & QA Specialist** | TXT/PDF Export modules, email generation handlers, test suite setup, and third-party API hookouts. | Documentation, system health monitoring. |

---

## 📅 2. 4-Week Milestone Timeline

To deliver a polished production-ready system, we operate in 1-week sprints ending in a joint review.

### 🏁 Sprint 1: Architecture & Foundation (Week 1)
* **Goal:** Establish full-stack skeleton, authentication system, and basic database persistence.
* **Task Allocation:**
  * **Bala:** Set up Express & TypeScript server framework with robust ES module path bundling (`esbuild` and `tsx`). Implement custom JWT sign/verify system.
  * **Ramana:** Structure the workspace responsive shell (Sidebar navigation, dark/light ambient contrast layout, user card placeholder).
  * **Gowtham:** Formulate relational schema models for `Users`, `Meetings`, `ActionItems`, and `Emails`. Establish standard mock seed data scripts.
  * **Priya:** Code the client-side Audio recording module with a dynamic canvas frequency-bar visualizer using Web Audio API (`AnalyserNode`).
  * **Kiran:** Write core unit tests for authorization routes (`/api/register`, `/api/login`, `/api/me`).

---

### 🎙️ Sprint 2: Core Speech & AI Integration (Week 2)
* **Goal:** Connect transcription engines, integrate Gemini models, and generate summaries, tasks, and follow-up emails.
* **Task Allocation:**
  * **Bala & Priya:** Connect the server-side `@google/genai` client using lazy initialization. Design prompt flows for dialogue turn grouping and speaker identification.
  * **Ramana:** Code the multi-tab meeting control room (Interactive transcript view, summary markdown renderer, interactive checkbox checklist for action tasks).
  * **Gowtham:** Implement back-end handlers for `/api/upload` (handling both manual audio uploads and live microphone chunks).
  * **Kiran:** Implement automated Professional Email generation template engine leveraging Gemini response formats.

---

### 🔍 Sprint 3: Intelligence, Analytics & Search (Week 3)
* **Goal:** Implement semantic conceptual search, visual telemetry, and dashboard metrics.
* **Task Allocation:**
  * **Bala & Gowtham:** Build the `/api/search` endpoint. Develop dual retrieval modes:
    * *Semantic Mode:* Using Gemini to evaluate matching relevance and explanations.
    * *Keyword Mode:* Back-up regex matchers for high-speed local matches.
  * **Ramana:** Configure Recharts visual modules to show Meeting Durations over time, Meetings Activity distributions, and Project Productivity rates.
  * **Priya:** Add category filter buttons (e.g., Engineering, Marketing, Infrastructure) across history pipelines.
  * **Kiran:** Design and build the PDF/TXT exporter file handlers using native browser blob generation.

---

### 🚀 Sprint 4: Hardening, QA & Deployment (Week 4)
* **Goal:** Perform load testing, eliminate race conditions, audit styling parameters, and deploy.
* **Task Allocation:**
  * **All Members:** Joint bug-bash focusing on responsive design targets, font pairings (Inter & Space Grotesk), and cross-device testing.
  * **Bala:** Configure production build scripts. Package Express endpoints and bundle Vite bundles into `dist/` with zero runtime conflicts.
  * **Kiran:** Audit test coverage. Perform API key vulnerability scans to guarantee all private keys stay fully hidden on the server-side.
  * **Gowtham:** Benchmark database search speeds under simulated concurrency.

---

## 🛠️ 3. Integration Interface Points

```
               [ Priya: Audio Capture / Microphones ]
                                │
                                ▼
               [ Ramana: React Canvas / Recharts ]
                                │
                                ▼  (Rest API / JWT Headers)
               [ Bala: Express / esbuild / TSX ]
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
   [ Gowtham: DBA & Search ]      [ Kiran: Exporter & QA Engine ]
```

---

## 💡 4. Team Success Guidelines
1. **Never commit secrets:** All Gemini or server keys go exclusively in `.env` (guarded by `.env.example`).
2. **Lazy Initialization:** Always verify environment keys before initiating SDK connections on server-load.
3. **Single CSS Rule:** Style exclusively with utility Tailwind configurations in `src/index.css` to prevent compile fragmentation.
