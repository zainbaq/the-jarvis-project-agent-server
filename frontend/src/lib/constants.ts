// App constants - like settings.py in Django/FastAPI

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Jarvis Agent Server';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const AGENT_TYPES = {
  OPENAI: 'openai',
  ENDPOINT: 'endpoint',
  LANGGRAPH: 'langgraph',
} as const;

export const AGENT_CAPABILITIES = {
  CHAT: 'chat',
  WORKFLOW: 'workflow',
  CODE_GENERATION: 'code_generation',
  WEB_SEARCH: 'web_search',
  STREAMING: 'streaming',
} as const;
