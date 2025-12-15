// KM Connector Drawer - Slide-in panel for managing KM connections

import { useState } from 'react';
import { useKMConnections } from '../../hooks/useKMConnections';
import { KMConnectionForm } from './KMConnectionForm';
import { KMConnectionList } from './KMConnectionList';

interface KMConnectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KMConnectorDrawer({ isOpen, onClose }: KMConnectorDrawerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const {
    connections,
    isLoading,
    error,
    isKMEnabled,
    activeConnectionIds,
    setKMEnabled,
    refetch,
  } = useKMConnections();

  if (!isOpen) return null;

  const activeCount = activeConnectionIds.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Knowledge Base</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Enable toggle */}
        <div className="p-4 border-b bg-gray-50">
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Enable Knowledge Base Search</span>
            <input
              type="checkbox"
              checked={isKMEnabled}
              onChange={(e) => setKMEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
            />
          </label>
          {isKMEnabled && activeCount === 0 && connections.length > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Select at least one connection below
            </p>
          )}
        </div>

        {/* Warning for multiple connections */}
        {activeCount >= 3 && (
          <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            Multiple active connections may affect response quality due to increased context.
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm mb-2">{error}</p>
              <button
                onClick={() => refetch()}
                className="text-sm text-blue-600 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : showAddForm ? (
            <KMConnectionForm
              onSuccess={() => setShowAddForm(false)}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <>
              {connections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No connections configured</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Connection
                  </button>
                </div>
              ) : (
                <KMConnectionList />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!showAddForm && connections.length > 0 && (
          <div className="p-4 border-t">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Connection
            </button>
          </div>
        )}
      </div>
    </>
  );
}
