import React, { useState, useEffect } from "react";
import { TopNav } from "./components/TopNav";
import { ChatTab } from "./components/ChatTab";
import { WorkflowsTab } from "./components/WorkflowsTab";
import { SettingsModal } from "./components/SettingsModal";
import { AddEndpointModal, EndpointConfig } from "./components/AddEndpointModal";
import { Agent } from "./types";
import { apiClient } from "./api/client";

function App() {
  const [activeTab, setActiveTab] = useState<
    "chat" | "workflows"
  >("chat");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddEndpoint, setShowAddEndpoint] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Enable demo mode by default on first load
  useEffect(() => {
    const hasConfigured = localStorage.getItem(
      "jarvis_configured",
    );
    if (!hasConfigured) {
      // First time user - enable demo mode
      localStorage.setItem("jarvis_demo_mode", "true");
      localStorage.setItem("jarvis_configured", "true");
    }
  }, []);

  // Load agents
  useEffect(() => {
    loadAgents();

    // Listen for storage changes (when demo mode is toggled)
    const handleStorageChange = () => {
      loadAgents();
    };

    window.addEventListener("storage", handleStorageChange);
    return () =>
      window.removeEventListener(
        "storage",
        handleStorageChange,
      );
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listAgents();
      
      // Load custom endpoints from localStorage and merge with backend agents
      const customEndpoints = JSON.parse(localStorage.getItem('jarvis_custom_endpoints') || '[]');
      setAgents([...data, ...customEndpoints]);
    } catch (error) {
      console.error("Failed to load agents:", error);
      
      // If backend is not available, enable demo mode automatically
      if (error instanceof Error && error.message.includes('Cannot connect to backend')) {
        console.log('Backend not available, enabling demo mode...');
        localStorage.setItem('jarvis_demo_mode', 'true');
        
        // Try loading agents again with demo mode enabled
        try {
          const data = await apiClient.listAgents();
          const customEndpoints = JSON.parse(localStorage.getItem('jarvis_custom_endpoints') || '[]');
          setAgents([...data, ...customEndpoints]);
        } catch (demoError) {
          console.error('Failed to load demo data:', demoError);
          // Even if demo fails, load custom endpoints
          const customEndpoints = JSON.parse(localStorage.getItem('jarvis_custom_endpoints') || '[]');
          setAgents(customEndpoints);
        }
      } else {
        // Load custom endpoints even if backend fails
        const customEndpoints = JSON.parse(localStorage.getItem('jarvis_custom_endpoints') || '[]');
        setAgents(customEndpoints);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddEndpoint = async (config: EndpointConfig) => {
    try {
      // Create a new endpoint agent
      const newAgent: Agent = {
        agent_id: `endpoint_${Date.now()}`,
        name: config.name,
        type: 'endpoint',
        description: `Custom endpoint: ${config.endpoint_url}`,
        capabilities: ['chat'],
        status: 'active',
        config: {
          endpoint_url: config.endpoint_url,
          ...(config.api_key && { api_key: config.api_key }),
          ...(config.model_name && { model_name: config.model_name })
        }
      };

      // Add to local storage for persistence
      const customEndpoints = JSON.parse(localStorage.getItem('jarvis_custom_endpoints') || '[]');
      customEndpoints.push(newAgent);
      localStorage.setItem('jarvis_custom_endpoints', JSON.stringify(customEndpoints));

      // Add to agents list
      setAgents([...agents, newAgent]);
      setShowAddEndpoint(false);
    } catch (error) {
      console.error('Failed to add endpoint:', error);
    }
  };

  return (
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
    </div>
  );
}

export default App;