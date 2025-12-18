import React, { useState, useEffect } from "react";
import { TopNav } from "./components/TopNav";
import { ChatTab } from "./components/ChatTab";
import { WorkflowsTab } from "./components/WorkflowsTab";
import { SettingsModal } from "./components/SettingsModal";
import { AddEndpointModal, EndpointConfig } from "./components/AddEndpointModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { Agent } from "./types";
import { apiClient } from "./api/client";
import { useSession } from "./hooks/useSession";
import { KMConnectionsProvider } from "./contexts/KMConnectionsContext";

function App() {
  const [activeTab, setActiveTab] = useState<
    "chat" | "workflows"
  >("chat");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddEndpoint, setShowAddEndpoint] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  // Initialize session (persists across refresh, isolated per tab)
  const { sessionId, isInitialized: sessionInitialized } = useSession();

  // Set session ID on API client when session is ready
  useEffect(() => {
    if (sessionInitialized && sessionId) {
      apiClient.setSessionId(sessionId);
      console.log('[App] Session initialized, reloading agents...');
      loadAgents();
    }
  }, [sessionInitialized, sessionId]);

  // Load agents
  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      // listAgents now includes session custom endpoints via include_custom=true (default)
      const data = await apiClient.listAgents();
      setAgents(data);
    } catch (error) {
      console.error("Failed to load agents:", error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEndpoint = async (config: EndpointConfig) => {
    try {
      // Create custom endpoint via session API
      const newEndpoint = await apiClient.createCustomEndpoint({
        name: config.name,
        url: config.endpoint_url,
        api_key: config.api_key || '',
        model: config.model_name || 'gpt-4'
      });

      // Convert to Agent format for display
      const newAgent: Agent = {
        agent_id: newEndpoint.id,
        name: newEndpoint.name,
        type: 'custom_endpoint',
        description: `Custom endpoint (${newEndpoint.model})`,
        capabilities: ['chat', 'streaming'],
        status: 'active',
        config: {
          url: newEndpoint.url,
          model: newEndpoint.model
        }
      };

      // Add to agents list
      setAgents([...agents, newAgent]);
      setShowAddEndpoint(false);
    } catch (error) {
      console.error('Failed to add endpoint:', error);
      alert(error instanceof Error ? error.message : 'Failed to add endpoint');
    }
  };

  const handleDeleteEndpoint = (agent: Agent) => {
    setAgentToDelete(agent);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEndpoint = async () => {
    if (!agentToDelete) return;

    try {
      // Delete from session via API
      await apiClient.deleteCustomEndpoint(agentToDelete.agent_id);

      // Remove from state
      setAgents(agents.filter(a => a.agent_id !== agentToDelete.agent_id));

      // Clear selection if deleted agent was selected
      if (selectedAgent?.agent_id === agentToDelete.agent_id) {
        setSelectedAgent(null);
      }
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete endpoint');
    }

    // Close modal
    setShowDeleteConfirm(false);
    setAgentToDelete(null);
  };

  return (
    <KMConnectionsProvider>
      <div className="flex flex-col h-screen relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 animate-gradient" />

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-20 bg-grid-pattern" />

        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse animation-delay-1s" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          <TopNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSettingsClick={() => setShowSettings(true)}
            selectedAgent={selectedAgent}
          />

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading agents...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === "chat" && (
                <ChatTab
                  agents={agents}
                  onAddEndpoint={() => setShowAddEndpoint(true)}
                  onAgentChange={setSelectedAgent}
                  onDeleteEndpoint={handleDeleteEndpoint}
                />
              )}
              {activeTab === "workflows" && (
                <WorkflowsTab agents={agents} />
              )}
            </>
          )}
        </div>

        {/* Modals */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
        <AddEndpointModal
          isOpen={showAddEndpoint}
          onClose={() => setShowAddEndpoint(false)}
          onAdd={handleAddEndpoint}
        />
        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setAgentToDelete(null);
          }}
          onConfirm={confirmDeleteEndpoint}
          itemName={agentToDelete?.name || ''}
          itemType="endpoint"
        />
      </div>
    </KMConnectionsProvider>
  );
}

export default App;