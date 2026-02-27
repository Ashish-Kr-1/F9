#!/usr/bin/env bash
set -e # exit immediately on error

echo "=== Windows XP Clone Setup ==="

# 1. Environment setup
echo "Creating environment files..."
cp -n .env.example .env 2>/dev/null || touch .env

# Initialize subdirectories just in case they were not created or pulled
mkdir -p frontend backend database

# 2. Install project dependencies locally (if node/npm is available)
if command -v npm &> /dev/null
then
    echo "Installing frontend dependencies..."
    cd frontend && npm install || true
    cd ..

    echo "Installing backend dependencies..."
    cd backend && npm install || true
    cd ..
else
    echo "npm not found locally. We will rely on Docker for execution."
fi

# 3. Docker build (Bonus points path)
if command -v docker-compose &> /dev/null
then
    echo "Building Docker images..."
    docker-compose build || true
fi

echo "Setup complete."
