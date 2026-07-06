# AI Meeting Assistant

AI Meeting Assistant is a full-stack web app that helps users manage, search, and analyze meeting recordings and transcripts. It combines a React-based dashboard with an Express backend and AI-powered summarization features so teams can quickly review important decisions, action items, and insights from meetings.

## Features

- Secure authentication for users
- Upload and process meeting artifacts
- View analytics and meeting summaries
- Search past meetings by content and metadata
- Recover deleted meetings from the recycle bin
- Store meeting data locally in a JSON-backed database

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind-inspired UI
- Backend: Express, Node.js
- AI integration: Google Gemini via the Google GenAI SDK
- Data storage: JSON file database

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```

2. Set up your environment
   Create a `.env` file in the project root and add your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Open the app in your browser at:
   ```text
   http://localhost:3001
   ```

## Available Scripts

- `npm run dev` - start the app in development mode
- `npm run build` - build the production bundle
- `npm run start` - start the built server
- `npm run lint` - run TypeScript checks

## Deployment on Vercel

This app is configured for deployment on Vercel. 

### Environment Variables Config

Since Vercel serverless functions do not load the local `.env` file, you must configure the Gemini API key in the Vercel Dashboard:

1. Go to your project on the [Vercel Dashboard](https://vercel.com).
2. Navigate to **Settings** > **Environment Variables**.
3. Add a new variable:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `your_gemini_api_key`
4. Click **Save**.
5. Go to the **Deployments** tab and trigger a **Redeploy** (or push a new Git commit) for the environment variables to take effect.

## Notes

The app uses a simple local JSON database for demo and development purposes. For production use, you may want to replace it with a persistent database such as PostgreSQL or MongoDB.
