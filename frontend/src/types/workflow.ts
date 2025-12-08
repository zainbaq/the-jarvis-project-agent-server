// Workflow types

export interface WorkflowExecuteRequest {
  task: string;
  parameters?: {
    recursion_limit?: number;
    temperature?: number;
    provider?: string;
    model_name?: string;
    max_tokens?: number;
  };
}

export interface WorkflowExecuteResponse {
  status: 'completed' | 'failed';
  result?: any;
  error?: string;
  execution_time?: number;
}

export interface WorkflowResult {
  codebase?: Record<string, string>;
  documentation?: Record<string, string>;
  test_results?: Record<string, boolean>;
  final_output?: string;
  sections?: any[];
  sources?: any[];
}
