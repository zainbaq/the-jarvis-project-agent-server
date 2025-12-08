# Jarvis Agent Server - Frontend

Modern React + TypeScript frontend for the Jarvis Agent Server.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

The dev server runs on `http://localhost:5173` by default.

**IMPORTANT:** Make sure the backend server is running on `http://localhost:8000` before starting the frontend.

## Project Structure

```
src/
├── api/          # API client and endpoints
├── components/   # React components
├── hooks/        # Custom React hooks
├── stores/       # Zustand state stores
├── pages/        # Page components
├── lib/          # Utilities and constants
└── types/        # TypeScript type definitions
```

## Technology Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Client-side routing
- **React Query** - Server state management
- **Zustand** - Client state management
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

## Features

- Chat with multiple AI agents
- Browse and select agents
- Conversation history (stored in localStorage)
- Web search integration
- Responsive design
- Type-safe API integration

## Environment Variables

Already configured in `.env.development`:

```bash
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Jarvis Agent Server
VITE_APP_VERSION=1.0.0
```

## Building for Production

```bash
npm run build
```

Output will be in the `dist/` directory. Serve it with any static file server.

## TypeScript for Python Developers

If you're coming from Python, here are some parallels:

- **Interfaces** = Pydantic models (type definitions)
- **React Query** = Cached API calls (like @lru_cache for async)
- **Zustand** = Global state (like module-level variables but reactive)
- **Axios** = requests library
- **useEffect** = Code that runs on component mount/update
- **useState** = Local component state (like class instance variables)
