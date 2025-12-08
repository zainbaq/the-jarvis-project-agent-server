# API Reference

Complete reference documentation for all Jarvis Agent Server API endpoints.

## Table of Contents

1. [Base Information](#base-information)
2. [Authentication](#authentication)
3. [Health & Status Endpoints](#health--status-endpoints)
4. [Agent Management Endpoints](#agent-management-endpoints)
5. [Chat Endpoints](#chat-endpoints)
6. [Workflow Endpoints](#workflow-endpoints)
7. [Conversation Management](#conversation-management)
8. [Testing Endpoints](#testing-endpoints)
9. [Tools Endpoints](#tools-endpoints)
10. [Error Handling](#error-handling)

---

## Base Information

### Base URL
```
http://localhost:8000
```

### Content Type
All requests and responses use JSON:
```
Content-Type: application/json
```

### API Version
```
v1.0.0
```

---

## Authentication

**Current Status:** No authentication required

**Note:** Authentication will be added in future versions. Recommended headers for future compatibility:
```
Authorization: Bearer <token>
```

---

## Health & Status Endpoints

### GET `/`

Root endpoint with API information.

**Response:**
```json
{
  "message": "AI Agent Backend API",
  "version": "1.0.0",
  "docs": "/docs",
  "health": "/api/health",
  "agents": "/api/agents"
}
```

**Status Codes:**
- `200` - Success

**Example:**
```bash
curl http://localhost:8000/
```

---

### GET `/api/health`

Quick health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "agents_loaded": 7,
  "uptime": 3600.5
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Service status ("healthy" or "initializing") |
| `version` | string | API version |
| `agents_loaded` | integer | Number of successfully loaded agents |
| `uptime` | float | Server uptime in seconds |

**Status Codes:**
- `200` - Service healthy
- `503` - Service unhealthy

**Example:**
```bash
curl http://localhost:8000/api/health
```

---

### GET `/api/status`

Detailed status with registry and agent information.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600.5,
  "registry": {
    "total_agents": 7,
    "initialized": 7,
    "failed": 0
  },
  "agents": [
    {
      "agent_id": "gpt4_assistant",
      "name": "GPT-4 Assistant",
      "type": "openai",
      "status": "active"
    }
  ]
}
```

**Status Codes:**
- `200` - Success

**Example:**
```bash
curl http://localhost:8000/api/status
```

---

## Agent Management Endpoints

### GET `/api/agents`

List all available agents with optional filtering.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_type` | string | No | Filter by agent type ("openai", "langgraph", "endpoint") |
| `capability` | string | No | Filter by capability ("chat", "workflow", "code_generation") |

**Response:**
```json
[
  {
    "agent_id": "gpt4_assistant",
    "name": "GPT-4 Assistant",
    "type": "openai",
    "description": "General purpose GPT-4 conversational assistant",
    "capabilities": ["chat", "streaming"],
    "status": "active",
    "config": {
      "model": "gpt-4",
      "temperature": 0.7
    }
  }
]
```

**Response Fields:**
See [REQUEST_RESPONSE_MODELS.md](REQUEST_RESPONSE_MODELS.md#agentinfo) for `AgentInfo` schema.

**Status Codes:**
- `200` - Success

**Examples:**

List all agents:
```bash
curl http://localhost:8000/api/agents
```

Filter by type:
```bash
curl "http://localhost:8000/api/agents?agent_type=openai"
```

Filter by capability:
```bash
curl "http://localhost:8000/api/agents?capability=workflow"
```

---

### GET `/api/agents/{agent_id}`

Get detailed information about a specific agent.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string | Yes | Unique agent identifier |

**Response:**
```json
{
  "agent_id": "gpt4_assistant",
  "name": "GPT-4 Assistant",
  "type": "openai",
  "description": "General purpose GPT-4 conversational assistant",
  "capabilities": ["chat", "streaming"],
  "status": "active",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2000
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Agent not found

**Example:**
```bash
curl http://localhost:8000/api/agents/gpt4_assistant
```

---

## Chat Endpoints

### POST `/api/agents/{agent_id}/chat`

Send a message to an agent for conversational interaction.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string | Yes | Agent to chat with |

**Request Body:**
```json
{
  "message": "What are the latest developments in AI?",
  "conversation_id": "conv_12345",
  "enable_web_search": true,
  "uploaded_files": [],
  "parameters": {
    "temperature": 0.7,
    "max_tokens": 2000
  }
}
```

**Request Fields:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `message` | string | Yes | - | User message |
| `conversation_id` | string | No | auto-generated | Conversation context ID |
| `enable_web_search` | boolean | No | `false` | Enable web search for this query |
| `uploaded_files` | array | No | `[]` | File metadata (future feature) |
| `parameters` | object | No | `{}` | Override agent parameters |

**Parameters Object:**
| Field | Type | Description |
|-------|------|-------------|
| `temperature` | float | Sampling temperature (0.0-2.0) |
| `max_tokens` | integer | Maximum response tokens |
| `top_p` | float | Nucleus sampling parameter |
| `system_message` | string | Override system message |

**Response:**
```json
{
  "response": "Based on recent search results, here are the latest AI developments...",
  "conversation_id": "conv_12345",
  "agent_id": "gpt4_assistant",
  "metadata": {
    "tokens_used": 150,
    "model": "gpt-4",
    "execution_time": 2.35
  },
  "tools_used": [
    {
      "tool": "web_search",
      "success": true,
      "data": {
        "results_count": 9,
        "queries": ["AI developments 2024"],
        "message": "Found 9 search results"
      },
      "timestamp": "2024-12-08T10:30:45.123456"
    }
  ],
  "web_search_enabled": true
}
```

**Response Fields:**
See [REQUEST_RESPONSE_MODELS.md](REQUEST_RESPONSE_MODELS.md#chatresponse) for complete schema.

**Status Codes:**
- `200` - Success
- `400` - Invalid request (validation error)
- `404` - Agent not found
- `422` - Unprocessable entity (Pydantic validation error)
- `500` - Server error

**Examples:**

Simple chat:
```bash
curl -X POST "http://localhost:8000/api/agents/gpt4_assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is artificial intelligence?"
  }'
```

Chat with conversation history:
```bash
curl -X POST "http://localhost:8000/api/agents/gpt4_assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you explain more about that?",
    "conversation_id": "conv_12345"
  }'
```

Chat with web search:
```bash
curl -X POST "http://localhost:8000/api/agents/gpt4_assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the latest AI breakthroughs?",
    "enable_web_search": true
  }'
```

Chat with custom parameters:
```bash
curl -X POST "http://localhost:8000/api/agents/gpt4_assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Write a creative story",
    "parameters": {
      "temperature": 1.2,
      "max_tokens": 1000
    }
  }'
```

---

## Workflow Endpoints

### POST `/api/agents/{agent_id}/workflow`

Execute a workflow on a workflow-capable agent (LangGraph agents only).

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string | Yes | Workflow agent ID |

**Request Body:**
```json
{
  "task": "Create a REST API for a todo application with FastAPI",
  "parameters": {
    "recursion_limit": 100,
    "temperature": 0.0,
    "provider": "openai",
    "model_name": "gpt-4"
  }
}
```

**Request Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task` | string | Yes | Task description for workflow |
| `parameters` | object | No | Workflow-specific parameters |

**Common Workflow Parameters:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `recursion_limit` | integer | 100 | LangGraph recursion limit |
| `temperature` | float | 0.0 | LLM sampling temperature |
| `provider` | string | "openai" | LLM provider |
| `model_name` | string | "gpt-4" | Model to use |
| `max_tokens` | integer | - | Maximum tokens |

**Response:**
```json
{
  "status": "completed",
  "result": {
    "codebase": {
      "main.py": "from fastapi import FastAPI\n\napp = FastAPI()...",
      "models.py": "from pydantic import BaseModel...",
      "requirements.txt": "fastapi==0.104.0\nuvicorn==0.24.0"
    },
    "documentation": {
      "README.md": "# Todo API\n\nA REST API built with FastAPI..."
    },
    "test_results": {
      "test_main.py": true
    }
  },
  "error": null,
  "execution_time": 45.2
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "completed" or "failed" |
| `result` | object | Workflow output (structure varies by workflow) |
| `error` | string | Error message if status is "failed" |
| `execution_time` | float | Execution time in seconds |

**Status Codes:**
- `200` - Success (check `status` field for actual workflow status)
- `400` - Agent doesn't support workflows
- `404` - Agent not found
- `422` - Validation error
- `500` - Server error

**Examples:**

Developer workflow (code generation):
```bash
curl -X POST "http://localhost:8000/api/agents/developer_workflow/workflow" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Create a REST API for managing books with FastAPI"
  }'
```

With custom parameters:
```bash
curl -X POST "http://localhost:8000/api/agents/developer_workflow/workflow" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Create a data processing pipeline in Python",
    "parameters": {
      "recursion_limit": 150,
      "temperature": 0.1,
      "model_name": "gpt-4"
    }
  }'
```

Web search workflow (research):
```bash
curl -X POST "http://localhost:8000/api/agents/web_search_workflow/workflow" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Research the latest developments in quantum computing",
    "parameters": {
      "temperature": 0.2
    }
  }'
```

---

## Conversation Management

### DELETE `/api/agents/{agent_id}/conversations/{conversation_id}`

Delete conversation history and associated data.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string | Yes | Agent ID |
| `conversation_id` | string | Yes | Conversation to delete |

**Response:**
```json
{
  "status": "success",
  "message": "Conversation conv_12345 deleted for agent gpt4_assistant"
}
```

**Status Codes:**
- `200` - Success
- `404` - Agent or conversation not found
- `400` - Agent doesn't support conversation deletion
- `500` - Server error

**Example:**
```bash
curl -X DELETE "http://localhost:8000/api/agents/gpt4_assistant/conversations/conv_12345"
```

**Note:** Deleting a conversation also clears:
- Message history
- Associated web search results
- Vector store data for that conversation

---

## Testing Endpoints

### POST `/api/agents/{agent_id}/test`

Test an agent's connection and functionality.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string | Yes | Agent to test |

**Response (Success):**
```json
{
  "success": true,
  "message": "Test successful",
  "response_preview": "Hello! This is a connection test. The agent is responding normally...",
  "agent_type": "openai"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Test failed",
  "error": "Connection timeout: Failed to connect to API",
  "agent_type": "openai"
}
```

**Status Codes:**
- `200` - Test completed (check `success` field for result)
- `404` - Agent not found
- `500` - Server error

**Example:**
```bash
curl -X POST "http://localhost:8000/api/agents/gpt4_assistant/test"
```

---

## Tools Endpoints

### GET `/api/agents/tools/status`

Get the status of available tools.

**Response:**
```json
{
  "tools": {
    "web_search": true,
    "attachments": false,
    "code_interpreter": false
  },
  "web_search_configured": true
}
```

**Status Codes:**
- `200` - Success

**Example:**
```bash
curl http://localhost:8000/api/agents/tools/status
```

---

### POST `/api/agents/tools/test`

Test all available tools.

**Response:**
```json
{
  "success": true,
  "results": {
    "web_search": {
      "serper_configured": true,
      "vector_store_available": true,
      "vector_store_path": "/path/to/vector_stores",
      "overall_ready": true
    },
    "attachments": {
      "available": false,
      "status": "not_implemented"
    }
  }
}
```

**Status Codes:**
- `200` - Success

**Example:**
```bash
curl -X POST "http://localhost:8000/api/agents/tools/test"
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "detail": "Detailed error information",
  "request_id": "req_12345"
}
```

### HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| `200` | OK | Request successful |
| `400` | Bad Request | Invalid request parameters or unsupported operation |
| `404` | Not Found | Resource not found (agent, conversation, etc.) |
| `422` | Unprocessable Entity | Request validation failed (Pydantic validation) |
| `500` | Internal Server Error | Server-side error (API key issues, processing errors) |
| `503` | Service Unavailable | Service unhealthy or initializing |

### Common Error Scenarios

#### Agent Not Found
```bash
curl http://localhost:8000/api/agents/nonexistent_agent
```
Response (404):
```json
{
  "error": "Agent not found",
  "detail": "Agent with ID 'nonexistent_agent' does not exist"
}
```

#### Invalid Request Body
```bash
curl -X POST "http://localhost:8000/api/agents/gpt4_assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{}'
```
Response (422):
```json
{
  "detail": [
    {
      "loc": ["body", "message"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

#### Unsupported Operation
```bash
curl -X POST "http://localhost:8000/api/agents/gpt4_assistant/workflow" \
  -H "Content-Type: application/json" \
  -d '{"task": "Do something"}'
```
Response (400):
```json
{
  "error": "Agent does not support workflow execution",
  "detail": "Agent 'gpt4_assistant' is of type 'openai' which does not support workflows"
}
```

#### Server Error
```bash
curl -X POST "http://localhost:8000/api/agents/gpt4_assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```
Response (500):
```json
{
  "error": "Error querying agent",
  "detail": "API key not configured for agent"
}
```

---

## Rate Limiting

**Current Status:** No rate limiting implemented

**Recommended Client Behavior:**
- Implement exponential backoff on 5xx errors
- Respect server capacity (don't spam requests)
- Use conversation_id to maintain context (reduces token usage)

---

## API Changelog

### Version 1.0.0 (Current)
- Initial release
- 14 endpoints covering all core functionality
- Support for 3 agent types (OpenAI, Endpoint, LangGraph)
- Web search integration
- Progress tracking for workflows
- Conversation management

### Upcoming Features
- WebSocket support for streaming responses
- Authentication and authorization
- Rate limiting
- Batch operations
- File upload support
- Advanced analytics

---

## Best Practices

### 1. Use Conversation IDs
Always provide a `conversation_id` for multi-turn conversations to maintain context:
```json
{
  "message": "What about Python?",
  "conversation_id": "conv_12345"
}
```

### 2. Enable Web Search When Needed
For queries requiring current information:
```json
{
  "message": "What are today's news?",
  "enable_web_search": true
}
```

### 3. Monitor Workflow Progress
For long-running workflows, check execution time and handle timeouts.

### 4. Handle Errors Gracefully
Always check the `status` field in workflow responses and implement retry logic for network errors.

### 5. Clean Up Conversations
Delete conversations when no longer needed to free server resources:
```bash
curl -X DELETE "http://localhost:8000/api/agents/{agent_id}/conversations/{conversation_id}"
```

---

## Support

For additional information:
- [Request/Response Models](REQUEST_RESPONSE_MODELS.md) - Detailed schemas
- [Agent Types](AGENT_TYPES.md) - Agent configuration
- [Quick Start](QUICKSTART.md) - Getting started guide
- [Frontend Integration](FRONTEND_INTEGRATION.md) - Client examples

---

**Last Updated:** December 2024
