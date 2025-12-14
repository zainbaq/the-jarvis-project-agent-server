/**
 * AgentSwitchWarning Component
 * Modal warning when switching agents with uploaded files
 */

import React from 'react';

interface AgentSwitchWarningProps {
  isOpen: boolean;
  fileCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function AgentSwitchWarning({
  isOpen,
  fileCount,
  onCancel,
  onConfirm,
}: AgentSwitchWarningProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Switch Agent?</h3>
          <button onClick={onCancel} className="modal-close-button">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="warning-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <p className="warning-text">
            You have <strong>{fileCount}</strong> file{fileCount !== 1 ? 's' : ''} uploaded
            in this conversation.
          </p>

          <p className="warning-subtext">
            Switching agents will start a new conversation, and your uploaded files will be
            lost. You'll need to upload them again with the new agent.
          </p>
        </div>

        <div className="modal-footer">
          <button onClick={onCancel} className="button-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="button-danger">
            Switch Agent
          </button>
        </div>
      </div>
    </div>
  );
}
