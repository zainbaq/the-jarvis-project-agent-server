#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CURRENT_USER=$(whoami)
PROJECT_NAME="the-jarvis-project-agent-server"

echo "========================================"
echo "Installing Jarvis Project Services"
echo "========================================"
echo "Project directory: $PROJECT_DIR"
echo "User: $CURRENT_USER"
echo ""

# Detect actual project path
ACTUAL_PROJECT_PATH="$PROJECT_DIR"

# Create temp copies to modify
cp "$SCRIPT_DIR/jarvis-backend.service" "$SCRIPT_DIR/jarvis-backend.service.tmp"
cp "$SCRIPT_DIR/nginx-jarvis.conf" "$SCRIPT_DIR/nginx-jarvis.conf.tmp"

# Update paths in service files
sed -i "s|/home/ubuntu/the-jarvis-project-agent-server|$ACTUAL_PROJECT_PATH|g" "$SCRIPT_DIR/jarvis-backend.service.tmp"
sed -i "s|User=ubuntu|User=$CURRENT_USER|g" "$SCRIPT_DIR/jarvis-backend.service.tmp"
sed -i "s|/home/ubuntu/the-jarvis-project-agent-server|$ACTUAL_PROJECT_PATH|g" "$SCRIPT_DIR/nginx-jarvis.conf.tmp"

# Check if venv exists
if [ ! -d "$PROJECT_DIR/venv" ]; then
    echo "Setting up Python virtual environment..."
    cd "$PROJECT_DIR"
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r backend/requirements.txt
else
    echo "Virtual environment already exists"
fi

# Build frontend
echo ""
echo "Building frontend..."
cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
echo "Frontend build complete"

# Install systemd service
echo ""
echo "Installing systemd service..."
sudo cp "$SCRIPT_DIR/jarvis-backend.service.tmp" /etc/systemd/system/jarvis-backend.service
sudo systemctl daemon-reload
sudo systemctl enable jarvis-backend
sudo systemctl start jarvis-backend
echo "Backend service installed and started"

# Install nginx config
echo ""
echo "Installing nginx configuration..."
sudo cp "$SCRIPT_DIR/nginx-jarvis.conf.tmp" /etc/nginx/sites-available/jarvis
sudo ln -sf /etc/nginx/sites-available/jarvis /etc/nginx/sites-enabled/

# Test nginx config
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "Nginx configuration installed and reloaded"
else
    echo "ERROR: Nginx configuration test failed!"
    exit 1
fi

# Cleanup temp files
rm -f "$SCRIPT_DIR/jarvis-backend.service.tmp"
rm -f "$SCRIPT_DIR/nginx-jarvis.conf.tmp"

echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "Services:"
echo "  Backend:  http://localhost:3000 (systemd: jarvis-backend)"
echo "  Frontend: http://localhost:8000 (nginx)"
echo "  API Docs: http://localhost:3000/docs"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status jarvis-backend"
echo "  sudo systemctl restart jarvis-backend"
echo "  sudo systemctl stop jarvis-backend"
echo "  sudo journalctl -u jarvis-backend -f"
echo ""
