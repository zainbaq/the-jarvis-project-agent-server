import React, { useState, useEffect } from 'react';
import { X, Globe, Wrench, CheckCircle, XCircle, Loader } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import { colors, components, spacing, typography, borderRadius } from '../styles/theme';
import { cn } from '@/components/ui/utils';
import { ToolsStatus, ToolsTestResult } from '../types';
import { apiClient } from '../api/client';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [backendUrl, setBackendUrl] = useState(
    localStorage.getItem('jarvis_backend_url') || 'http://localhost:8000'
  );
  const [demoMode, setDemoMode] = useState(
    localStorage.getItem('jarvis_demo_mode') === 'true'
  );
  const [toolsStatus, setToolsStatus] = useState<ToolsStatus | null>(null);
  const [toolsTestResult, setToolsTestResult] = useState<ToolsTestResult | null>(null);
  const [testingTools, setTestingTools] = useState(false);
  const [loadingTools, setLoadingTools] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadToolsStatus();
    }
  }, [isOpen]);

  const loadToolsStatus = async () => {
    setLoadingTools(true);
    try {
      const status = await apiClient.getToolsStatus();
      setToolsStatus(status);
    } catch (error) {
      console.error('Failed to load tools status:', error);
    } finally {
      setLoadingTools(false);
    }
  };

  const handleTestTools = async () => {
    setTestingTools(true);
    setToolsTestResult(null);
    try {
      const result = await apiClient.testTools();
      setToolsTestResult(result);
    } catch (error) {
      setToolsTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Tools test failed'
      });
    } finally {
      setTestingTools(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('jarvis_backend_url', backendUrl);
    localStorage.setItem('jarvis_demo_mode', demoMode ? 'true' : 'false');
    
    // Trigger storage event to reload agents
    window.dispatchEvent(new Event('storage'));
    
    onClose();
  };

  return (
    <div className={components.modal.backdrop}>
      {/* Backdrop */}
      <div 
        className={components.modal.backdropBg}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={components.modal.container}>
        {/* Header */}
        <div className={components.modal.header}>
          <h2 className={cn(typography.heading.lg, colors.text.primary)}>Settings</h2>
          <button
            onClick={onClose}
            className={components.button.icon}
          >
            <X className={cn('w-5 h-5', colors.text.secondary)} />
          </button>
        </div>

        {/* Content */}
        <div className={components.modal.content}>
          {/* Connection Status */}
          <div>
            <label className={cn(typography.body.base, colors.text.secondary, 'mb-2 block')}>
              Connection Status
            </label>
            <ConnectionStatus />
          </div>

          {/* Backend URL */}
          <div>
            <label className={cn(typography.body.base, colors.text.secondary, 'mb-2 block')}>
              Backend URL
            </label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className={components.input}
            />
            <p className={cn(typography.body.small, colors.text.muted, 'mt-2')}>
              The URL of your JARVIS Agent Server backend
            </p>
          </div>

          {/* Demo Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className={cn(typography.body.base, colors.text.secondary, 'block')}>
                Demo Mode
              </label>
              <p className={cn(typography.body.small, colors.text.muted, 'mt-1')}>
                Use demo data when backend is unavailable
              </p>
            </div>
            <button
              onClick={() => setDemoMode(!demoMode)}
              className={cn(
                components.toggle.container,
                demoMode ? components.toggle.active : components.toggle.inactive
              )}
            >
              <span
                className={cn(
                  components.toggle.knob,
                  demoMode ? components.toggle.knobActive : components.toggle.knobInactive
                )}
              />
            </button>
          </div>

          {/* Tools Status */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={cn(typography.body.base, colors.text.secondary)}>
                Tools Status
              </label>
              <button
                onClick={handleTestTools}
                disabled={testingTools}
                className={cn(
                  components.button.secondary,
                  'text-xs',
                  testingTools && 'opacity-50 cursor-not-allowed'
                )}
              >
                {testingTools ? (
                  <>
                    <Loader className="w-3 h-3 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Wrench className="w-3 h-3" />
                    <span>Test Tools</span>
                  </>
                )}
              </button>
            </div>

            {loadingTools ? (
              <div className={cn(components.card.base, 'p-3')}>
                <p className={cn(typography.body.small, colors.text.muted)}>Loading tools status...</p>
              </div>
            ) : toolsStatus ? (
              <div className={cn(components.card.base, 'p-3', spacing.compact)}>
                {Object.entries(toolsStatus.tools).map(([tool, enabled]) => (
                  <div key={tool} className="flex items-center justify-between">
                    <span className={cn(typography.body.small, colors.text.secondary)}>
                      {tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {enabled ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={cn(components.card.base, 'p-3')}>
                <p className={cn(typography.body.small, colors.text.muted)}>Unable to load tools status</p>
              </div>
            )}

            {toolsTestResult && (
              <div className={cn(
                'mt-2 p-3',
                borderRadius.md,
                'border',
                toolsTestResult.success
                  ? 'border-green-500/30 bg-green-500/10'
                  : 'border-red-500/30 bg-red-500/10'
              )}>
                <p className={cn(
                  typography.body.small,
                  toolsTestResult.success ? 'text-green-300' : 'text-red-300'
                )}>
                  {toolsTestResult.success ? 'All tools functional' : `Error: ${toolsTestResult.error}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={components.modal.footer}>
          <button
            onClick={onClose}
            className={components.button.ghost}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={components.button.primary}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}