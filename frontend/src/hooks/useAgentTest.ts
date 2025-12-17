import { useState } from 'react';
import { apiClient } from '../api/client';
import { Agent, AgentTestResult } from '../types';

/**
 * Custom hook to manage agent testing logic
 * Consolidates the test functionality from ConnectionStatus component
 */
export function useAgentTest() {
  const [testingAgent, setTestingAgent] = useState(false);
  const [testResult, setTestResult] = useState<AgentTestResult | null>(null);

  const testAgent = async (agent: Agent | null) => {
    if (!agent) return;

    setTestingAgent(true);
    setTestResult(null);

    try {
      const result = await apiClient.testAgent(agent.agent_id);
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Test failed',
        error: err instanceof Error ? err.message : 'Unknown error',
        agent_type: agent.type
      });
    } finally {
      setTestingAgent(false);
    }
  };

  const clearTestResult = () => setTestResult(null);

  return {
    testingAgent,
    testResult,
    testAgent,
    clearTestResult
  };
}
