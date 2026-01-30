'use client';

import { useState, useEffect } from 'react';
import { Menu, Settings, Zap, Sun, Moon, LogOut, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { ConnectionStatus } from './ConnectionStatus';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { SideMenu } from './SideMenu';
import { useAuthStore } from '@/lib/auth';

export function TopNav() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, logout, isAuthenticated } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <header className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        {/* Left side: Hamburger + Logo */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Hamburger menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-orange-100 dark:bg-orange-500/20">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-orange-500 dark:text-orange-400" />
            </div>
            <span className="hidden sm:inline text-lg font-semibold text-gray-900 dark:text-white">Promethean AI</span>
            <span className="sm:hidden text-base font-semibold text-gray-900 dark:text-white">Promethean</span>
          </div>
        </div>

        {/* Right side: Theme toggle, Status + Settings */}
        <div className="flex items-center gap-1 md:gap-2">
          <ConnectionStatus />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 md:p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {mounted && (theme === 'dark' ? (
              <Sun className="w-4 h-4 md:w-5 md:h-5" />
            ) : (
              <Moon className="w-4 h-4 md:w-5 md:h-5" />
            ))}
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 md:p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* User/Logout button */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="p-2 md:p-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              aria-label="Logout"
              title={user?.username ? `Logged in as ${user.username}` : 'Logout'}
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
        </div>
      </header>

      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
