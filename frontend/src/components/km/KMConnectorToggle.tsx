// KM Connector Toggle - Database icon button for chat input

import { useState } from 'react';
import { useKMConnections } from '../../hooks/useKMConnections';
import { KMConnectorDrawer } from './KMConnectorDrawer';

interface KMConnectorToggleProps {
  disabled?: boolean;
}

export function KMConnectorToggle({ disabled = false }: KMConnectorToggleProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const {
    connections,
    isKMEnabled,
    activeConnectionIds,
    hasActiveConnectionsWithSelections,
  } = useKMConnections();

  const activeCount = activeConnectionIds.length;
  const hasSelections = hasActiveConnectionsWithSelections();
  const isActive = isKMEnabled && hasSelections;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
          isActive
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'text-gray-600 hover:bg-gray-100'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={
          connections.length === 0
            ? 'No knowledge bases configured'
            : isActive
            ? `Knowledge base enabled (${activeCount} active)`
            : 'Configure knowledge base'
        }
      >
        {/* Database icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
        <span className="hidden sm:inline">
          {connections.length === 0
            ? 'Add KB'
            : isActive
            ? `KB (${activeCount})`
            : 'KB'}
        </span>
        {isActive && (
          <span className="w-2 h-2 bg-green-500 rounded-full" />
        )}
      </button>

      <KMConnectorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
