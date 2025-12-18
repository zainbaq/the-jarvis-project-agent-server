#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting Jarvis Project...${NC}"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Virtual environment not found. Run ./setup_env.sh first${NC}"
    exit 1
fi

# Activate venv
source venv/bin/activate

# Trap to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${GREEN}Starting backend on port 3000...${NC}"
uvicorn backend.app:app --reload --host 0.0.0.0 --port 3000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo -e "${GREEN}Starting frontend on port 8000...${NC}"
cd frontend && npm run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

echo ""
echo -e "${GREEN}Services started!${NC}"
echo "Backend:  http://localhost:3000"
echo "Frontend: http://localhost:8000"
echo "API Docs: http://localhost:3000/docs"
echo ""
echo "Press Ctrl+C to stop"

wait
