import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { colors, components, spacing, typography } from '../styles/theme';
import { cn } from '@/components/ui/utils';

interface AddEndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (endpoint: EndpointConfig) => void;
}

export interface EndpointConfig {
  name: string;
  endpoint_url: string;
  api_key?: string;
  model_name?: string;
}

export function AddEndpointModal({ isOpen, onClose, onAdd }: AddEndpointModalProps) {
  const [name, setName] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!name.trim()) {
      setError('Please enter a name for the endpoint');
      return;
    }
    if (!endpointUrl.trim()) {
      setError('Please enter an endpoint URL');
      return;
    }

    // Validate URL format
    try {
      new URL(endpointUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    const config: EndpointConfig = {
      name: name.trim(),
      endpoint_url: endpointUrl.trim(),
      ...(apiKey && { api_key: apiKey.trim() }),
      ...(modelName && { model_name: modelName.trim() })
    };

    onAdd(config);
    
    // Reset form
    setName('');
    setEndpointUrl('');
    setApiKey('');
    setModelName('');
    setError('');
  };

  const handleClose = () => {
    setName('');
    setEndpointUrl('');
    setApiKey('');
    setModelName('');
    setError('');
    onClose();
  };

  return (
    <div className={components.modal.backdrop}>
      {/* Backdrop */}
      <div 
        className={components.modal.backdropBg}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={components.modal.containerLg}>
        {/* Header */}
        <div className={components.modal.header}>
          <div className={cn('flex items-center', spacing.inline)}>
            <div className={components.iconContainer.sm}>
              <Plus className={cn('w-5 h-5', colors.text.accent)} />
            </div>
            <h2 className={cn(typography.heading.lg, colors.text.primary)}>Add Custom Endpoint</h2>
          </div>
          <button
            onClick={handleClose}
            className={components.button.icon}
          >
            <X className={cn('w-5 h-5', colors.text.secondary)} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className={cn('p-4', components.card.base, colors.status.error)}>
              <p className={typography.body.base}>{error}</p>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className={cn(typography.body.base, colors.text.secondary, 'mb-2 block')}>
              Endpoint Name <span className={colors.text.error}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Azure GPT-4, Claude Endpoint"
              className={components.input}
            />
          </div>

          {/* Endpoint URL Field */}
          <div>
            <label className={cn(typography.body.base, colors.text.secondary, 'mb-2 block')}>
              Endpoint URL <span className={colors.text.error}>*</span>
            </label>
            <input
              type="text"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://api.example.com/v1/chat/completions"
              className={components.input}
            />
            <p className={cn(typography.body.small, colors.text.muted, 'mt-2')}>
              The full URL of your custom LLM endpoint
            </p>
          </div>

          {/* API Key Field */}
          <div>
            <label className={cn(typography.body.base, colors.text.secondary, 'mb-2 block')}>
              API Key (Optional)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className={components.input}
            />
            <p className={cn(typography.body.small, colors.text.muted, 'mt-2')}>
              API key for authentication (if required)
            </p>
          </div>

          {/* Model Name Field */}
          <div>
            <label className={cn(typography.body.base, colors.text.secondary, 'mb-2 block')}>
              Model Name (Optional)
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="gpt-4, claude-3-opus"
              className={components.input}
            />
            <p className={cn(typography.body.small, colors.text.muted, 'mt-2')}>
              Specific model name to use with this endpoint
            </p>
          </div>

          {/* Info Box */}
          <div className={cn('p-4', components.card.base, colors.status.info)}>
            <p className={typography.body.small}>
              <strong>Note:</strong> This will create an Endpoint agent that connects to your custom LLM service. Make sure your endpoint is compatible with OpenAI's API format.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className={cn('flex items-center justify-end', spacing.inline, 'pt-4')}>
            <button
              type="button"
              onClick={handleClose}
              className={components.button.ghost}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn(components.button.primary, 'flex items-center', spacing.inlineCompact)}
            >
              <Plus className="w-4 h-4" />
              Add Endpoint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}