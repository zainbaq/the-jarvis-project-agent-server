/**
 * File Upload API Client
 * Handles file upload, deletion, and validation
 */

import {
  UploadedFile,
  FileValidationResult,
  SUPPORTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Upload a file to the server
 */
export async function uploadFile(
  conversationId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        if (response.success && response.file) {
          resolve(response.file);
        } else {
          reject(new Error("Upload failed"));
        }
      } else {
        const error = JSON.parse(xhr.responseText);
        reject(new Error(error.detail || "Upload failed"));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.open("POST", `${API_BASE_URL}/api/files/${conversationId}/upload`);
    xhr.send(formData);
  });
}

/**
 * Delete a file from the server
 */
export async function deleteFile(
  conversationId: string,
  fileId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/files/${conversationId}/files/${fileId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete file");
  }
}

/**
 * List all files for a conversation
 */
export async function listFiles(
  conversationId: string
): Promise<UploadedFile[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/files/${conversationId}/files`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to list files");
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Validate a file before upload
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(MAX_FILE_SIZE / 1024 / 1024);
    return {
      valid: false,
      error: `File size exceeds maximum of ${sizeMB} MB`,
    };
  }

  // Check file extension
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `File type .${extension} is not supported`,
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}
