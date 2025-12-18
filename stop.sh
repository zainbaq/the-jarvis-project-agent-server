#!/bin/bash

echo "Stopping Jarvis services..."

# Kill processes by port
if command -v lsof &> /dev/null; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
else
    # Fallback using fuser
    fuser -k 3000/tcp 2>/dev/null || true
    fuser -k 8000/tcp 2>/dev/null || true
fi

echo "Services stopped"
