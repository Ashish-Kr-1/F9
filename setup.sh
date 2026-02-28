#!/bin/bash
# setup.sh — Install all project dependencies
# Run this from the project root: ./setup.sh

set -e

echo "======================================"
echo "  Windows XP Web OS — Setup"
echo "======================================"
echo ""

# Backend dependencies
echo "[1/3] Installing backend dependencies..."
cd backend
npm install
cd ..

# AI Backend dependencies (Python)
echo "[2/3] Installing AI backend dependencies..."
if command -v python3 &> /dev/null; then
    cd backend/ai-backend
    pip3 install -r requirements.txt 2>/dev/null || pip install -r requirements.txt
    cd ../..
    echo "  ✓ AI backend dependencies installed"
else
    echo "  ⚠ Python3 not found — Clippy AI will not be available"
fi

# Frontend dependencies
echo "[3/3] Installing frontend dependencies..."
cd "frontend/windows xp"
npm install
cd ../..

echo ""
echo "======================================"
echo "  Setup complete!"
echo "  Run ./web.sh to start the application"
echo "======================================"
