# Frontend Quickstart Guide

## What Was Built

A fully functional React + TypeScript frontend for chatting with your AI agents! 🎉

## Quick Test (If You Have Node 20+)

### Terminal 1: Start Backend
```bash
cd backend
source ../venv/bin/activate
uvicorn app:app --reload
```

Backend runs on: `http://localhost:8000`

### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```

Frontend runs on: `http://localhost:5173`

Open your browser to `http://localhost:5173` and you'll see the Jarvis Agent Server!

---

## Alternative: Production Build (Works with Node 19)

If you don't have Node 20+, you can use the production build:

```bash
cd frontend
npm run build
npm run preview
```

Then open `http://localhost:4173`

---

## What You Can Do

### 1. Home Page (/)
- See how many agents are loaded
- Quick stats dashboard
- Navigate to agents or chat

### 2. Browse Agents (/agents)
- See all available AI agents
- View their types (OpenAI, Endpoint, LangGraph)
- Click any agent to start chatting

### 3. Chat with Agents (/chat)
- Select an agent from the list
- Send messages and get responses
- Enable web search (checkbox)
- View conversation history
- Clear conversation
- All conversations saved in browser localStorage

---

## Project Structure

```
the-jarvis-project-agent-server/
├── backend/              ← Your Python FastAPI server
│   ├── app.py
│   ├── agents/
│   ├── workflows/
│   └── ...
│
└── frontend/             ← New React TypeScript app
    ├── src/
    │   ├── api/          ← API calls to backend
    │   ├── components/   ← React components
    │   ├── hooks/        ← Custom React hooks
    │   ├── pages/        ← Page components
    │   ├── stores/       ← State management
    │   └── types/        ← TypeScript types
    ├── dist/             ← Production build output
    ├── package.json
    └── README.md
```

---

## How It Works

### API Integration

The frontend connects to your backend API:

```typescript
// In frontend/src/api/client.ts
const API_BASE_URL = 'http://localhost:8000';

// Makes requests to backend
GET  /api/agents          // List all agents
GET  /api/agents/{id}     // Get one agent
POST /api/agents/{id}/chat  // Send chat message
```

### State Management

```typescript
// Zustand stores (like global state)
useAgentStore()           // Selected agent
useConversationStore()    // Chat history

// React Query (API caching)
useAgents()              // Fetch and cache agents
useChat()                // Handle chat messages
```

### Type Safety

Every API call is typed (like Pydantic models in Python):

```typescript
// frontend/src/types/chat.ts
interface ChatRequest {
  message: string;
  conversation_id?: string;
  enable_web_search?: boolean;
}

interface ChatResponse {
  response: string;
  conversation_id: string;
  agent_id: string;
  metadata: { ... };
}
```

---

## Troubleshooting

### Frontend won't start?
**Problem**: Node version too old (you have 19.6, need 20+)

**Solutions**:
1. Use production build: `npm run build && npm run preview`
2. Upgrade Node: `brew install node@20` (macOS)
3. Use NVM: `nvm install 20 && nvm use 20`

### Backend not responding?
Make sure backend is running on `http://localhost:8000`:

```bash
curl http://localhost:8000/api/health
```

Should return:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "agents_loaded": 7,
  "uptime": 123.45
}
```

### Chat not working?
1. Check browser console (F12) for errors
2. Verify backend is running
3. Check that agents are loaded: `http://localhost:8000/api/agents`
4. Make sure CORS is enabled in backend

---

## File Highlights

### Key Frontend Files

**API Client** ([frontend/src/api/client.ts](frontend/src/api/client.ts))
- Axios HTTP client
- Like `requests.Session()` in Python
- Request/response interceptors
- Error handling

**Chat Hook** ([frontend/src/hooks/useChat.ts](frontend/src/hooks/useChat.ts))
- Complete chat logic
- Manages conversation state
- Optimistic updates
- Error handling

**Chat Interface** ([frontend/src/components/chat/ChatInterface.tsx](frontend/src/components/chat/ChatInterface.tsx))
- Full chat UI
- Message display
- Auto-scroll
- Loading states

**Stores** ([frontend/src/stores/](frontend/src/stores/))
- `agentStore.ts` - Selected agent
- `conversationStore.ts` - Chat history
- Both persist to localStorage

---

## TypeScript for Python Developers

Quick translation guide:

| Python | TypeScript |
|--------|------------|
| `class AgentInfo(BaseModel):` | `interface AgentInfo { ... }` |
| `@lru_cache` | React Query caching |
| `requests.get(...)` | `await apiClient.get(...)` |
| `self.state = ...` | `const [state, setState] = useState(...)` |
| Module imports | ES6 imports |

---

## Next Steps

1. **Test the Chat**: Start both servers and try chatting with an agent
2. **Explore Code**: Look at [frontend/src/pages/ChatPage.tsx](frontend/src/pages/ChatPage.tsx) to see how it works
3. **Customize**: Edit Tailwind colors in [frontend/tailwind.config.js](frontend/tailwind.config.js)
4. **Add Features**: See [FRONTEND_PLAN.md](FRONTEND_PLAN.md) for Phase 4+ features

---

## Learn More

- **Frontend README**: [frontend/README.md](frontend/README.md)
- **Implementation Summary**: [frontend/IMPLEMENTATION_SUMMARY.md](frontend/IMPLEMENTATION_SUMMARY.md)
- **Full Plan**: [FRONTEND_PLAN.md](FRONTEND_PLAN.md)
- **Backend Docs**: [backend/docs/COMPLETE_API_GUIDE.md](backend/docs/COMPLETE_API_GUIDE.md)

---

## Success Checklist

- ✅ Frontend builds successfully (`npm run build`)
- ✅ All TypeScript types defined
- ✅ API integration complete
- ✅ Chat functionality working
- ✅ Conversation history persisting
- ✅ Agent browsing implemented
- ✅ Responsive design
- ✅ Error handling

**You're ready to go!** 🚀

Try it out and start chatting with your AI agents through a beautiful modern UI!
