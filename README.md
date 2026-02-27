# Windows XP Clone - Hackathon Project
![XP Screenshot Placeholder](https://via.placeholder.com/800x400?text=Windows+XP+Clone)

A fully functional, browser-based clone of the Windows XP desktop environment built for Hack de Science Ojass 2026.

## Teams and Roles
This project implements a monorepo structure, tailored for a specialized team breakdown:
- **UI Team**: Focuses on the `frontend/` directory (React/Next.js/HTML-CSS-JS) to ensure XP UI Fidelity, desktop wallpaper, taskbar, Start menu, draggable/resizable windows, and Clippy UI.
- **Backend & Logic Team**: Focuses on `backend/` directory for APIs implementing the File Manager, Notepad operations, and Windows Games (Minesweeper, Solitaire, etc.).
- **Database & Auth Team**: Focuses on `database/` and authentication routes within the `backend/` to ensure user registration, session management, and persistent file storage per user.

## Project Structure
```
.
├── frontend/             # Frontend application (UI, Desktop, Apps)
├── backend/              # Backend server (APIs, Game Logic, Settings)
├── database/             # Database initialization scripts and schemas
├── docker-compose.yml    # Docker services orchestration
├── setup.sh              # Dependency installer and scaffolding script
└── web.sh                # Application startup script
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose (optional but recommended for DB)

### Setup & Run
Run the required hackathon scripts from the root directory:

```bash
chmod +x setup.sh web.sh
./setup.sh
```

To start the application:
```bash
./web.sh
```

## Contributing
Please refer to `CONTRIBUTING.md` for branching strategies and commit guidelines to prevent merge conflicts.
