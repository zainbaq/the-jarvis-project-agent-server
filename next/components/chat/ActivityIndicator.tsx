'use client';

import { Sparkles, Terminal, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { StatusUpdate, StatusState } from '@/lib/api/types';

interface ActivityIndicatorProps {
  status: StatusUpdate;
}

interface Step {
  id: StatusState;
  label: string;
  icon: React.ElementType;
}

const steps: Step[] = [
  { id: 'thinking', label: 'Analyzing', icon: Sparkles },
  { id: 'executing', label: 'Running code', icon: Terminal },
  { id: 'processing', label: 'Processing', icon: Loader2 },
];

function getStepStatus(stepId: StatusState, currentState: StatusState): 'completed' | 'current' | 'pending' {
  const stepIndex = steps.findIndex(s => s.id === stepId);
  const currentIndex = steps.findIndex(s => s.id === currentState);

  // Handle 'generating' state - it means we're past all the steps
  if (currentState === 'generating') {
    return 'completed';
  }

  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'current';
  return 'pending';
}

export function ActivityIndicator({ status }: ActivityIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* Steps indicator */}
      <div className="flex items-center gap-0">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.id, status.state);
          const Icon = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step */}
              <div className="flex flex-col items-center gap-1.5">
                {/* Icon circle */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                    stepStatus === 'completed' && 'bg-orange-500 text-white',
                    stepStatus === 'current' && 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500 text-orange-500',
                    stepStatus === 'pending' && 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                  )}
                >
                  {stepStatus === 'completed' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className={cn(
                      'w-4 h-4',
                      stepStatus === 'current' && 'animate-pulse'
                    )} />
                  )}
                </div>
                {/* Label */}
                <span className={cn(
                  'text-xs font-medium whitespace-nowrap transition-colors',
                  stepStatus === 'completed' && 'text-orange-500 dark:text-orange-400',
                  stepStatus === 'current' && 'text-orange-600 dark:text-orange-400',
                  stepStatus === 'pending' && 'text-gray-400 dark:text-gray-500'
                )}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex items-center px-2 -mt-5">
                  <div
                    className={cn(
                      'w-8 h-0.5 transition-colors duration-300',
                      getStepStatus(steps[index + 1].id, status.state) !== 'pending'
                        ? 'bg-orange-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status message with animated dots */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{status.message}</span>
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 dark:bg-orange-500 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 dark:bg-orange-500 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 dark:bg-orange-500 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
        </div>
      </div>
    </div>
  );
}
