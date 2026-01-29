'use client';

import { useState } from 'react';
import { X, Plus, Loader2, Server } from 'lucide-react';
import { useCustomEndpoints } from '@/lib/hooks/use-custom-endpoints';
import { cn } from '@/lib/utils/cn';

interface AddEndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddEndpointModal({ isOpen, onClose }: AddEndpointModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { createEndpoint, isCreating } = useCustomEndpoints();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !url || !apiKey || !model) {
      setError('All fields are required');
      return;
    }

    createEndpoint(
      { name, url, api_key: apiKey, model },
      {
        onSuccess: () => {
          setName('');
          setUrl('');
          setApiKey('');
          setModel('');
          onClose();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Failed to create endpoint');
        },
      }
    );
  };

  const handleClose = () => {
    setName('');
    setUrl('');
    setApiKey('');
    setModel('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-[#1a0f2e] border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-600/30">
                <Server className="w-5 h-5 text-purple-300" />
              </div>
              <h2 className="text-lg font-semibold text-white">Add Custom Endpoint</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-purple-900/30 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Custom Agent"
                className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40 transition-all"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Endpoint URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40 transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">
                OpenAI-compatible endpoint (e.g., Azure OpenAI, Ollama, LM Studio)
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1.5">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40 transition-all"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Model Name</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4, llama-3, etc."
                className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40 transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-purple-900/30 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !name || !url || !apiKey || !model}
                className={cn(
                  'flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
                  !isCreating && name && url && apiKey && model
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50'
                    : 'bg-purple-900/30 text-gray-500 cursor-not-allowed'
                )}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Endpoint
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
