'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const { loginWithHostedUI, isAuthenticated, isLoading, error } = useAuthStore();
  const router = useRouter();

  // If already authenticated, redirect to home
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async () => {
    await loginWithHostedUI();
  };

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d0618] dark:to-[#1a0a2e]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-400 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d0618] dark:to-[#1a0a2e] px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4">
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Promethean AI
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Sign in to continue
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-900/50 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <LogIn className="w-5 h-5" />
            <span>Sign In with Cognito</span>
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            You will be redirected to the secure login page
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don&apos;t have an account? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
