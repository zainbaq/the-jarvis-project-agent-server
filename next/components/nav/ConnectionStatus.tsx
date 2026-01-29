'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useSessionStore } from '@/lib/store/session-store';
import { cn } from '@/lib/utils/cn';

export function ConnectionStatus() {
  const { setConnected, setConnectionError } = useSessionStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.healthCheck(),
    refetchInterval: 30000, // Poll every 30 seconds
    retry: 2,
    enabled: mounted,
  });

  useEffect(() => {
    if (data) {
      setConnected(true);
    } else if (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [data, error, setConnected, setConnectionError]);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        <span className="text-xs text-gray-500 dark:text-gray-400">Connecting...</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
        <Loader2 className="w-3 h-3 text-blue-500 dark:text-blue-300 animate-spin" />
        <span className="text-xs text-blue-500 dark:text-blue-300">Connecting...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors">
        <WifiOff className="w-3 h-3 text-orange-500 dark:text-orange-400" />
        <span className="text-xs text-orange-500 dark:text-orange-400">Disconnected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
      <div className="relative">
        <Wifi className="w-3 h-3 text-green-500 dark:text-green-300" />
        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full animate-pulse" />
      </div>
      <span className="text-xs text-green-600 dark:text-green-300">Connected</span>
      {data.agents_loaded > 0 && (
        <span className="text-xs text-green-500/60 dark:text-green-300/60">
          ({data.agents_loaded} agents)
        </span>
      )}
    </div>
  );
}
