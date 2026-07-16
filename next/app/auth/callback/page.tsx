'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';

/**
 * OAuth Callback Page
 *
 * This page handles the redirect back from Cognito Hosted UI.
 * Amplify automatically processes the OAuth tokens from the URL.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { initialize, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Re-initialize auth to process the OAuth callback tokens
    const handleCallback = async () => {
      await initialize();
    };
    handleCallback();
  }, [initialize]);

  useEffect(() => {
    // Once authenticated, redirect to home
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d0618] dark:to-[#1a0a2e]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-6">
          <span className="text-2xl font-bold text-white">P</span>
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg text-gray-600 dark:text-gray-300">
            Completing sign in...
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Please wait while we authenticate your session
        </p>
      </div>
    </div>
  );
}
