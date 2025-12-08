// Think of this like Pydantic BaseModel in Python
// Similar to: class AgentInfo(BaseModel):

export interface AgentInfo {
  agent_id: string;
  name: string;
  type: 'openai' | 'endpoint' | 'langgraph';
  description: string;
  capabilities: string[];
  status: 'active' | 'inactive';
  config: Record<string, any>;
}

export interface AgentCapability {
  name: string;
  description: string;
}

export type AgentType = 'openai' | 'endpoint' | 'langgraph';
