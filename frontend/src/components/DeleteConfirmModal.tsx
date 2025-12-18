import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { components, typography } from '../styles/theme';
import { cn } from '@/components/ui/utils';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, itemName, itemType }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className={components.modal.backdrop}>
      {/* Backdrop */}
      <div
        className={components.modal.backdropBg}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(components.modal.container, 'max-w-md')}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h2 className={cn(typography.h2, 'text-red-300')}>Delete {itemType}?</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-300">
            Are you sure you want to delete <span className="font-semibold text-white">'{itemName}'</span>?
          </p>
          <p className="text-red-400/70 text-sm mt-2">
            This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className={components.button.ghost}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg transition-all font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
