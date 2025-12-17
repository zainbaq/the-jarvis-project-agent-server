import React from 'react';
import { components } from '../styles/theme';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'md' | 'lg';
}

/**
 * Reusable modal wrapper component
 * Consolidates the modal backdrop pattern used across multiple modals
 */
export function ModalWrapper({ isOpen, onClose, children, size = 'md' }: ModalWrapperProps) {
  if (!isOpen) return null;

  const containerClass = size === 'lg'
    ? components.modal.containerLg
    : components.modal.container;

  return (
    <div className={components.modal.backdrop}>
      {/* Backdrop */}
      <div
        className={components.modal.backdropBg}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={containerClass}>
        {children}
      </div>
    </div>
  );
}
