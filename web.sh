#!/bin/bash
# web.sh — Start the Windows XP Web OS application
# Run this from the project root: ./web.sh

set -e

echo "======================================"
echo "  Windows XP Web OS — Starting..."
echo "======================================"
echo ""

# Start backend
echo "[1/2] Starting backend API server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Start AI backend if Python available
if command -v python3 &> /dev/null && [ -f "backend/ai-backend/main.py" ]; then
    echo "  Starting AI backend (Clippy)..."
    cd backend/ai-backend
    python3 -m uvicorn main:app --host 0.0.0.0 --port 5001 &
    AI_PID=$!
    cd ../..
fi

# Start frontend
echo "[2/2] Starting frontend dev server..."
cd "frontend/windows xp"
npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "======================================"
echo "  All services started!"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8000"
echo "  AI:        http://localhost:5001"
echo "======================================"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for any process to exit, then kill all
trap "kill $BACKEND_PID $AI_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
