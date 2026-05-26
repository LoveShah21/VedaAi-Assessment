# VedaAI — AI Assessment Creator

An intelligent, full-stack assessment generation platform powered by **OpenCode Zen**. Teachers provide source material and configuration, and VedaAI generates a complete, print-ready assessment with an answer key in seconds.

---

## 🏗 Monorepo Structure

```
vedaAi/
├── apps/
│   ├── backend/          # Express + TypeScript API server
│   └── frontend/         # Next.js 14 App Router UI
├── docker-compose.yml    # MongoDB + Redis services
├── .prettierrc           # Shared Prettier config
└── README.md
```

---

## ✅ Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20+ |
| npm | 9+ |
| MongoDB | 6+ (or Docker) |
| Redis | 7+ (or Docker) |
| OpenCode API key | Any tier |

---

## 🚀 Quick Setup

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd vedaAi

# Install backend dependencies
cd apps/backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure environment variables

```bash
# Backend
cd apps/backend
cp .env.example .env
# Edit .env and fill in your OPENCODE_API_KEY, OPENCODE_MODEL and other values

# Frontend
cd ../frontend
cp .env.example .env.local
# Edit .env.local if needed
```

### 3. Start infrastructure (MongoDB + Redis via Docker)

```bash
# From repo root
docker-compose up -d
```

Or run MongoDB and Redis locally on their default ports.

### 4. Run development servers

```bash
# Backend (port 5000)
cd apps/backend
npm run dev

# Frontend (port 3000) — in a new terminal
cd apps/frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏛 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Next.js 14 Frontend               │
│       App Router · React Server Components          │
│       Socket.IO client · Real-time progress UI      │
└────────────────────┬────────────────────────────────┘
                     │ HTTP + WebSocket
┌────────────────────▼────────────────────────────────┐
│              Express API Server (port 5000)          │
│  Controllers · BullMQ Queues · Socket.IO server     │
│                                                     │
│  ┌──────────────┐   ┌──────────────────────────┐   │
│  │   MongoDB    │   │   Redis (BullMQ + Cache)  │   │
│  │  Assignments │   │  Job queues · Result TTL  │   │
│  │  Results     │   │  job:status:{id} (24h)    │   │
│  │  Activity    │   └──────────────────────────┘   │
│  └──────────────┘                                   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │         BullMQ Generation Worker             │   │
│  │  OpenCode Zen API → Questions → PDF export  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### AI Integration Layer
All assessment generating queries are resolved through raw `HTTP` requests sent directly to the **OpenCode Zen** completion engine at `https://api.opencode.ai/v1/chat/completions`. No vendor SDKs are used. A three-tier validation check ensures JSON compliance with 3 automatic retries for structural failures.

---

## ✨ Key Features

- **AI-powered question generation** via OpenCode Zen — MCQ, Short Answer, Essay, Numerical Problems, Diagram-Based, and more
- **File upload support** — PDF, DOCX, TXT source material parsed and fed to OpenCode Zen
- **Real-time progress** — Socket.IO events stream job status from worker to UI
- **PDF generation** — Print-ready A4 assessment with optional answer key and structural details
- **Duplicate & Regenerate** — One-click duplication or regeneration of existing assessments
- **Redis job tracking** — `job:status:{id}` cached in Redis with 24 h TTL for instant status polling
- **Soft delete** — Assignments are never hard-deleted; `deleted: true` flag used throughout
- **Activity log** — Every create, regenerate, download, and delete is logged for audit

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/assignments` | List all assignments |
| `POST` | `/api/assignments` | Create assignment (triggers generation) |
| `DELETE` | `/api/assignments/all` | Wipe all assignments (Danger Zone) |
| `GET` | `/api/assignments/stats/summary` | Dashboard stats |
| `GET` | `/api/assignments/:id` | Get assignment by ID |
| `GET` | `/api/assignments/:id/results` | Get result version history |
| `DELETE` | `/api/assignments/:id` | Soft-delete assignment |
| `POST` | `/api/assignments/:id/duplicate` | Duplicate assignment |
| `GET` | `/api/results/:id` | Get standalone result by ID |
| `GET` | `/api/results/:id/pdf` | Stream assessment PDF |
| `GET` | `/api/settings` | Get user settings |
| `PUT` | `/api/settings` | Update user settings |
| `GET` | `/health` | Health check |

---

## 🌟 Bonus Features Implemented

The following secondary and tertiary workflows have been completely implemented and verified:

- [x] **Cloudflare R2 Integration**: Safe S3-compatible cloud storage for file uploads instead of volatile server storage.
- [x] **Zod Request Parsing**: Backend integration schemas mapped to strictly validate assignment formats during `POST` actions.
- [x] **Typed Deletion Confirmations**: Modals in Settings requiring explicit `"DELETE"` keystrokes before executing server-wide database wipes.
- [x] **Keyboard Hotkeys**: Output pages support fully mapped keyboard listeners (`Ctrl+G` for Regenerate, `Ctrl+D` for PDF Download).
- [x] **Answer Key Toggles**: Dynamic floating UI and Puppeteer templates supporting conditional, seamless, high-fidelity PDF output.
- [x] **Skeleton Shimmer divs**: Instant placeholder visual state transitions applied during lazy data loading or version switches.
- [x] **Inline Copied Indicators**: Local tooltips providing context-preserving feedback to teachers copying questions to their clipboards.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Express 4, TypeScript, Node.js 20 |
| Database | MongoDB 6 (Mongoose ODM) |
| Cache / Queue | Redis 7, BullMQ |
| Storage | Cloudflare R2 Storage (AWS S3 SDK) |
| AI | OpenCode Zen (Axios POST) |
| Real-time | Socket.IO |
| PDF | Puppeteer A4 PDF Export |
| Containerization | Docker Compose |
