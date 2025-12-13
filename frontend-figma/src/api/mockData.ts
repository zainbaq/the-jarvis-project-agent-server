import { Agent, ChatResponse, WorkflowResponse } from '../types';

export const mockAgents: Agent[] = [
  {
    agent_id: 'gpt4_assistant',
    name: 'GPT-4 Assistant',
    type: 'openai',
    description: 'General purpose GPT-4 assistant for conversations and tasks',
    capabilities: ['chat', 'streaming', 'web_search'],
    status: 'active',
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000
    }
  },
  {
    agent_id: 'gpt35_turbo',
    name: 'GPT-3.5 Turbo',
    type: 'openai',
    description: 'Fast and efficient GPT-3.5 Turbo assistant',
    capabilities: ['chat', 'streaming'],
    status: 'active',
    config: {
      model: 'gpt-3.5-turbo',
      temperature: 0.7
    }
  },
  {
    agent_id: 'developer_workflow',
    name: 'Developer Workflow',
    type: 'langgraph',
    description: 'Code generation and project creation workflow',
    capabilities: ['workflow', 'code_generation'],
    status: 'active',
    config: {
      workflow_module: 'backend.workflows.developer.tasks',
      model: 'gpt-4',
      temperature: 0.0
    }
  },
  {
    agent_id: 'web_search_workflow',
    name: 'Web Search Research',
    type: 'langgraph',
    description: 'Research and report generation with web search',
    capabilities: ['workflow', 'research', 'web_search'],
    status: 'active',
    config: {
      workflow_module: 'backend.workflows.research',
      model: 'gpt-4'
    }
  },
  {
    agent_id: 'azure_gpt4',
    name: 'Azure GPT-4',
    type: 'endpoint',
    description: 'Azure OpenAI Service endpoint',
    capabilities: ['chat', 'streaming'],
    status: 'active',
    config: {
      base_url: 'https://your-resource.openai.azure.com/',
      model: 'gpt-4'
    }
  }
];

export function getMockChatResponse(message: string, agentId: string): ChatResponse {
  const responses = [
    "I'm a demo assistant. To connect to your real backend, please use ngrok or set up HTTPS access. This is just a preview of how the interface works!",
    "This is mock data - the real AI responses will come from your backend once you connect it via ngrok.",
    "Great question! In demo mode, I can show you how the chat interface works. Set up your backend connection to get real AI responses.",
  ];

  return {
    response: responses[Math.floor(Math.random() * responses.length)],
    conversation_id: 'demo_conversation_' + Date.now(),
    agent_id: agentId,
    metadata: {
      tokens_used: 150,
      model: 'demo-model',
      execution_time: 0.5
    },
    tools_used: [],
    web_search_enabled: false
  };
}

export function getMockWorkflowResponse(task: string): WorkflowResponse {
  return {
    status: 'completed',
    result: {
      codebase: {
        'main.py': `# Demo Code Generation Result
# This is mock data - connect your backend to see real results

from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.get("/items/{item_id}")
def read_item(item_id: int):
    return {"item_id": item_id}
`,
        'requirements.txt': `fastapi==0.104.0
uvicorn==0.24.0
pydantic==2.5.0
`,
        'README.md': `# Demo Project

This is a mock result. Connect your backend to see real code generation!

## Task
${task}

## Usage
\`\`\`bash
pip install -r requirements.txt
uvicorn main:app --reload
\`\`\`
`
      },
      documentation: {
        'API.md': `# API Documentation

This is demo documentation. Your real backend will generate actual docs.
`
      }
    },
    execution_time: 2.5
  };
}