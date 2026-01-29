# Deployment Guide

This guide covers deploying the Jarvis Project Agent Server with the Next.js frontend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         nginx                                │
│                    (SSL termination)                         │
│                     Port 443 (HTTPS)                         │
├─────────────────────────────────────────────────────────────┤
│                            │                                 │
│         /api/*             │            /*                   │
│            │               │             │                   │
│            ▼               │             ▼                   │
│    ┌───────────────┐       │     ┌───────────────┐          │
│    │    Backend    │       │     │   Frontend    │          │
│    │   (FastAPI)   │       │     │   (Next.js)   │          │
│    │   Port 3000   │       │     │   Port 8000   │          │
│    └───────────────┘       │     └───────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Backend (FastAPI) | 3000 | API server, agent management |
| Frontend (Next.js) | 8000 | Web UI |
| nginx | 80/443 | Reverse proxy, SSL termination |

## Local Development

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm

### Setup

1. **Backend setup:**
   ```bash
   # Create virtual environment
   ./setup_env.sh

   # Or manually:
   python3 -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   ```

2. **Frontend setup:**
   ```bash
   cd next
   npm install
   ```

3. **Environment configuration:**

   Create `backend/.env`:
   ```bash
   OPENAI_API_KEY=your_key_here
   # Add other API keys as needed
   ```

   Create `next/.env.local`:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000
   BACKEND_URL=http://127.0.0.1:3000
   NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
   ```

### Running Locally

**Option 1: Use start script**
```bash
./start.sh
```
This starts both backend (port 3000) and frontend (port 8000).

**Option 2: Run separately**
```bash
# Terminal 1 - Backend
source venv/bin/activate
uvicorn backend.app:app --reload --host 0.0.0.0 --port 3000

# Terminal 2 - Frontend
cd next
npm run dev -- -p 8000
```

**Stop services:**
```bash
./stop.sh
```

### Access Points (Local)
- Frontend: http://localhost:8000
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/docs

## Production Deployment (EC2)

### Prerequisites
- EC2 instance (Amazon Linux 2 or Ubuntu)
- nginx installed
- Node.js 18+ installed
- Python 3.8+ installed
- Domain name (optional, for SSL)

### Initial Deployment

1. **Clone the repository:**
   ```bash
   cd /home/ec2-user  # or /home/ubuntu
   git clone <repository-url> the-jarvis-project-agent-server
   cd the-jarvis-project-agent-server
   ```

2. **Configure backend environment:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys
   ```

3. **Configure frontend environment:**
   ```bash
   cat > next/.env.local << 'EOF'
   NEXT_PUBLIC_API_URL=https://your-domain.com
   BACKEND_URL=http://127.0.0.1:3000
   NEXT_PUBLIC_BACKEND_URL=https://your-domain.com
   EOF
   ```

   Replace `your-domain.com` with your actual domain or public IP.

4. **Run the install script:**
   ```bash
   cd deploy
   sudo ./install.sh
   ```

   This will:
   - Set up Python virtual environment
   - Install backend dependencies
   - Build the Next.js frontend
   - Install systemd services for backend and frontend
   - Configure nginx

### Systemd Services

The install script creates two systemd services:

**jarvis-backend.service** - FastAPI backend
```bash
sudo systemctl status jarvis-backend
sudo systemctl start jarvis-backend
sudo systemctl stop jarvis-backend
sudo systemctl restart jarvis-backend
sudo journalctl -u jarvis-backend -f  # View logs
```

**jarvis-frontend.service** - Next.js frontend
```bash
sudo systemctl status jarvis-frontend
sudo systemctl start jarvis-frontend
sudo systemctl stop jarvis-frontend
sudo systemctl restart jarvis-frontend
sudo journalctl -u jarvis-frontend -f  # View logs
```

### Updating Deployment

After pulling new code:

```bash
cd /home/ec2-user/the-jarvis-project-agent-server
git pull origin main

# Rebuild frontend
cd next
sudo systemctl stop jarvis-frontend
sudo rm -rf .next
npm install  # If dependencies changed
npm run build
sudo systemctl start jarvis-frontend

# Restart backend (if backend code changed)
sudo systemctl restart jarvis-backend
```

### Uninstalling

```bash
cd deploy
sudo ./uninstall.sh
```

This removes systemd services and nginx configuration but preserves project files.

## SSL/HTTPS Configuration

### With Let's Encrypt (Certbot)

1. **Install certbot:**
   ```bash
   # Amazon Linux 2
   sudo amazon-linux-extras install epel
   sudo yum install certbot python3-certbot-nginx

   # Ubuntu
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain certificate:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Configure nginx for SSL:**

   Create/edit `/etc/nginx/conf.d/jarvis-ssl.conf`:
   ```nginx
   server {
       server_name your-domain.com;

       # Timeouts for long-running requests
       proxy_connect_timeout 600s;
       proxy_send_timeout 600s;
       proxy_read_timeout 600s;
       keepalive_timeout 600s;

       # API requests → backend on port 3000
       location /api/ {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_cache_bypass $http_upgrade;

           # SSE streaming support
           proxy_buffering off;
           proxy_read_timeout 86400;
       }

       # Everything else → frontend on port 8000
       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_cache_bypass $http_upgrade;
       }

       listen 443 ssl;
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       include /etc/letsencrypt/options-ssl-nginx.conf;
       ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
   }

   # Redirect HTTP to HTTPS
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$host$request_uri;
   }
   ```

4. **Update frontend environment:**
   ```bash
   cat > next/.env.local << 'EOF'
   NEXT_PUBLIC_API_URL=https://your-domain.com
   BACKEND_URL=http://127.0.0.1:3000
   NEXT_PUBLIC_BACKEND_URL=https://your-domain.com
   EOF
   ```

5. **Rebuild and restart:**
   ```bash
   cd next
   sudo systemctl stop jarvis-frontend
   sudo rm -rf .next
   npm run build
   sudo systemctl start jarvis-frontend
   sudo nginx -t && sudo systemctl reload nginx
   ```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `DEBUG` | Debug mode | `True` |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |

### Frontend (`next/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL for browser API calls | `https://your-domain.com` |
| `BACKEND_URL` | URL for server-side proxy | `http://127.0.0.1:3000` |
| `NEXT_PUBLIC_BACKEND_URL` | URL for SSE streaming | `https://your-domain.com` |

**Important:** `NEXT_PUBLIC_*` variables are embedded at build time and must be set before running `npm run build`.

## Troubleshooting

### Frontend shows "Offline" / Not connecting

1. **Check services are running:**
   ```bash
   sudo systemctl status jarvis-backend jarvis-frontend
   ```

2. **Test backend health:**
   ```bash
   curl http://127.0.0.1:3000/api/health
   ```

3. **Test frontend proxy:**
   ```bash
   curl http://127.0.0.1:8000/api/health
   ```

4. **Check browser console for errors** - Look for:
   - Mixed content errors (HTTP vs HTTPS mismatch)
   - CORS errors
   - Network errors

### Mixed Content Errors

If you see "Blocked loading mixed active content", your `.env.local` URLs don't match how you're accessing the site.

- Accessing via HTTPS? Use `https://` in all `NEXT_PUBLIC_*` URLs
- Accessing via HTTP? Use `http://` in all `NEXT_PUBLIC_*` URLs

### Permission Errors on Build

If `npm run build` fails with permission errors:
```bash
sudo systemctl stop jarvis-frontend
sudo rm -rf next/.next
sudo chown -R $(whoami):$(whoami) next/
npm run build
sudo systemctl start jarvis-frontend
```

### crypto.randomUUID Error

If you see "crypto.randomUUID is not a function", this happens when accessing via HTTP on a public IP (non-secure context). The code has been updated with a fallback, but ensure you're using the latest version.

### SSE Streaming Not Working

Ensure nginx has buffering disabled for API routes:
```nginx
location /api/ {
    proxy_buffering off;
    proxy_read_timeout 86400;
    # ... other settings
}
```

### View Logs

```bash
# Backend logs
sudo journalctl -u jarvis-backend -f

# Frontend logs
sudo journalctl -u jarvis-frontend -f

# nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Security Considerations

1. **Always use HTTPS in production** - Use Let's Encrypt for free SSL certificates
2. **Restrict CORS origins** - Set specific origins in `backend/.env` instead of `*`
3. **Secure API keys** - Never commit `.env` files; use `.env.example` as a template
4. **Firewall rules** - Only expose ports 80 and 443; keep 3000 and 8000 internal
5. **Keep dependencies updated** - Regularly run `pip install --upgrade` and `npm update`
