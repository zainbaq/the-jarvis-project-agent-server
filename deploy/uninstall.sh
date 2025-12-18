#!/bin/bash

echo "========================================"
echo "Uninstalling Jarvis Project Services"
echo "========================================"

# Stop and disable backend service
echo "Stopping backend service..."
sudo systemctl stop jarvis-backend 2>/dev/null || true
sudo systemctl disable jarvis-backend 2>/dev/null || true
sudo rm -f /etc/systemd/system/jarvis-backend.service
sudo systemctl daemon-reload
echo "Backend service removed"

# Remove nginx config
echo "Removing nginx configuration..."
sudo rm -f /etc/nginx/sites-enabled/jarvis
sudo rm -f /etc/nginx/sites-available/jarvis

# Test and reload nginx
if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    echo "Nginx configuration removed and reloaded"
else
    echo "WARNING: Nginx configuration test failed after removal"
fi

echo ""
echo "========================================"
echo "Uninstall Complete!"
echo "========================================"
echo ""
echo "Note: The project files, venv, and frontend build were NOT removed."
echo "To completely remove, delete the project directory manually."
