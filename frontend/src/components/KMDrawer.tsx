// KM Drawer - Slide-in panel for managing Knowledge Base connections

import { useState, useEffect } from 'react';
import { Database, X, Plus, RefreshCw, Trash2, ChevronDown, ChevronUp, AlertTriangle, ExternalLink } from 'lucide-react';
import { useKMConnections } from '../hooks/useKMConnections';
import { KMConnectionForm } from './KMConnectionForm';
import { KMCollectionSelector } from './KMCollectionSelector';
import { colors, typography } from '../styles/theme';
import { cn } from '@/components/ui/utils';
import type { KMConnection } from '../types';

interface KMDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KMDrawer({ isOpen, onClose }: KMDrawerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const {
    connections,
    isLoading,
    error,
    isKMEnabled,
    activeConnectionIds,
    setKMEnabled,
    toggleConnectionActive,
    deleteConnection,
    syncConnection,
    createConnection,
    isCreating,
    kmServerUrl,
    updateSelections,
    isUpdating,
    refetch,
  } = useKMConnections();

  const activeCount = activeConnectionIds.length;

  // Handle animation timing
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this connection?')) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteConnection(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      await syncConnection(id);
    } finally {
      setSyncingId(null);
    }
  };

  const getStatusColor = (status: KMConnection['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!isVisible && !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-96 z-50 bg-[#1a0f2e] border-l border-purple-500/30 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            <h2 className={cn('text-lg font-semibold', colors.text.primary)}>Knowledge Base</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-purple-900/50 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className={cn('px-4 pt-2 text-sm', colors.text.secondary)}>
          Connect to your knowledge management server
        </p>

        {/* Enable toggle */}
        <div className="px-4 py-4 border-b border-purple-500/20">
          <label className="flex items-center justify-between cursor-pointer">
            <span className={cn(typography.body.base, colors.text.primary, 'font-medium')}>
              Enable Knowledge Base Search
            </span>
            <button
              onClick={() => setKMEnabled(!isKMEnabled)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                isKMEnabled ? 'bg-purple-600' : 'bg-gray-600'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  isKMEnabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </label>
          {isKMEnabled && activeCount === 0 && connections.length > 0 && (
            <p className="text-xs text-amber-400 mt-2">
              Select at least one connection below
            </p>
          )}
        </div>

        {/* Warning for multiple connections */}
        {activeCount >= 3 && (
          <div className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span className={cn(typography.body.small, 'text-amber-300')}>
              Multiple active connections may affect response quality due to increased context.
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className={cn(typography.body.base, 'text-red-400 mb-2')}>{error}</p>
              <button
                onClick={() => refetch()}
                className="text-sm text-purple-400 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : showAddForm ? (
            <KMConnectionForm
              onSuccess={() => setShowAddForm(false)}
              onCancel={() => setShowAddForm(false)}
              createConnection={createConnection}
              isCreating={isCreating}
            />
          ) : connections.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-purple-500/30 mx-auto mb-4" />
              <p className={cn(colors.text.secondary, 'mb-4')}>No connections configured</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Add Connection
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => {
                const isActive = activeConnectionIds.includes(connection.id);
                const isExpanded = expandedId === connection.id;
                const hasSelections =
                  connection.selected_collection_names.length > 0 ||
                  connection.selected_corpus_ids.length > 0;

                return (
                  <div
                    key={connection.id}
                    className={cn(
                      'border rounded-lg overflow-hidden transition-colors',
                      isActive
                        ? 'border-purple-500/50 bg-purple-900/30'
                        : 'border-purple-500/20 bg-purple-900/10'
                    )}
                  >
                    {/* Connection Header */}
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Enable Toggle */}
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleConnectionActive(connection.id)}
                            className="w-4 h-4 rounded border-purple-500/50 bg-purple-900/50 text-purple-600 focus:ring-purple-500"
                          />

                          {/* Status Indicator */}
                          <div
                            className={cn('w-2 h-2 rounded-full', getStatusColor(connection.status))}
                            title={`Status: ${connection.status}`}
                          />

                          {/* Connection Info */}
                          <div>
                            <div className={cn(typography.body.base, colors.text.primary, 'font-medium')}>
                              {connection.name}
                            </div>
                            <div className={cn(typography.body.small, colors.text.secondary)}>
                              {connection.username}
                              {hasSelections && (
                                <span className="ml-2 text-purple-400">
                                  ({connection.selected_collection_names.length} collections,{' '}
                                  {connection.selected_corpus_ids.length} corpuses)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {/* Manage Button - Opens KM server in new tab */}
                          {kmServerUrl && (
                            <button
                              onClick={() => window.open(kmServerUrl, '_blank')}
                              className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-900/50 rounded transition-colors"
                              title="Manage in KM Server"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}

                          {/* Sync Button */}
                          <button
                            onClick={() => handleSync(connection.id)}
                            disabled={syncingId === connection.id}
                            className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-900/50 rounded transition-colors disabled:opacity-50"
                            title="Sync collections"
                          >
                            <RefreshCw
                              className={cn('w-4 h-4', syncingId === connection.id && 'animate-spin')}
                            />
                          </button>

                          {/* Expand Button */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : connection.id)}
                            className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-900/50 rounded transition-colors"
                            title={isExpanded ? 'Collapse' : 'Select collections'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(connection.id)}
                            disabled={deletingId === connection.id}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                            title="Delete connection"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Error Message */}
                      {connection.last_error && (
                        <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                          {connection.last_error}
                        </div>
                      )}

                      {/* Warning: Active but no selections */}
                      {isActive && !hasSelections && (
                        <div className="mt-2 text-xs text-amber-400 bg-amber-900/20 p-2 rounded">
                          No collections selected. Expand to select collections or corpuses.
                        </div>
                      )}
                    </div>

                    {/* Expanded: Collection Selector */}
                    {isExpanded && (
                      <div className="border-t border-purple-500/20 bg-purple-950/30 p-3">
                        <KMCollectionSelector
                          connection={connection}
                          updateSelections={updateSelections}
                          isUpdating={isUpdating}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!showAddForm && connections.length > 0 && (
          <div className="p-4 border-t border-purple-500/20">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Connection
            </button>
          </div>
        )}
      </div>
    </>
  );
}
