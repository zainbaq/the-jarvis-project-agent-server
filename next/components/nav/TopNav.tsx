'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Workflow, Settings, Zap, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils/cn';
import { ConnectionStatus } from './ConnectionStatus';
import { SettingsModal } from '@/components/modals/SettingsModal';

const navigation = [
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
];

export function TopNav() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-500/20">
            <Zap className="w-5 h-5 text-orange-500 dark:text-orange-400" />
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">Promethean AI</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right side: Theme toggle, Status + Settings */}
        <div className="flex items-center gap-2">
          <ConnectionStatus />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {mounted && (theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            ))}
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
