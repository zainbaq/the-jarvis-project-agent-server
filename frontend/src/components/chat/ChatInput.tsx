// Chat Input - message input field with send button

import { useState, type KeyboardEvent } from 'react';
import { UploadedFile } from '../../types/files';
import { FileUpload } from './FileUpload';

interface ChatInputProps {
  onSend: (message: string, files: UploadedFile[]) => void;
  conversationId: string;
  disabled?: boolean;
  enableWebSearch?: boolean;
  onToggleWebSearch?: () => void;
}

export function ChatInput({
  onSend,
  conversationId,
  disabled = false,
  enableWebSearch = false,
  onToggleWebSearch,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message, uploadedFiles);
      setMessage('');
      setUploadedFiles([]);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (but not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* Options row: Web search toggle + File upload */}
      <div className="mb-2 flex items-center gap-4">
        {onToggleWebSearch && (
          <label className="flex items-center text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={enableWebSearch}
              onChange={onToggleWebSearch}
              className="mr-2 rounded"
            />
            Enable web search
          </label>
        )}

        <FileUpload
          conversationId={conversationId}
          uploadedFiles={uploadedFiles}
          onFilesChange={setUploadedFiles}
          disabled={disabled}
        />
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message... (Shift+Enter for new line)"
          disabled={disabled}
          className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
          rows={3}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
