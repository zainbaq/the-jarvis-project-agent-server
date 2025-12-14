/**
 * File Upload Types
 * Type definitions for file upload and management
 */

export interface UploadedFile {
  file_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface FileUploadProgress {
  file_id: string;
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// Supported file types (matching backend)
export const SUPPORTED_FILE_EXTENSIONS = [
  // Documents
  'pdf', 'docx', 'txt', 'md', 'rtf',
  // Code
  'py', 'js', 'ts', 'tsx', 'jsx', 'java', 'cpp', 'c', 'go', 'rs', 'rb',
  'php', 'swift', 'kt', 'cs', 'html', 'css', 'scss', 'sql', 'sh', 'yaml', 'yml',
  // Data
  'csv', 'json', 'xml',
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'
];

// Max file size: 256 MB
export const MAX_FILE_SIZE = 256 * 1024 * 1024;
