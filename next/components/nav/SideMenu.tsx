'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Workflow, X, Zap, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navigation = [
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'Account', href: '/account', icon: User },
];

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Side panel */}
      <div
        className={cn(
          'fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transform transition-transform duration-300 ease-out shadow-2xl',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-500/20">
              <Zap className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Menu</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                )}
              >
                <Icon className={cn(
                  'w-5 h-5',
                  isActive ? 'text-orange-500 dark:text-orange-400' : ''
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
            Promethean AI v1.0
          </p>
        </div>
      </div>
    </>
  );
}
