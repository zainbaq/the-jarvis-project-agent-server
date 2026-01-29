'use client';

import { useState } from 'react';
import {
  X,
  Settings,
  Server,
  Wrench,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCustomEndpoints } from '@/lib/hooks/use-custom-endpoints';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';
import { AddEndpointModal } from './AddEndpointModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'endpoints' | 'tools';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('endpoints');
  const [addEndpointOpen, setAddEndpointOpen] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const { endpoints, isLoading: endpointsLoading, deleteEndpoint, testEndpoint } = useCustomEndpoints();

  const { data: toolsStatus, isLoading: toolsLoading, refetch: refetchTools } = useQuery({
    queryKey: ['tools-status'],
    queryFn: () => apiClient.getToolsStatus(),
    enabled: isOpen && activeTab === 'tools',
  });

  const handleTestEndpoint = async (endpointId: string) => {
    setTestingEndpoint(endpointId);
    try {
      const result = await testEndpoint(endpointId);
      setTestResults((prev) => ({ ...prev, [endpointId]: result }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [endpointId]: { success: false, message: error instanceof Error ? error.message : 'Test failed' },
      }));
    } finally {
      setTestingEndpoint(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-[#1a0f2e] border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-600/30">
                <Settings className="w-5 h-5 text-purple-300" />
              </div>
              <h2 className="text-lg font-semibold text-white">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-purple-900/30 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-purple-500/20">
            <button
              onClick={() => setActiveTab('endpoints')}
              className={cn(
                'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all',
                activeTab === 'endpoints'
                  ? 'text-purple-300 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <Server className="w-4 h-4" />
              Custom Endpoints
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={cn(
                'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all',
                activeTab === 'tools'
                  ? 'text-purple-300 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <Wrench className="w-4 h-4" />
              Tools Status
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Endpoints Tab */}
            {activeTab === 'endpoints' && (
              <div className="space-y-4">
                {/* Add button */}
                <button
                  onClick={() => setAddEndpointOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-purple-500/30 rounded-xl text-purple-300 hover:bg-purple-900/20 hover:border-purple-500/50 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Endpoint
                </button>

                {/* Endpoints list */}
                {endpointsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                ) : endpoints.length === 0 ? (
                  <div className="text-center py-8">
                    <Server className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No custom endpoints configured</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Add your own OpenAI-compatible endpoints
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {endpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className="p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white">{endpoint.name}</div>
                            <div className="text-sm text-gray-400 truncate">{endpoint.url}</div>
                            <div className="text-xs text-gray-500 mt-1">Model: {endpoint.model}</div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleTestEndpoint(endpoint.id)}
                              disabled={testingEndpoint === endpoint.id}
                              className="p-2 text-gray-400 hover:text-purple-300 hover:bg-purple-800/40 rounded-lg transition-all"
                              title="Test connection"
                            >
                              {testingEndpoint === endpoint.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteEndpoint(endpoint.id)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-all"
                              title="Delete endpoint"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Test result */}
                        {testResults[endpoint.id] && (
                          <div
                            className={cn(
                              'mt-3 p-2 rounded-lg text-sm flex items-center gap-2',
                              testResults[endpoint.id].success
                                ? 'bg-green-500/10 text-green-300'
                                : 'bg-red-500/10 text-red-300'
                            )}
                          >
                            {testResults[endpoint.id].success ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            {testResults[endpoint.id].message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tools Tab */}
            {activeTab === 'tools' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-400">
                    Status of available tools and integrations
                  </p>
                  <button
                    onClick={() => refetchTools()}
                    className="p-2 text-gray-400 hover:text-purple-300 hover:bg-purple-800/40 rounded-lg transition-all"
                    title="Refresh status"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {toolsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                ) : toolsStatus ? (
                  <div className="space-y-3">
                    {Object.entries(toolsStatus.tools).map(([tool, isAvailable]) => (
                      <div
                        key={tool}
                        className="flex items-center justify-between p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              isAvailable ? 'bg-green-400' : 'bg-gray-500'
                            )}
                          />
                          <span className="text-white capitalize">
                            {tool.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-sm',
                            isAvailable ? 'text-green-300' : 'text-gray-500'
                          )}
                        >
                          {isAvailable ? 'Available' : 'Not configured'}
                        </span>
                      </div>
                    ))}

                    {/* Web search specific status */}
                    <div className="flex items-center justify-between p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            toolsStatus.web_search_configured ? 'bg-green-400' : 'bg-gray-500'
                          )}
                        />
                        <span className="text-white">Web Search (Serper API)</span>
                      </div>
                      <span
                        className={cn(
                          'text-sm',
                          toolsStatus.web_search_configured ? 'text-green-300' : 'text-gray-500'
                        )}
                      >
                        {toolsStatus.web_search_configured ? 'Configured' : 'API key missing'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    Failed to load tools status
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-purple-500/20 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Add Endpoint Modal */}
      <AddEndpointModal
        isOpen={addEndpointOpen}
        onClose={() => setAddEndpointOpen(false)}
      />
    </>
  );
}
