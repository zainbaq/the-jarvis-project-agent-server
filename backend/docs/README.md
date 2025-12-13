# Jarvis Agent Server API Documentation

Welcome to the comprehensive API documentation for the Jarvis Agent Server - a unified platform for serving multiple AI agent types including conversational assistants, custom endpoint integrations, and complex workflow-based agents.

## Table of Contents

### Getting Started
- [Quick Start Guide](QUICKSTART.md) - Get up and running in 15 minutes
- [Configuration Guide](CONFIGURATION.md) - Server setup and agent configuration

### API Documentation
- [API Reference](API_REFERENCE.md) - Complete endpoint documentation
- [Request & Response Models](REQUEST_RESPONSE_MODELS.md) - Data schemas and validation

### Agent Types
- [Agent Types Guide](AGENT_TYPES.md) - Detailed guide to OpenAI, Endpoint, and LangGraph agents
- [Workflows Guide](WORKFLOWS.md) - LangGraph workflow documentation

### Advanced Features
- [Tools & Features](TOOLS_AND_FEATURES.md) - Web search, progress tracking, and more
- [Frontend Integration](FRONTEND_INTEGRATION.md) - Building clients and UIs

---

## Quick Links

### For Frontend Developers
Start here if you're building a client application:
1. [Quick Start](QUICKSTART.md) - Basic setup
2. [API Reference](API_REFERENCE.md) - All endpoints
3. [Frontend Integration](FRONTEND_INTEGRATION.md) - Client examples and patterns
4. [Request/Response Models](REQUEST_RESPONSE_MODELS.md) - Type definitions

### For Backend Developers
Start here if you're extending the platform:
1. [Agent Types](AGENT_TYPES.md) - Understanding agent architecture
2. [Configuration](CONFIGURATION.md) - Adding new agents
3. [Workflows](WORKFLOWS.md) - Creating custom workflows
4. [Tools & Features](TOOLS_AND_FEATURES.md) - Internal systems

### For DevOps Engineers
Start here if you're deploying the service:
1. [Quick Start](QUICKSTART.md) - Installation and setup
2. [Configuration](CONFIGURATION.md) - Environment variables and deployment
3. [API Reference](API_REFERENCE.md) - Health monitoring endpoints

---

## Overview

The Jarvis Agent Server provides a **unified RESTful API** for interacting with multiple types of AI agents:

### Agent Types

#### 1. OpenAI Agents
Direct integration with OpenAI's API for conversational assistants.
- Simple chat interactions
- Conversation history management
- Multiple model support (GPT-4, GPT-3.5 Turbo)

#### 2. Endpoint Agents
Integration with any OpenAI-compatible API endpoint.
- Azure OpenAI Service support
- Custom LLM deployments
- Flexible configuration

#### 3. LangGraph Agents
Complex, multi-step workflow execution.
- Code generation workflows
- Research and analysis workflows
- Custom workflow creation

### Key Features

- **14 RESTful Endpoints** - Comprehensive API coverage
- **Web Search Integration** - Serper API + vector storage
- **Progress Tracking** - Real-time workflow progress monitoring
- **Conversation Management** - Per-agent conversation history
- **Tool Integration** - Extensible tool system
- **Type Safety** - Pydantic models for request/response validation

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | API information |
| `/api/health` | GET | Quick health check |
| `/api/status` | GET | Detailed status |
| `/api/agents` | GET | List all agents |
| `/api/agents/{agent_id}` | GET | Get agent info |
| `/api/agents/{agent_id}/chat` | POST | Chat with agent |
| `/api/agents/{agent_id}/workflow` | POST | Execute workflow |
| `/api/agents/{agent_id}/test` | POST | Test agent |
| `/api/agents/{agent_id}/conversations/{id}` | DELETE | Delete conversation |
| `/api/agents/tools/status` | GET | Get tools status |
| `/api/agents/tools/test` | POST | Test all tools |

See [API Reference](API_REFERENCE.md) for complete documentation.

---

## Common Use Cases

### Simple Chat
```bash
curl -X POST "http://localhost:8000/api/agents/gpt4_assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is artificial intelligence?"
  }'
```

### Chat with Web Search
```bash
curl -X POST "http://localhost:8000/api/agents/gpt4_assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the latest AI breakthroughs?",
    "enable_web_search": true
  }'
```

### Execute Workflow
```bash
curl -X POST "http://localhost:8000/api/agents/developer_workflow/workflow" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Create a REST API for a todo application"
  }'
```

See [Quick Start](QUICKSTART.md) for more examples.

---

## Documentation Conventions

### Request Examples
All request examples are provided in both:
- **curl** format for command-line testing
- **JSON** format for programmatic use

### Response Examples
All response examples show:
- **Success responses** with status codes
- **Error responses** with error handling
- **Field descriptions** with types and constraints

### Code Blocks
- `python` - Python examples
- `javascript` - JavaScript/TypeScript examples
- `bash` - Shell commands
- `json` - JSON data structures

---

## Version Information

- **API Version:** 1.0.0
- **Base URL:** `http://localhost:8000` (default)
- **Protocol:** HTTP/HTTPS
- **Format:** JSON

---

## Support and Contributions

For issues, questions, or contributions:
- Review the documentation in this folder
- Check the [Quick Start](QUICKSTART.md) for common issues
- Examine the [API Reference](API_REFERENCE.md) for detailed specifications

---

## Document Index

### Core Documentation
1. [README.md](README.md) ← You are here
2. [QUICKSTART.md](QUICKSTART.md) - Get started quickly
3. [API_REFERENCE.md](API_REFERENCE.md) - Complete API documentation
4. [REQUEST_RESPONSE_MODELS.md](REQUEST_RESPONSE_MODELS.md) - Data schemas

### Agent Documentation
5. [AGENT_TYPES.md](AGENT_TYPES.md) - Agent types and configurations
6. [WORKFLOWS.md](WORKFLOWS.md) - LangGraph workflows guide

### Integration Documentation
7. [TOOLS_AND_FEATURES.md](TOOLS_AND_FEATURES.md) - Advanced features
8. [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) - Client development
9. [CONFIGURATION.md](CONFIGURATION.md) - Server configuration

---

**Last Updated:** December 2025
**Maintained By:** Jarvis Agent Server Team
