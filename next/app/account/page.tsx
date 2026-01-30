'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { User, LogOut, Key, Shield } from 'lucide-react';

export default function AccountPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-400 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0618] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          Account Settings
        </h1>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-900/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {user.username}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  User ID: {user.userId}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">Authentication</span>
              </div>
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">Username</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {user.username}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Card */}
        <div className="bg-white dark:bg-gray-900/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Actions
          </h3>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-xl transition-all duration-200 border border-red-200 dark:border-red-800"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            To change your password or manage other account settings, please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
