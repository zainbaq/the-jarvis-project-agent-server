# Jarvis Project Agent Server

A full-stack AI agent management platform that provides a unified API and web interface for interacting with multiple AI agents and LLM-based workflows.

## Overview

The Jarvis Agent Server enables you to:
- Chat with multiple AI agents (OpenAI, Azure, custom endpoints)
- Execute complex LangGraph workflows (code generation, document intelligence, web search)
- Manage conversations and uploaded files
- Connect to external knowledge bases for RAG-enhanced responses

## Features

### Multi-Agent Support
- **OpenAI Models**: GPT-4o, GPT-4, GPT-3.5 Turbo
- **Azure OpenAI**: Enterprise-grade integration
- **Custom Endpoints**: Any OpenAI-compatible API
- **LangGraph Workflows**: Complex multi-step agent pipelines

### Specialized Workflows
| Workflow | Description |
|----------|-------------|
| **Developer** | Generates complete projects with architecture, code, tests, and documentation |
| **Document Intelligence** | Analyzes PDFs, images, and documents with Q&A capabilities |
| **Web Search** | Performs web research with vector store integration |

### Tools & Integrations
- **Web Search**: Real-time internet search with RAG
- **File Search**: Vector-based semantic search across documents
- **Code Interpreter**: Execute code safely via E2B
- **Knowledge Base**: Connect to external knowledge systems

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Agent Framework**: LangGraph + LangChain
- **AI Providers**: OpenAI, Anthropic, Azure OpenAI
- **Vector Database**: ChromaDB
- **Language**: Python 3.8+

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI**: Tailwind CSS + shadcn/ui
- **State**: Zustand + React Query

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- OpenAI API key (or other provider keys)

### Backend Setup

```bash
# Create virtual environment and install dependencies
./setup_env.sh

# Or manually:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create environment file
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Run the server
uvicorn backend.app:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The web interface will be available at `http://localhost:5173`

## Configuration

### Environment Variables

Create `backend/.env` with:

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
ANTHROPIC_API_KEY=...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=...

# Server (defaults shown)
HOST=0.0.0.0
PORT=8000
DEBUG=True
ENVIRONMENT=development

# Workflow settings
LANGGRAPH_RECURSION_LIMIT=100
```

### Agent Configuration

Agents are defined in `backend/config/agents.json`:

```json
{
  "agent_id": "gpt4_assistant",
  "name": "GPT-4 Assistant",
  "type": "openai",
  "description": "General-purpose AI assistant",
  "config": {
    "api_key": "${OPENAI_API_KEY}",
    "model": "gpt-4o",
    "temperature": 0.7
  }
}
```

Environment variables can be referenced using `${VAR_NAME}` syntax.

## Project Structure

```
├── backend/
│   ├── agents/              # Agent implementations
│   │   ├── base.py          # BaseAgent abstract class
│   │   ├── openai_agent.py  # OpenAI integration
│   │   ├── endpoint_agent.py # Custom endpoint support
│   │   ├── langgraph_agent.py # Workflow agents
│   │   └── registry.py      # Agent lifecycle management
│   │
│   ├── workflows/           # LangGraph workflows
│   │   ├── developer/       # Code generation workflow
│   │   ├── document_intelligence/
│   │   └── web_search/
│   │
│   ├── routers/             # API endpoints
│   ├── tools/               # AI tools (web search, file search)
│   ├── services/            # Business logic
│   ├── models/              # Request/Response schemas
│   ├── config/              # Configuration files
│   └── app.py               # FastAPI application
│
├── frontend/
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── types/           # TypeScript interfaces
│   │   └── styles/          # Tailwind config
│   └── package.json
│
└── docs/                    # Documentation
```

## API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/status` | Detailed status with agent info |
| GET | `/api/agents` | List all available agents |
| GET | `/api/agents/{agent_id}` | Get specific agent details |
| POST | `/api/agents/{agent_id}/chat` | Send a chat message |
| POST | `/api/agents/{agent_id}/workflow` | Execute a workflow |
| POST | `/api/agents/{agent_id}/test` | Test agent connection |

### Chat Request Example

```bash
curl -X POST http://localhost:8000/api/agents/gpt4_assistant/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how can you help me?",
    "conversation_id": "conv_123",
    "enable_web_search": false
  }'
```

### Workflow Execution Example

```bash
curl -X POST http://localhost:8000/api/agents/developer_workflow/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Create a FastAPI todo application with SQLite",
    "task_id": "task_456",
    "parameters": {
      "recursion_limit": 100
    }
  }'
```

## Development

### Running Tests

```bash
# Start the server first
uvicorn backend.app:app --reload

# Run endpoint tests
python backend/testing/test_endpoints.py
```

### Adding a New Agent Type

1. Create agent class in `backend/agents/` inheriting from `BaseAgent`
2. Implement required methods: `initialize()`, `query()`, `cleanup()`, `get_type()`
3. Register the type in `registry.py`'s `_create_agent()` method
4. Add configuration to `backend/config/agents.json`

### Adding a New Workflow

1. Create workflow directory in `backend/workflows/`
2. Implement:
   - `states.py` - State schema (TypedDict)
   - `steps.py` - Node functions
   - `graphs.py` - Graph structure
   - `tasks.py` - Entry point with `perform_task()` and `get_description()`
3. Add LangGraph agent to `config/agents.json`

## Architecture

### Chat Flow
```
Frontend → POST /api/agents/{id}/chat → AgentManager
                                            ↓
                                    Execute Tools (if enabled)
                                            ↓
                                    Augment Prompt with Results
                                            ↓
                                    Agent.query()
                                            ↓
                                    Return Response
```

### Workflow Flow
```
Frontend → POST /api/agents/{id}/workflow → WorkflowAgent
                                                ↓
                                        Compile LangGraph
                                                ↓
                                        Execute Nodes (state machine)
                                                ↓
                                        Report Progress
                                                ↓
                                        Return Results
```

## License

This project is private and proprietary.
