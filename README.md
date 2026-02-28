# Windows XP Web OS — Browser-Based Desktop Environment

A fully functional, browser-based recreation of the Windows XP desktop environment. Built from scratch during **Hack de Science — Ojass 2026** (36 hours) by **Team F9**.

Live Demo: _Deployed on Vercel (frontend) + Google Cloud Run (backend)_

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + Vite | SPA with component-based desktop shell |
| Styling | Vanilla CSS | Pixel-accurate XP theming, gradients, animations |
| Backend API | Node.js + Express 5 | RESTful API for auth, VFS, file ops, scores |
| AI Service | Python FastAPI | Clippy AI assistant powered by Gemini API |
| Database | PostgreSQL 15 (Cloud SQL) | User accounts, virtual file system tree, game scores |
| File Storage | Google Cloud Storage | Per-user file content stored as blobs |
| Deployment | Google Cloud Run | Backend + AI containerized and auto-scaled |
| Auth | JWT (stateless) | Token-based, no sessions, bcrypt password hashing |

---

## Features Implemented

### Desktop Shell
- XP-style **boot screen** with animated progress bar
- **Login screen** with user card selection (register + login)
- **Shutdown animation** with "Saving your settings" → "Shutting down" → "Safe to turn off" phases
- **Draggable desktop icons** with double-click to launch
- **Taskbar** with Start menu, system tray, clock, and theme switcher
- **Start Menu** with pinned apps, all programs, and system folders
- **Resizable, draggable windows** with minimize, maximize, close

### Applications
- **Notepad** — Full text editor with Save/Save As to virtual file system
- **Paint** — Canvas drawing tool (pencil, shapes, fill, eraser) with Save to VFS as PNG
- **File Explorer** — Browse, create, rename, delete files and folders
- **Calculator** — Standard calculator with keyboard support
- **Command Prompt** — 25+ working commands including `dir`, `cd`, `mkdir`, `tree`, `type`, `ping`, `ipconfig`, `systeminfo`, `color`, and more, with arrow-key command history
- **Internet Explorer** — Embedded web browser
- **Control Panel** — System information display

### Games (with Leaderboards)
- **Snake** — Classic snake game with scoring and per-user leaderboard
- **Minesweeper** — 10×10 grid, flag/reveal mechanics, timed with leaderboard (lowest time wins)
- **Solitaire** — Full Klondike solitaire with drag-to-place, double-click auto-move, and timed leaderboard

### AI Assistant
- **Clippy** — AI-powered assistant using Google Gemini API
- Deployed as a separate FastAPI microservice on Cloud Run
- Context-aware: receives desktop events (app opens, terminal commands)

### Virtual File System (VFS)
- PostgreSQL-backed tree structure (nodes = files/folders)
- Per-user isolation via `user_id` on every query
- Default folders created on registration: Desktop, My Documents, My Pictures, My Music
- Desktop auto-syncs every 10 seconds + on window focus
- File content stored in Google Cloud Storage with structured keys

### Authentication
- JWT-based stateless authentication (register + login)
- Passwords hashed with bcrypt (12 rounds)
- Token stored in localStorage, auto-attached via Axios interceptor
- Protected API routes via `verifyToken` middleware

---

## Architecture

```
┌──────────────┐        ┌──────────────┐        ┌──────────────────┐
│   Frontend   │──API──▶│   Backend    │──SQL──▶│  Cloud SQL       │
│  (React/Vite)│        │  (Express 5) │        │  (PostgreSQL 15) │
│   Vercel     │        │  Cloud Run   │        └──────────────────┘
└──────────────┘        │              │──GCS──▶┌──────────────────┐
                        │              │        │  Cloud Storage   │
                        └──────┬───────┘        │  (File Blobs)    │
                               │                └──────────────────┘
                               │ proxy
                        ┌──────▼───────┐
                        │  AI Backend  │
                        │  (FastAPI)   │
                        │  Cloud Run   │
                        └──────────────┘
```

---

## Project Structure

```
F9/
├── frontend/windows xp/     # React + Vite frontend
│   └── src/
│       ├── apps/             # Notepad, Paint, Snake, Minesweeper, Solitaire, Calculator, CMD
│       ├── components/       # Desktop, Taskbar, StartMenu, Window, LoginScreen, BootScreen
│       ├── context/          # AuthContext, WindowContext, ThemeContext
│       └── config/           # Desktop icon registry
├── backend/
│   ├── routes/               # auth.js, vfs.js, files.js, scores.js, clippy.js
│   ├── middleware/           # JWT verification
│   ├── ai-backend/           # FastAPI Clippy service (Dockerfile, main.py)
│   ├── storage.js            # GCS integration
│   ├── db.js                 # PostgreSQL connection pool
│   └── server.js             # Express app entry point
├── database/                 # SQL migration scripts
├── setup.sh                  # Dependency installer
├── web.sh                    # App startup script
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+ (for Clippy AI)
- PostgreSQL 15 (local or Cloud SQL)

### Quick Start

```bash
chmod +x setup.sh web.sh
./setup.sh        # Install all dependencies
./web.sh          # Start frontend + backend
```

### Environment Variables (`.env` at project root)
```
PORT=8000
JWT_SECRET=<your-secret>
DATABASE_URL=postgresql://user:pass@host:5432/dbname
GCS_BUCKET_NAME=<your-bucket>
GEMINI_API_KEY=<your-gemini-key>
```

---

## Easter Eggs 🥚

This project contains hidden Easter eggs as a shout-out to the **Ojass** organizing team:

1. **Konami Code** — On the Desktop, press `↑ ↑ ↓ ↓ ← → ← → B A` to trigger a popup thanking the Ojass team.
2. **Terminal: `ojass`** — Open the Command Prompt and type `ojass` to see an ASCII art tribute to Hack de Science — Ojass 2026.
3. **Terminal: `matrix`** — Type `matrix` in the Command Prompt to see a Matrix-themed message with the word "OJASS" encoded in binary.

---

## Known Issues

- **Cloud Run cold starts** — First request after inactivity takes 2-4s (container spin-up). Fix: set `--min-instances=1`.
- Clippy AI requires a valid Gemini API key in the environment.
- Internet Explorer window uses an iframe which may be blocked by some sites' CSP headers.

---

## Team

**Team F9** — Hack de Science, Ojass 2026

---
