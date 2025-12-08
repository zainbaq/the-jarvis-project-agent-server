# Complete API Guide - Jarvis Agent Server

**Single-page reference for frontend developers**

---

## Quick Reference

**Base URL:** `http://localhost:8000`
**Content-Type:** `application/json`
**API Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [All Endpoints](#all-endpoints)
3. [Agent Types](#agent-types)
4. [Request/Response Models](#requestresponse-models)
5. [Common Use Cases](#common-use-cases)
6. [TypeScript Definitions](#typescript-definitions)
7. [React Integration Examples](#react-integration-examples)
8. [Error Handling](#error-handling)

---

## Overview

The Jarvis Agent Server provides a unified REST API for interacting with three types of AI agents:

- **OpenAI Agents** - Conversational chat with GPT models
- **Endpoint Agents** - Azure OpenAI or custom endpoints
- **LangGraph Agents** - Complex workflows (code generation, research)

### Key Features
- 14 REST endpoints
- Web search integration
- Conversation history management
- Workflow execution with progress tracking
- No authentication (currently)

---

## All Endpoints

### Health & Status

#### `GET /api/health`
Quick health check.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "agents_loaded": 7,
  "uptime": 3600.5
}
```

#### `GET /api/status`
Detailed status with agent information.

---

### Agent Management

#### `GET /api/agents`
List all agents. Optional filters: `?agent_type=openai` or `?capability=chat`

**Response:**
```json
[
  {
    "agent_id": "gpt4_assistant",
    "name": "GPT-4 Assistant",
    "type": "openai",
    "description": "General purpose GPT-4 assistant",
    "capabilities": ["chat", "streaming"],
    "status": "active",
    "config": {
      "model": "gpt-4",
      "temperature": 0.7
    }
  }
]
```

#### `GET /api/agents/{agent_id}`
Get single agent details.

---

### Chat

#### `POST /api/agents/{agent_id}/chat`
Send message to agent.

**Request:**
```json
{
  "message": "What is AI?",
  "conversation_id": "conv_123",  // optional
  "enable_web_search": false,     // optional
  "parameters": {                 // optional
    "temperature": 0.7,
    "max_tokens": 2000
  }
}
```

**Response:**
```json
{
  "response": "AI stands for...",
  "conversation_id": "conv_123",
  "agent_id": "gpt4_assistant",
  "metadata": {
    "tokens_used": 150,
    "model": "gpt-4"
  },
  "tools_used": [],
  "web_search_enabled": false
}
```

**With Web Search:**
```json
{
  "message": "Latest AI news?",
  "enable_web_search": true
}
```

Response includes `tools_used` array with search results.

---

### Workflows

#### `POST /api/agents/{agent_id}/workflow`
Execute workflow (LangGraph agents only).

**Request:**
```json
{
  "task": "Create a REST API for a todo app",
  "parameters": {
    "recursion_limit": 100,
    "temperature": 0.0
  }
}
```

**Response:**
```json
{
  "status": "completed",
  "result": {
    "codebase": {
      "main.py": "# code...",
      "requirements.txt": "fastapi==0.104.0"
    },
    "documentation": {
      "README.md": "# Todo API"
    }
  },
  "error": null,
  "execution_time": 45.2
}
```

---

### Conversation Management

#### `DELETE /api/agents/{agent_id}/conversations/{conversation_id}`
Delete conversation history.

**Response:**
```json
{
  "status": "success",
  "message": "Conversation deleted"
}
```

---

### Testing

#### `POST /api/agents/{agent_id}/test`
Test agent connection.

**Response:**
```json
{
  "success": true,
  "message": "Test successful",
  "response_preview": "Hello! This is a test...",
  "agent_type": "openai"
}
```

---

### Tools

#### `GET /api/agents/tools/status`
Get available tools status.

#### `POST /api/agents/tools/test`
Test all tools.

---

## Agent Types

### 1. OpenAI Agent (`type: "openai"`)

**What:** Direct OpenAI API integration
**Best For:** Chat assistants, Q&A, general conversation
**Capabilities:** `["chat", "streaming"]`

**Example Agents:**
- `gpt4_assistant` - GPT-4 general assistant
- `gpt35_turbo` - GPT-3.5 Turbo (faster, cheaper)
- `code_assistant` - Code-focused assistant

**Configuration:**
```json
{
  "agent_id": "gpt4_assistant",
  "type": "openai",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2000,
    "system_message": "You are a helpful AI assistant"
  }
}
```

**Usage:**
```bash
curl -X POST "http://localhost:8000/api/agents/gpt4_assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

---

### 2. Endpoint Agent (`type: "endpoint"`)

**What:** Azure OpenAI or custom OpenAI-compatible endpoints
**Best For:** Enterprise deployments, custom LLM services
**Capabilities:** `["chat", "streaming"]`

**Example Agents:**
- `azure_gpt4` - Azure OpenAI Service
- `custom_llm` - Custom endpoint

**Configuration:**
```json
{
  "agent_id": "azure_gpt4",
  "type": "endpoint",
  "config": {
    "base_url": "https://your-resource.openai.azure.com/",
    "api_key": "${AZURE_OPENAI_API_KEY}",
    "model": "gpt-4"
  }
}
```

---

### 3. LangGraph Agent (`type: "langgraph"`)

**What:** Complex multi-step workflow execution
**Best For:** Code generation, research, document processing
**Capabilities:** `["workflow", "code_generation"]`

**Example Agents:**
- `developer_workflow` - Code project generation
- `web_search_workflow` - Research and report generation

**Configuration:**
```json
{
  "agent_id": "developer_workflow",
  "type": "langgraph",
  "config": {
    "workflow_module": "backend.workflows.developer.tasks",
    "workflow_function": "perform_task",
    "provider": "openai",
    "model_name": "gpt-4",
    "temperature": 0.0,
    "recursion_limit": 100
  }
}
```

**Usage:**
```bash
curl -X POST "http://localhost:8000/api/agents/developer_workflow/workflow" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Create a FastAPI REST API for managing books"
  }'
```

**Workflow Result Structure:**

**Developer Workflow:**
```json
{
  "status": "completed",
  "result": {
    "codebase": {
      "main.py": "...",
      "models.py": "...",
      "requirements.txt": "..."
    },
    "documentation": {
      "README.md": "...",
      "API.md": "..."
    },
    "test_results": {
      "test_main.py": true
    }
  },
  "execution_time": 45.2
}
```

**Web Search Workflow:**
```json
{
  "status": "completed",
  "result": {
    "final_output": "# Research Report\n\n## Introduction\n...",
    "sections": [...],
    "sources": [...]
  },
  "execution_time": 32.5
}
```

---

## Request/Response Models

### ChatRequest

```typescript
interface ChatRequest {
  message: string;                    // Required
  conversation_id?: string;           // Optional
  enable_web_search?: boolean;        // Default: false
  uploaded_files?: Array<any>;        // Optional
  parameters?: {                      // Optional
    temperature?: number;             // 0.0 - 2.0
    max_tokens?: number;
    top_p?: number;
    system_message?: string;
  };
}
```

### ChatResponse

```typescript
interface ChatResponse {
  response: string;
  conversation_id: string;
  agent_id: string;
  metadata: {
    tokens_used?: number;
    model?: string;
    execution_time?: number;
  };
  tools_used: Array<{
    tool: string;
    success: boolean;
    data: any;
    timestamp: string;
  }>;
  web_search_enabled: boolean;
}
```

### WorkflowExecuteRequest

```typescript
interface WorkflowExecuteRequest {
  task: string;                       // Required
  parameters?: {                      // Optional
    recursion_limit?: number;         // Default: 100
    temperature?: number;             // Default: 0.0
    provider?: string;                // Default: "openai"
    model_name?: string;              // Default: "gpt-4"
    max_tokens?: number;
  };
}
```

### WorkflowExecuteResponse

```typescript
interface WorkflowExecuteResponse {
  status: "completed" | "failed";
  result?: any;                       // Workflow-specific structure
  error?: string;
  execution_time?: number;
}
```

### AgentInfo

```typescript
interface AgentInfo {
  agent_id: string;
  name: string;
  type: "openai" | "endpoint" | "langgraph";
  description: string;
  capabilities: string[];             // ["chat", "workflow", etc.]
  status: "active" | "inactive";
  config: Record<string, any>;
}
```

---

## Common Use Cases

### 1. Simple Chat

```javascript
const response = await fetch('http://localhost:8000/api/agents/gpt4_assistant/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What is artificial intelligence?'
  })
});

const data = await response.json();
console.log(data.response);
```

### 2. Chat with Conversation History

```javascript
let conversationId = null;

// First message
const msg1 = await fetch('http://localhost:8000/api/agents/gpt4_assistant/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Tell me about Python'
  })
});
const data1 = await msg1.json();
conversationId = data1.conversation_id;

// Follow-up message (uses context)
const msg2 = await fetch('http://localhost:8000/api/agents/gpt4_assistant/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What are its main features?',
    conversation_id: conversationId
  })
});
```

### 3. Chat with Web Search

```javascript
const response = await fetch('http://localhost:8000/api/agents/gpt4_assistant/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What are the latest AI breakthroughs in 2024?',
    enable_web_search: true
  })
});

const data = await response.json();
console.log('Response:', data.response);
console.log('Sources:', data.tools_used[0]?.data);
```

### 4. Execute Code Generation Workflow

```javascript
const response = await fetch('http://localhost:8000/api/agents/developer_workflow/workflow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task: 'Create a REST API for managing books with FastAPI',
    parameters: {
      recursion_limit: 100,
      temperature: 0.0
    }
  })
});

const data = await response.json();
if (data.status === 'completed') {
  console.log('Generated files:', Object.keys(data.result.codebase));
  console.log('Code:', data.result.codebase['main.py']);
}
```

### 5. List Available Agents

```javascript
const response = await fetch('http://localhost:8000/api/agents');
const agents = await response.json();

agents.forEach(agent => {
  console.log(`${agent.name} (${agent.type})`);
  console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
});
```

---

## TypeScript Definitions

Complete TypeScript definitions for your frontend:

```typescript
// API Client
class JarvisAPIClient {
  baseURL: string;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.baseURL = baseURL;
  }

  // List agents
  async listAgents(filters?: { agent_type?: string; capability?: string }): Promise<AgentInfo[]> {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${this.baseURL}/api/agents?${params}`);
    return response.json();
  }

  // Get agent
  async getAgent(agentId: string): Promise<AgentInfo> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}`);
    return response.json();
  }

  // Chat
  async chat(agentId: string, request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  }

  // Execute workflow
  async executeWorkflow(agentId: string, request: WorkflowExecuteRequest): Promise<WorkflowExecuteResponse> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  }

  // Delete conversation
  async deleteConversation(agentId: string, conversationId: string): Promise<void> {
    await fetch(`${this.baseURL}/api/agents/${agentId}/conversations/${conversationId}`, {
      method: 'DELETE'
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; version: string; agents_loaded: number; uptime: number }> {
    const response = await fetch(`${this.baseURL}/api/health`);
    return response.json();
  }
}

// Usage
const client = new JarvisAPIClient();
const response = await client.chat('gpt4_assistant', {
  message: 'Hello!',
  enable_web_search: false
});
```

---

## React Integration Examples

### Custom Hook for Chat

```typescript
import { useState, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useChat(agentId: string, enableWebSearch: boolean = false) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: message, timestamp: new Date() }]);
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:8000/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          enable_web_search: enableWebSearch
        })
      });

      const data = await response.json();

      // Update conversation ID
      if (!conversationId) {
        setConversationId(data.conversation_id);
      }

      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  }, [agentId, conversationId, enableWebSearch]);

  const clearHistory = useCallback(async () => {
    if (conversationId) {
      await fetch(`http://localhost:8000/api/agents/${agentId}/conversations/${conversationId}`, {
        method: 'DELETE'
      });
    }
    setMessages([]);
    setConversationId(null);
  }, [agentId, conversationId]);

  return { messages, loading, sendMessage, clearHistory };
}
```

### Chat Component Example

```typescript
import React, { useState } from 'react';
import { useChat } from './useChat';

export function ChatInterface({ agentId }: { agentId: string }) {
  const [input, setInput] = useState('');
  const { messages, loading, sendMessage, clearHistory } = useChat(agentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    await sendMessage(input);
    setInput('');
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
        {loading && <div className="loading">Thinking...</div>}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>Send</button>
        <button type="button" onClick={clearHistory}>Clear</button>
      </form>
    </div>
  );
}
```

### Agent Selector Component

```typescript
import React, { useEffect, useState } from 'react';

interface Agent {
  agent_id: string;
  name: string;
  type: string;
  description: string;
  capabilities: string[];
}

export function AgentSelector({ onSelect }: { onSelect: (agentId: string) => void }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/agents')
      .then(res => res.json())
      .then(data => {
        setAgents(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading agents...</div>;

  return (
    <select onChange={(e) => onSelect(e.target.value)}>
      <option value="">Select an agent</option>
      {agents.map(agent => (
        <option key={agent.agent_id} value={agent.agent_id}>
          {agent.name} ({agent.type})
        </option>
      ))}
    </select>
  );
}
```

### Workflow Executor Component

```typescript
import React, { useState } from 'react';

export function WorkflowExecutor({ agentId }: { agentId: string }) {
  const [task, setTask] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const executeWorkflow = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`http://localhost:8000/api/agents/${agentId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Workflow error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workflow-executor">
      <h3>Execute Workflow</h3>

      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Describe your task..."
        rows={4}
      />

      <button onClick={executeWorkflow} disabled={loading || !task}>
        {loading ? 'Executing...' : 'Execute'}
      </button>

      {result && (
        <div className="result">
          <h4>Status: {result.status}</h4>
          <p>Execution time: {result.execution_time}s</p>

          {result.status === 'completed' && result.result.codebase && (
            <div>
              <h5>Generated Files:</h5>
              <ul>
                {Object.keys(result.result.codebase).map(filename => (
                  <li key={filename}>
                    <details>
                      <summary>{filename}</summary>
                      <pre>{result.result.codebase[filename]}</pre>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.error && <div className="error">{result.error}</div>}
        </div>
      )}
    </div>
  );
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Agent doesn't support workflows |
| 404 | Not Found | Agent or conversation doesn't exist |
| 422 | Validation Error | Missing required field in request |
| 500 | Server Error | API key not configured, processing error |

### Error Response Format

```json
{
  "error": "Error message",
  "detail": "Detailed error information"
}
```

### Example Error Handling

```typescript
async function chatWithErrorHandling(agentId: string, message: string) {
  try {
    const response = await fetch(`http://localhost:8000/api/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const error = await response.json();

      switch (response.status) {
        case 404:
          throw new Error(`Agent '${agentId}' not found`);
        case 422:
          throw new Error(`Validation error: ${error.detail}`);
        case 500:
          throw new Error(`Server error: ${error.error}`);
        default:
          throw new Error(`HTTP ${response.status}: ${error.error}`);
      }
    }

    return await response.json();
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}
```

### Retry Logic

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }

      // Retry server errors (5xx)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        continue;
      }

      throw new Error(`Server error: ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

---

## Quick Start Checklist

1. **Check server is running:**
   ```bash
   curl http://localhost:8000/api/health
   ```

2. **List available agents:**
   ```bash
   curl http://localhost:8000/api/agents
   ```

3. **Test chat endpoint:**
   ```bash
   curl -X POST "http://localhost:8000/api/agents/gpt4_assistant/chat" \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello!"}'
   ```

4. **Integrate into your frontend using the examples above**

---

## Environment Variables

Required for backend:
```bash
OPENAI_API_KEY=sk-...           # Required for OpenAI agents
SERPER_API_KEY=...              # Optional for web search
AZURE_OPENAI_API_KEY=...        # Optional for Azure agents
AZURE_OPENAI_ENDPOINT=...       # Optional for Azure agents
```

---

## Support

- Full documentation available in `/backend/docs/`
- API automatically documented at `http://localhost:8000/docs` (Swagger UI)
- Interactive API testing at `http://localhost:8000/redoc`

---

**Last Updated:** December 2024
**Version:** 1.0.0
