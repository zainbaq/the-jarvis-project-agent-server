'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { useSessionStore } from '@/lib/store/session-store';
import { AuthProvider } from '@/components/auth/AuthProvider';

function SessionInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useSessionStore((state) => state.initialize);
  const isInitialized = useSessionStore((state) => state.isInitialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show nothing until session is initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0d0618]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-400 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 dark:text-gray-400">Initializing...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SessionInitializer>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                classNames: {
                  toast: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white',
                },
              }}
            />
          </SessionInitializer>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
