// KM Connection Form - For adding new KM connections

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { colors, typography } from '../styles/theme';
import { cn } from '@/components/ui/utils';
import type { KMConnectionCreate, KMConnection } from '../types';

interface KMConnectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  createConnection: (data: KMConnectionCreate) => Promise<KMConnection>;
  isCreating: boolean;
}

export function KMConnectionForm({ onSuccess, onCancel, createConnection, isCreating }: KMConnectionFormProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !username.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }

    try {
      await createConnection({
        name: name.trim(),
        username: username.trim(),
        password: password.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection');
    }
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className={typography.body.base}>Back to connections</span>
      </button>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={cn(typography.body.base, colors.text.primary, 'block mb-1.5 font-medium')}>
            Connection Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My KM Connection"
            className={cn(
              'w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 rounded-lg',
              colors.text.primary,
              'placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors'
            )}
            disabled={isCreating}
          />
        </div>

        <div>
          <label className={cn(typography.body.base, colors.text.primary, 'block mb-1.5 font-medium')}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_username"
            className={cn(
              'w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 rounded-lg',
              colors.text.primary,
              'placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors'
            )}
            disabled={isCreating}
          />
        </div>

        <div>
          <label className={cn(typography.body.base, colors.text.primary, 'block mb-1.5 font-medium')}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            className={cn(
              'w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 rounded-lg',
              colors.text.primary,
              'placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors'
            )}
            disabled={isCreating}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'flex-1 px-4 py-2.5 border border-purple-500/30 rounded-lg',
              colors.text.secondary,
              'hover:bg-purple-900/30 transition-colors'
            )}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            disabled={isCreating}
          >
            {isCreating ? 'Connecting...' : 'Add Connection'}
          </button>
        </div>

        <p className={cn(typography.body.small, colors.text.muted, 'text-center')}>
          Your credentials will be used to authenticate with the KM server.
          The API key will be stored securely.
        </p>
      </form>
    </div>
  );
}
