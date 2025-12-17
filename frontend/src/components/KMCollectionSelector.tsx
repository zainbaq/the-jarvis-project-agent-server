// KM Collection Selector - Select collections and corpuses for a connection

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { colors, typography } from '../styles/theme';
import { cn } from '@/components/ui/utils';
import type { KMConnection, KMSelectionUpdate } from '../types';

interface KMCollectionSelectorProps {
  connection: KMConnection;
  updateSelections: (id: string, selections: KMSelectionUpdate) => Promise<KMConnection>;
  isUpdating: boolean;
}

export function KMCollectionSelector({ connection, updateSelections, isUpdating }: KMCollectionSelectorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    connection.selected_collection_names
  );
  const [selectedCorpuses, setSelectedCorpuses] = useState<number[]>(
    connection.selected_corpus_ids
  );

  const hasChanges =
    JSON.stringify(selectedCollections.sort()) !==
      JSON.stringify([...connection.selected_collection_names].sort()) ||
    JSON.stringify(selectedCorpuses.sort()) !==
      JSON.stringify([...connection.selected_corpus_ids].sort());

  const handleCollectionToggle = (collectionName: string) => {
    setSelectedCollections((prev) =>
      prev.includes(collectionName)
        ? prev.filter((n) => n !== collectionName)
        : [...prev, collectionName]
    );
  };

  const handleCorpusToggle = (corpusId: number) => {
    setSelectedCorpuses((prev) =>
      prev.includes(corpusId)
        ? prev.filter((id) => id !== corpusId)
        : [...prev, corpusId]
    );
  };

  const handleSelectAllCollections = () => {
    setSelectedCollections(connection.collections.map((c) => c.name));
  };

  const handleDeselectAllCollections = () => {
    setSelectedCollections([]);
  };

  const handleSelectAllCorpuses = () => {
    setSelectedCorpuses(connection.corpuses.map((c) => c.id));
  };

  const handleDeselectAllCorpuses = () => {
    setSelectedCorpuses([]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSelections(connection.id, {
        selected_collection_names: selectedCollections,
        selected_corpus_ids: selectedCorpuses,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedCollections(connection.selected_collection_names);
    setSelectedCorpuses(connection.selected_corpus_ids);
  };

  return (
    <div className="space-y-4">
      {/* Collections Section */}
      {connection.collections.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className={cn(typography.body.base, colors.text.primary, 'font-medium')}>
              Collections ({selectedCollections.length}/{connection.collections.length})
            </h4>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAllCollections}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAllCollections}
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {connection.collections.map((collection) => (
              <label
                key={collection.name}
                className="flex items-center gap-2 p-2 hover:bg-purple-900/30 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedCollections.includes(collection.name)}
                  onChange={() => handleCollectionToggle(collection.name)}
                  className="w-4 h-4 rounded border-purple-500/50 bg-purple-900/50 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <div className={cn(typography.body.base, colors.text.primary, 'truncate')}>
                    {collection.name}
                  </div>
                  <div className={cn(typography.body.small, colors.text.secondary)}>
                    {collection.num_chunks} chunks, {collection.files.length} files
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Corpuses Section */}
      {connection.corpuses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className={cn(typography.body.base, colors.text.primary, 'font-medium')}>
              Corpuses ({selectedCorpuses.length}/{connection.corpuses.length})
            </h4>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAllCorpuses}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAllCorpuses}
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {connection.corpuses.map((corpus) => (
              <label
                key={corpus.id}
                className="flex items-center gap-2 p-2 hover:bg-purple-900/30 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedCorpuses.includes(corpus.id)}
                  onChange={() => handleCorpusToggle(corpus.id)}
                  className="w-4 h-4 rounded border-purple-500/50 bg-purple-900/50 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <div className={cn(typography.body.base, colors.text.primary, 'truncate')}>
                    {corpus.display_name || corpus.name}
                  </div>
                  <div className={cn(typography.body.small, colors.text.secondary)}>
                    {corpus.chunk_count} chunks, {corpus.file_count} files
                    {corpus.category && ` - ${corpus.category}`}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {connection.collections.length === 0 && connection.corpuses.length === 0 && (
        <div className={cn('text-center py-4', typography.body.base, colors.text.secondary)}>
          No collections or corpuses available. Try syncing the connection.
        </div>
      )}

      {/* Save/Reset Buttons */}
      {hasChanges && (
        <div className="flex gap-2 pt-2 border-t border-purple-500/20">
          <button
            onClick={handleReset}
            className={cn(
              'flex-1 px-3 py-1.5 text-sm border border-purple-500/30 rounded-lg',
              colors.text.secondary,
              'hover:bg-purple-900/30 transition-colors'
            )}
            disabled={isSaving || isUpdating}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={isSaving || isUpdating}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Selections'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
