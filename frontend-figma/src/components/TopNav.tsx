import React from 'react';
import { Sparkles, MessageSquare, Workflow, Settings } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import { colors, components, spacing, typography, borderRadius } from '../styles/theme';
import { cn } from '@/components/ui/utils';
import { Agent } from '../types';

interface TopNavProps {
  activeTab: 'chat' | 'workflows';
  onTabChange: (tab: 'chat' | 'workflows') => void;
  onSettingsClick: () => void;
  selectedAgent?: Agent | null;
}

export function TopNav({ activeTab, onTabChange, onSettingsClick, selectedAgent }: TopNavProps) {
  const getTabClasses = (isActive: boolean) => cn(
    'px-6 py-3 text-base font-medium',
    'rounded-lg',
    'transition-all duration-200 flex items-center gap-2.5',
    isActive
      ? 'bg-purple-600/30 text-white shadow-lg'
      : 'text-gray-400 hover:text-white hover:bg-purple-900/30'
  );

  return (
    <div className={cn('border-b', colors.border.default)}>
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-600/30">
              <Sparkles className="w-7 h-7 text-purple-300" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">JARVIS AI</h1>
              <p className="text-sm text-purple-300/70 mt-0.5">Your AI Agent Platform</p>
            </div>
          </div>

          {/* Tabs - Centered */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTabChange('chat')}
              className={getTabClasses(activeTab === 'chat')}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => onTabChange('workflows')}
              className={getTabClasses(activeTab === 'workflows')}
            >
              <Workflow className="w-5 h-5" />
              <span>Workflows</span>
            </button>
          </div>

          {/* Status and Settings */}
          <div className="flex items-center gap-4">
            <ConnectionStatus selectedAgent={selectedAgent} />
            <button
              onClick={onSettingsClick}
              className="p-2.5 rounded-lg hover:bg-purple-900/30 transition-all duration-200 active:scale-95"
            >
              <Settings className="w-6 h-6 text-gray-400 hover:text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}