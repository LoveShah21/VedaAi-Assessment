# VedaAI — AI Assessment Creator

## Overview
AI-powered question paper generator for teachers. Upload material, configure question types, and get a formatted question paper in seconds.

## Architecture

### Frontend (Next.js 14 + TypeScript)
- **App Router** with server and client components
- **Zustand** for global form and generation state
- **Socket.IO client** for real-time job updates
- **Axios** for API communication

### Backend (Node.js + Express + TypeScript)
- **MongoDB** (Mongoose) — stores assignments and generated results
- **Redis** (ioredis) — caches results and job state
- **BullMQ** — manages background generation jobs
- **Socket.IO** — pushes real-time progress to frontend
- **Puppeteer** — server-side PDF rendering

### AI Layer
- **OpenCode Zen** as the LLM (API key + model name injected via environment variables)
- Raw HTTP POST to OpenCode Zen chat completions endpoint — no vendor SDK dependency
- Structured JSON-only prompt with retry logic (up to 3 attempts on malformed JSON)
- Response parsed and validated before storage (raw LLM output never exposed)

## Flow
1. Teacher fills form → POST /api/assignments
2. Job enqueued in BullMQ → immediate 202 response
3. Worker processes: fetch data → build prompt → call LLM → parse → save
4. Socket.IO pushes progress events to subscribed frontend
5. On completion → frontend navigates to output page

## Setup

### Prerequisites
- Node.js 20+
- Docker + Docker Compose (for MongoDB + Redis)

### Quick Start
git clone <repo>
cd vedaai

# Start infrastructure
docker-compose up -d mongodb redis

# Backend
cd apps/backend
cp .env.example .env  # fill OPENCODE_API_KEY and OPENCODE_MODEL
npm install
npm run dev

# Frontend (new terminal)
cd apps/frontend
cp .env.local.example .env.local
npm install
npm run dev

## Bonus Features Implemented
✅ PDF download via Puppeteer (server-side, properly formatted A4)
✅ Regenerate with version history (v1, v2...)
✅ Difficulty badge visualization + summary widget
✅ Voice input for instructions (Web Speech API)
✅ Per-question copy button
✅ Keyboard shortcuts (Ctrl+G, Ctrl+D, Ctrl+R)
✅ Mobile responsive layout
✅ Toast notification system
✅ Answer key toggle (teacher mode)
✅ Smart auto-title generation
