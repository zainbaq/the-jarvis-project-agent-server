/**
 * FileUpload Component
 * Handles file upload UI with progress tracking and file management
 */

import React, { useRef, useState } from "react";
import {
  UploadedFile,
  FileUploadProgress,
} from "../types";
import {
  uploadFile,
  validateFile,
} from "../api/files";

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
    <div className="file-upload-container">
      {/* Paperclip Button */}
      <button
        onClick={handlePaperclipClick}
        disabled={disabled}
        className={`paperclip-button ${uploadedFiles.length > 0 ? 'has-files' : ''}`}
        title="Attach files"
        type="button"
      >
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
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
        disabled={disabled}
      />

      {/* Error Display */}
      {error && <div className="file-upload-error">{error}</div>}

      {/* Upload Progress */}
      {Object.values(uploadProgress).length > 0 && (
        <div className="upload-progress-container">
          {Object.values(uploadProgress).map((progress) => (
            <div key={progress.file_id} className="upload-progress-item">
              <div className="upload-progress-info">
                <span className="upload-filename">{progress.filename}</span>
                <span className="upload-percentage">{progress.progress}%</span>
              </div>
              <div className="upload-progress-bar">
                <div
                  className={`upload-progress-fill ${progress.status}`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.status === "error" && progress.error && (
                <div className="upload-error">{progress.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
