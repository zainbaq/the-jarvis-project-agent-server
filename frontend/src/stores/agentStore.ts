// Agent Store - Global state for selected agent
// Think of Zustand like a global dictionary in Python that triggers re-renders

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentInfo } from '../types/agent';

interface AgentStore {
  // State
  selectedAgentId: string | null;
  agents: AgentInfo[];

  // Actions (like methods in a Python class)
  setSelectedAgent: (agentId: string | null) => void;
  setAgents: (agents: AgentInfo[]) => void;
  getSelectedAgent: () => AgentInfo | null;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedAgentId: null,
      agents: [],

      // Actions
      setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }),

      setAgents: (agents) => set({ agents }),

      getSelectedAgent: () => {
        const { selectedAgentId, agents } = get();
        return agents.find((a) => a.agent_id === selectedAgentId) || null;
      },
    }),
    {
      name: 'agent-storage', // localStorage key
      partialize: (state) => ({ selectedAgentId: state.selectedAgentId }), // Only persist this
    }
  )
);
