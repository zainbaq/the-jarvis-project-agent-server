import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader, RefreshCw, PlayCircle, X, TestTube2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { DetailedStatus, Agent } from '../types';
import { statusBadge, components, spacing, iconSizes } from '../styles/theme';
import { cn } from '@/components/ui/utils';
import { TestResultCard } from './TestResultCard';
import { useAgentTest } from '../hooks/useAgentTest';

interface ConnectionStatusProps {
  selectedAgent?: Agent | null;
}

export function ConnectionStatus({ selectedAgent }: ConnectionStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<DetailedStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Use consolidated agent test hook
  const { testingAgent, testResult, testAgent } = useAgentTest();

  const checkConnection = async () => {
    setStatus('checking');
    setError(null);
    setDetails(null);

    try {
      const statusDetails = await apiClient.getStatus();
      setStatus('connected');
      setDetails(statusDetails);
    } catch (err) {
      setStatus('disconnected');
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const enableDemoMode = () => {
    localStorage.setItem('jarvis_demo_mode', 'true');
    window.location.reload();
  };

  const handleTestAgent = () => testAgent(selectedAgent ?? null);

  useEffect(() => {
    checkConnection();
  }, []);

  // Compact status indicator for top nav
  if (status === 'connected') {
    const isDemoMode = details?.status === 'demo';
    return (
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={cn(
            spacing.buttonPadding.sm,
            'rounded-lg text-xs flex items-center gap-2 transition-all',
            isDemoMode ? statusBadge.demo : statusBadge.connected
          )}
        >
          <span className={cn('w-2 h-2 rounded-full animate-pulse', isDemoMode ? 'bg-yellow-400' : 'bg-green-400')} />
          <span>{isDemoMode ? 'Demo' : 'Connected'}</span>
        </button>
        
        {showDetails && (
          <div className={cn('absolute top-full right-0 mt-2 w-96 bg-[#1a0f2e] border border-purple-500/30 rounded-md shadow-2xl z-50 overflow-hidden p-6')}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isDemoMode ? (
                  <PlayCircle className={cn(iconSizes.md, 'text-yellow-400')} />
                ) : (
                  <CheckCircle className={cn(iconSizes.md, 'text-green-400')} />
                )}
                <span className={cn('text-base font-medium', isDemoMode ? 'text-yellow-300' : 'text-green-300')}>
                  {isDemoMode ? 'Demo Mode' : 'Backend Connected'}
                </span>
              </div>
              <button onClick={() => setShowDetails(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-all">
                <X className={cn(iconSizes.sm, 'text-gray-400')} />
              </button>
            </div>

            {details && (
              <div className="text-sm text-gray-400 space-y-2 mb-4 pb-4 border-b border-white/10">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span className="text-white font-medium">{details.version}</span>
                </div>
                <div className="flex justify-between">
                  <span>Agents:</span>
                  <span className="text-white font-medium">{details.agents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span className="text-white font-medium">{Math.floor(details.uptime / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span>Registry:</span>
                  <span className={cn('font-medium', details.registry.initialized ? 'text-green-400' : 'text-yellow-400')}>
                    {details.registry.initialized ? 'Initialized' : 'Loading'}
                  </span>
                </div>
              </div>
            )}

            {selectedAgent && (
              <div className="space-y-3">
                <button
                  onClick={handleTestAgent}
                  disabled={testingAgent}
                  className={components.buttonVariants.testAgent}
                >
                  {testingAgent ? (
                    <>
                      <Loader className={cn(iconSizes.sm, 'animate-spin')} />
                      <span>Testing {selectedAgent.name}...</span>
                    </>
                  ) : (
                    <>
                      <TestTube2 className={iconSizes.sm} />
                      <span>Test Agent Connection</span>
                    </>
                  )}
                </button>

                {testResult && <TestResultCard testResult={testResult} />}
              </div>
            )}

            {isDemoMode && (
              <p className="text-yellow-300/80 text-xs mt-4 pt-4 border-t border-white/10">
                Using mock data. Configure backend to connect to real API.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (status === 'disconnected') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={cn(spacing.buttonPadding.sm, 'rounded-lg text-xs flex items-center gap-2 transition-all', statusBadge.disconnected)}
        >
          <span className="w-2 h-2 rounded-full bg-orange-400" />
          <span>Disconnected</span>
        </button>

        {showDetails && (
          <div className={cn('absolute top-full right-0 mt-2 w-96 bg-[#1a0f2e] border border-red-500/30 rounded-md shadow-2xl z-50 overflow-hidden p-6')}>
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className={cn(iconSizes.md, 'text-red-400 flex-shrink-0 mt-0.5')} />
              <div className="flex-1">
                <h3 className="text-sm text-red-300 mb-2">Cannot connect to backend</h3>
                <p className="text-xs text-red-400/70">{error}</p>
              </div>
              <button onClick={() => setShowDetails(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4 text-xs">
              <div>
                <p className="text-gray-200 mb-2"><strong>✅ Quick Solution: Demo Mode</strong></p>
                <button
                  onClick={enableDemoMode}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" />
                  Try Demo Mode
                </button>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-gray-200 mb-2"><strong>🔧 Connect to Real Backend:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-gray-400">
                  <li>Install ngrok</li>
                  <li>Run: <code className="bg-white/10 px-1 py-0.5 rounded">ngrok http 8000</code></li>
                  <li>Copy HTTPS URL to Backend Settings</li>
                </ol>
              </div>

              <button
                onClick={() => { checkConnection(); setShowDetails(false); }}
                className="w-full px-4 py-2 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Connection
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 text-blue-300">
      <Loader className="w-3 h-3 animate-spin" />
      <span>Connecting...</span>
    </div>
  );
}