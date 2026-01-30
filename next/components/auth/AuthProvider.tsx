'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';

interface AuthProviderProps {
  children: React.ReactNode;
}

// Pages that don't require authentication
const publicPaths = ['/login', '/auth/callback'];

export function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading) return;

    const isPublicPath = publicPaths.some((path) => pathname?.startsWith(path));

    if (!isAuthenticated && !isPublicPath) {
      router.push('/login');
    } else if (isAuthenticated && pathname === '/login') {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0d0618]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-400 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  // If not authenticated and not on public path, show loading while redirecting
  const isPublicPath = publicPaths.some((path) => pathname?.startsWith(path));
  if (!isAuthenticated && !isPublicPath) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0d0618]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-400 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 dark:text-gray-400">Redirecting to login...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
