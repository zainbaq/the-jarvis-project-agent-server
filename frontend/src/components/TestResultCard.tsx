import React from 'react';
import { AgentTestResult } from '../types';
import { cn } from '@/components/ui/utils';

interface TestResultCardProps {
  testResult: AgentTestResult;
}

/**
 * Reusable test result display component
 * Consolidates the test result display pattern from ConnectionStatus and SettingsModal
 */
export function TestResultCard({ testResult }: TestResultCardProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border text-sm',
        testResult.success
          ? 'border-green-500/30 bg-green-500/10 text-green-300'
          : 'border-red-500/30 bg-red-500/10 text-red-300'
      )}
    >
      <p className="font-medium mb-1">{testResult.message}</p>
      {testResult.response_preview && (
        <p className="text-xs text-gray-300 italic mt-2">
          "{testResult.response_preview}"
        </p>
      )}
      {testResult.error && (
        <p className="text-xs text-red-400 mt-2">{testResult.error}</p>
      )}
    </div>
  );
}
