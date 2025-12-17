/**
 * FileUpload Component
 * Handles file upload UI with progress tracking and file management
 */

import React, { useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import {
  UploadedFile,
  FileUploadProgress,
} from "../types";
import {
  uploadFile,
  validateFile,
} from "../api/files";
import { components, iconSizes } from "../styles/theme";
import { cn } from "@/components/ui/utils";

interface FileUploadProps {
  conversationId: string;
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

export function FileUpload({
  conversationId,
  uploadedFiles,
  onFilesChange,
  disabled = false,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<
    Record<string, FileUploadProgress>
  >({});
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || "File validation failed");
        continue;
      }

      // Generate temporary ID for progress tracking
      const tempId = `temp_${Date.now()}_${i}`;

      // Initialize progress
      setUploadProgress((prev) => ({
        ...prev,
        [tempId]: {
          file_id: tempId,
          filename: file.name,
          progress: 0,
          status: "uploading",
        },
      }));

      try {
        // Upload file
        const uploadedFile = await uploadFile(
          conversationId,
          file,
          (progress) => {
            setUploadProgress((prev) => ({
              ...prev,
              [tempId]: {
                ...prev[tempId],
                progress,
              },
            }));
          }
        );

        // Update progress to complete
        setUploadProgress((prev) => ({
          ...prev,
          [tempId]: {
            ...prev[tempId],
            progress: 100,
            status: "complete",
          },
        }));

        // Add to uploaded files list
        onFilesChange([...uploadedFiles, uploadedFile]);

        // Remove from progress after delay
        setTimeout(() => {
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[tempId];
            return newProgress;
          });
        }, 1000);
      } catch (err) {
        console.error("File upload failed:", err);
        setUploadProgress((prev) => ({
          ...prev,
          [tempId]: {
            ...prev[tempId],
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          },
        }));

        // Remove from progress after delay
        setTimeout(() => {
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[tempId];
            return newProgress;
          });
        }, 3000);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Hidden File Input - completely off-screen */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        disabled={disabled}
        tabIndex={-1}
        style={{ position: 'absolute', left: '-9999px', visibility: 'hidden' }}
      />

      {/* Paperclip Button */}
      <button
        onClick={handlePaperclipClick}
        disabled={disabled}
        className={cn(
          uploadedFiles.length > 0
            ? components.buttonVariants.iconButtonActive
            : components.buttonVariants.iconButton,
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        title="Attach files"
        type="button"
      >
        <Paperclip className={iconSizes.md} />
      </button>

      {/* Error Display */}
      {error && <div className="fixed bottom-24 right-8 bg-red-500/20 border border-red-500/40 text-red-300 px-3 py-2 rounded-lg text-sm z-50">{error}</div>}

      {/* Upload Progress */}
      {Object.values(uploadProgress).length > 0 && (
        <div className="fixed bottom-24 right-8 bg-purple-900/90 border border-purple-500/40 rounded-lg p-3 space-y-2 min-w-[200px] z-50">
          {Object.values(uploadProgress).map((progress) => (
            <div key={progress.file_id} className="space-y-1">
              <div className="flex justify-between text-xs text-purple-200">
                <span className="truncate max-w-[150px]">{progress.filename}</span>
                <span>{progress.progress}%</span>
              </div>
              <div className="h-1 bg-purple-950 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    progress.status === 'error' ? 'bg-red-500' : 'bg-purple-500'
                  )}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.status === "error" && progress.error && (
                <div className="text-xs text-red-400">{progress.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
