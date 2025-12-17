import React from 'react';
import { Sparkles, MessageSquare, Workflow, Settings } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import { colors, components, spacing, typography, borderRadius, iconSizes } from '../styles/theme';
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
      <div className={cn(spacing.containerMain, spacing.containerMainVertical)}>
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-600/30">
              <Sparkles className={cn(iconSizes.xl, 'text-purple-300')} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">The Jarvis Project</h1>
              <p className="text-sm text-gray-400 mt-0.5">Promethean Labs</p>
            </div>
          </div>

          {/* Tabs - Centered */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTabChange('chat')}
              className={getTabClasses(activeTab === 'chat')}
            >
              <MessageSquare className={iconSizes.md} />
              <span>Chat</span>
            </button>

            <button
              onClick={() => onTabChange('workflows')}
              className={getTabClasses(activeTab === 'workflows')}
            >
              <Workflow className={iconSizes.md} />
              <span>Workflows</span>
            </button>
          </div>

          {/* Status and Settings */}
          <div className="flex items-center gap-4">
            <ConnectionStatus selectedAgent={selectedAgent} />
            <button
              onClick={onSettingsClick}
              className={components.buttonVariants.settingsIcon}
            >
              <Settings className={cn(iconSizes.lg, 'text-gray-400 hover:text-gray-300')} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}