// import React from 'react';
import { Sparkles, MessageSquare, Workflow, Settings } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import { colors, components, iconSizes } from '../styles/theme';
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
    components.buttonVariants.tabBase,
    isActive
      ? components.buttonVariants.tabActive
      : components.buttonVariants.tabInactive
  );

  return (
    <div className={cn('border-b', colors.border.default)}>
      <div style={{ padding: '32px 48px' }}>
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center" style={{ gap: '16px' }}>
            <div className="rounded-lg bg-purple-600/30" style={{ padding: '10px' }}>
              <Sparkles className={cn(iconSizes.lg, 'text-purple-300')} />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">The Jarvis Project</h1>
              <p className="text-xs text-gray-400">Promethean Labs</p>
            </div>
          </div>

          {/* Tabs - Centered */}
          <div className="flex items-center" style={{ gap: '16px' }}>
            <button
              onClick={() => onTabChange('chat')}
              className={getTabClasses(activeTab === 'chat')}
              style={{ padding: '12px 24px', gap: '8px' }}
            >
              <MessageSquare className={iconSizes.md} />
              <span>Chat</span>
            </button>

            <button
              onClick={() => onTabChange('workflows')}
              className={getTabClasses(activeTab === 'workflows')}
              style={{ padding: '12px 24px', gap: '8px' }}
            >
              <Workflow className={iconSizes.md} />
              <span>Workflows</span>
            </button>
          </div>

          {/* Status and Settings */}
          <div className="flex items-center" style={{ gap: '24px' }}>
            <ConnectionStatus selectedAgent={selectedAgent} />
            <button
              onClick={onSettingsClick}
              className={components.buttonVariants.settingsIcon}
              style={{ padding: '12px' }}
            >
              <Settings className={cn(iconSizes.lg, 'text-gray-400 hover:text-gray-300')} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}