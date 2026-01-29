'use client';

import { useState } from 'react';
import {
  X,
  Database,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { useKMConnections } from '@/lib/hooks/use-km-connections';
import { useChatStore } from '@/lib/store/chat-store';
import { cn } from '@/lib/utils/cn';
import type { KMConnection, KMConnectionCreate } from '@/lib/api/types';

interface KMDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function ConnectionCard({
  connection,
  isSelected,
  onToggleSelect,
  onSync,
  onDelete,
  isSyncing,
}: {
  connection: KMConnection;
  isSelected: boolean;
  onToggleSelect: () => void;
  onSync: () => void;
  onDelete: () => void;
  isSyncing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const totalCollections = connection.collections.length;
  const totalCorpuses = connection.corpuses.length;
  const selectedCount =
    connection.selected_collection_names.length + connection.selected_corpus_ids.length;

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden transition-all',
        isSelected
          ? 'border-purple-500/50 bg-purple-900/20'
          : 'border-purple-500/20 bg-purple-900/10'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={onToggleSelect}
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
            isSelected
              ? 'bg-purple-600 border-purple-600'
              : 'border-gray-500 hover:border-purple-400'
          )}
        >
          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">{connection.name}</span>
            <span
              className={cn(
                'px-1.5 py-0.5 text-xs rounded',
                connection.status === 'active'
                  ? 'bg-green-500/20 text-green-300'
                  : connection.status === 'error'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-gray-500/20 text-gray-400'
              )}
            >
              {connection.status}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {totalCollections} collections, {totalCorpuses} corpuses
            {selectedCount > 0 && ` (${selectedCount} selected)`}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="p-1.5 text-gray-400 hover:text-purple-300 hover:bg-purple-800/40 rounded transition-all"
            title="Sync"
          >
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-all"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-gray-400 hover:text-purple-300 hover:bg-purple-800/40 rounded transition-all"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-purple-500/20 pt-3">
          {/* Collections */}
          {connection.collections.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <FolderOpen className="w-3 h-3" />
                Collections
              </div>
              <div className="space-y-1">
                {connection.collections.map((col) => (
                  <div
                    key={col.name}
                    className={cn(
                      'flex items-center justify-between px-2 py-1.5 rounded text-sm',
                      connection.selected_collection_names.includes(col.name)
                        ? 'bg-purple-600/20 text-purple-200'
                        : 'text-gray-400'
                    )}
                  >
                    <span className="truncate">{col.name}</span>
                    <span className="text-xs text-gray-500">{col.num_chunks} chunks</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Corpuses */}
          {connection.corpuses.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Corpuses
              </div>
              <div className="space-y-1">
                {connection.corpuses.slice(0, 5).map((corpus) => (
                  <div
                    key={corpus.id}
                    className={cn(
                      'flex items-center justify-between px-2 py-1.5 rounded text-sm',
                      connection.selected_corpus_ids.includes(corpus.id)
                        ? 'bg-purple-600/20 text-purple-200'
                        : 'text-gray-400'
                    )}
                  >
                    <span className="truncate">{corpus.display_name}</span>
                    <span className="text-xs text-gray-500">{corpus.chunk_count} chunks</span>
                  </div>
                ))}
                {connection.corpuses.length > 5 && (
                  <div className="text-xs text-gray-500 px-2">
                    +{connection.corpuses.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddConnectionForm({ onSubmit, isLoading }: { onSubmit: (data: KMConnectionCreate) => void; isLoading: boolean }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) return;
    onSubmit({ name, username, password });
    setName('');
    setUsername('');
    setPassword('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl">
      <div>
        <label className="text-xs text-gray-400 block mb-1">Connection Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My KM Connection"
          className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/40"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/40"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/40"
        />
      </div>
      <button
        type="submit"
        disabled={!name || !username || !password || isLoading}
        className={cn(
          'w-full py-2 rounded-lg text-sm font-medium transition-all',
          name && username && password && !isLoading
            ? 'bg-purple-600 hover:bg-purple-500 text-white'
            : 'bg-purple-900/30 text-gray-500 cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </span>
        ) : (
          'Add Connection'
        )}
      </button>
    </form>
  );
}

export function KMDrawer({ isOpen, onClose }: KMDrawerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const {
    connections,
    isLoading,
    createConnection,
    isCreating,
    deleteConnection,
    syncConnection,
    isSyncing,
  } = useKMConnections();

  const { activeKMConnectionIds, setActiveKMConnectionIds, setKMSearchEnabled } = useChatStore();

  const toggleConnection = (connectionId: string) => {
    if (activeKMConnectionIds.includes(connectionId)) {
      setActiveKMConnectionIds(activeKMConnectionIds.filter((id) => id !== connectionId));
    } else {
      setActiveKMConnectionIds([...activeKMConnectionIds, connectionId]);
    }
  };

  const handleCreateConnection = (data: KMConnectionCreate) => {
    createConnection(data, {
      onSuccess: () => {
        setShowAddForm(false);
      },
    });
  };

  const handleEnableAndClose = () => {
    if (activeKMConnectionIds.length > 0) {
      setKMSearchEnabled(true);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#1a0f2e] border-l border-purple-500/30 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-600/30">
              <Database className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Knowledge Base</h2>
              <p className="text-xs text-gray-400">
                {activeKMConnectionIds.length} of {connections.length} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-purple-900/30 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : connections.length === 0 && !showAddForm ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No knowledge base connections</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-all"
              >
                Add Connection
              </button>
            </div>
          ) : (
            <>
              {/* Add button */}
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-purple-500/30 rounded-xl text-purple-300 hover:bg-purple-900/20 hover:border-purple-500/50 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Connection
                </button>
              )}

              {/* Add form */}
              {showAddForm && (
                <div className="space-y-2">
                  <AddConnectionForm onSubmit={handleCreateConnection} isLoading={isCreating} />
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Connections list */}
              {connections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  isSelected={activeKMConnectionIds.includes(connection.id)}
                  onToggleSelect={() => toggleConnection(connection.id)}
                  onSync={() => syncConnection(connection.id)}
                  onDelete={() => deleteConnection(connection.id)}
                  isSyncing={isSyncing}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-purple-500/20">
          <button
            onClick={handleEnableAndClose}
            disabled={activeKMConnectionIds.length === 0}
            className={cn(
              'w-full py-3 rounded-xl text-sm font-medium transition-all',
              activeKMConnectionIds.length > 0
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50'
                : 'bg-purple-900/30 text-gray-500 cursor-not-allowed'
            )}
          >
            {activeKMConnectionIds.length > 0
              ? `Enable Search (${activeKMConnectionIds.length} selected)`
              : 'Select connections to enable'}
          </button>
        </div>
      </div>
    </>
  );
}
