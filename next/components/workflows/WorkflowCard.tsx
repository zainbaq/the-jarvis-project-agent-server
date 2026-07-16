'use client';

import {
  Workflow,
  ChevronRight,
  FileCode,
  FileSearch,
  Globe,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import type { Agent } from '@/lib/api/types';

interface WorkflowCardProps {
  agent: Agent;
}

const workflowConfig: Record<
  string,
  {
    icon: React.ReactNode;
    gradient: string;
    glow: string;
    accent: string;
  }
> = {
  developer_workflow: {
    icon: <FileCode className="w-6 h-6" />,
    gradient: 'from-purple-500 to-indigo-600',
    glow: 'group-hover:shadow-purple-500/30',
    accent: 'purple',
  },
  web_search_workflow: {
    icon: <Globe className="w-6 h-6" />,
    gradient: 'from-blue-500 to-cyan-600',
    glow: 'group-hover:shadow-blue-500/30',
    accent: 'blue',
  },
  document_intelligence: {
    icon: <FileSearch className="w-6 h-6" />,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'group-hover:shadow-emerald-500/30',
    accent: 'emerald',
  },
};

const defaultConfig = {
  icon: <Workflow className="w-6 h-6" />,
  gradient: 'from-orange-500 to-amber-600',
  glow: 'group-hover:shadow-orange-500/30',
  accent: 'orange',
};

export function WorkflowCard({ agent }: WorkflowCardProps) {
  const config = workflowConfig[agent.agent_id] || defaultConfig;

  return (
    <Link
      href={`/workflows/${agent.agent_id}`}
      className={cn(
        'group relative block overflow-hidden rounded-2xl transition-all duration-300',
        'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10',
        'hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.07]',
        'hover:scale-[1.02] hover:shadow-2xl',
        config.glow
      )}
    >
      {/* Gradient overlay on hover */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
          `bg-gradient-to-r ${config.gradient}`,
          'opacity-5'
        )}
      />

      {/* Animated border gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div
          className={cn(
            'absolute inset-0 rounded-2xl',
            `bg-gradient-to-r ${config.gradient}`,
            'opacity-10 dark:opacity-20 blur-sm'
          )}
        />
      </div>

      <div className="relative p-6">
        <div className="flex items-start gap-4">
          {/* Animated Icon */}
          <div className="relative">
            <div
              className={cn(
                'absolute inset-0 rounded-xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300',
                `bg-gradient-to-r ${config.gradient}`
              )}
            />
            <div
              className={cn(
                'relative p-4 rounded-xl text-white transition-all duration-300',
                `bg-gradient-to-br ${config.gradient}`,
                'shadow-lg group-hover:scale-110 group-hover:rotate-3'
              )}
            >
              {config.icon}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {agent.name}
              </h3>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 group-hover:text-yellow-500 dark:group-hover:text-yellow-400 transition-all duration-300" />
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
              {agent.description || 'Execute this workflow to process tasks.'}
            </p>

            {/* Capabilities with improved styling */}
            <div className="flex flex-wrap gap-2 mt-4">
              {agent.capabilities.slice(0, 4).map((cap) => (
                <span
                  key={cap}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-lg font-medium transition-all duration-300',
                    'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400',
                    'group-hover:bg-gray-200 dark:group-hover:bg-white/10 group-hover:border-gray-300 dark:group-hover:border-white/20 group-hover:text-gray-900 dark:group-hover:text-white'
                  )}
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-all duration-500',
            `bg-gradient-to-r ${config.gradient}`
          )}
        />
      </div>
    </Link>
  );
}
