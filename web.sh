#!/usr/bin/env bash
set -e # exit immediately on error

echo "=== Starting Windows XP Clone ==="

# Check if Docker Compose is available to run the containerized stack
if command -v docker-compose &> /dev/null
then
    echo "Starting application via Docker Compose..."
    docker-compose up -d
    
    echo "Waiting for services to start..."
    sleep 5
    echo "Server running at http://localhost:3000"
    echo "API server running at http://localhost:8000"
    exit 0
fi

# Fallback mechanism if Docker is not available
echo "Running application locally without Docker..."

# Start Backend
cd backend
npm run start &
BACKEND_PID=$!
cd ..

# Start Frontend
cd frontend
npm run start &
FRONTEND_PID=$!
cd ..

echo "Server running at http://localhost:3000"

# Wait for both processes
wait $BACKEND_PID
wait $FRONTEND_PID
