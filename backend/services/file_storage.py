"""
File Storage Service - Manages file uploads and storage for conversations

Handles:
- File validation (size, type)
- Secure file storage with conversation isolation
- File metadata tracking
- Cleanup and deletion
"""
import os
import uuid
import shutil
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
import re

logger = logging.getLogger(__name__)


class FileMetadata:
    """Metadata for uploaded files"""

    def __init__(
        self,
        file_id: str,
        filename: str,
        filepath: str,
        file_type: str,
        file_size: int,
        conversation_id: str,
        mime_type: str,
        uploaded_at: Optional[datetime] = None
    ):
        self.file_id = file_id
        self.filename = filename
        self.filepath = filepath
        self.file_type = file_type
        self.file_size = file_size
        self.conversation_id = conversation_id
        self.mime_type = mime_type
        self.uploaded_at = uploaded_at or datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "file_id": self.file_id,
            "filename": self.filename,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "uploaded_at": self.uploaded_at.isoformat()
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any], filepath: str, conversation_id: str):
        """Create from dictionary"""
        return cls(
            file_id=data["file_id"],
            filename=data["filename"],
            filepath=filepath,
            file_type=data["file_type"],
            file_size=data["file_size"],
            conversation_id=conversation_id,
            mime_type=data["mime_type"],
            uploaded_at=datetime.fromisoformat(data["uploaded_at"])
        )


class FileStorageService:
    """
    Service for managing file uploads and storage

    Files are stored in: temp/files/{conversation_id}/{file_id}_{filename}
    """

    # Supported file extensions
    SUPPORTED_EXTENSIONS = {
        # Documents
        'pdf', 'docx', 'txt', 'md', 'rtf',
        # Code
        'py', 'js', 'ts', 'tsx', 'jsx', 'java', 'cpp', 'c', 'go', 'rs', 'rb',
        'php', 'swift', 'kt', 'cs', 'html', 'css', 'scss', 'sql', 'sh', 'yaml', 'yml',
        # Data
        'csv', 'json', 'xml',
        # Images
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'
    }

    # MIME type mapping
    MIME_TYPES = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'rtf': 'application/rtf',
        'py': 'text/x-python',
        'js': 'text/javascript',
        'ts': 'text/typescript',
        'tsx': 'text/typescript',
        'jsx': 'text/javascript',
        'java': 'text/x-java',
        'cpp': 'text/x-c++',
        'c': 'text/x-c',
        'go': 'text/x-go',
        'rs': 'text/x-rust',
        'rb': 'text/x-ruby',
        'php': 'text/x-php',
        'swift': 'text/x-swift',
        'kt': 'text/x-kotlin',
        'cs': 'text/x-csharp',
        'html': 'text/html',
        'css': 'text/css',
        'scss': 'text/x-scss',
        'sql': 'text/x-sql',
        'sh': 'text/x-sh',
        'csv': 'text/csv',
        'json': 'application/json',
        'xml': 'application/xml',
        'yaml': 'text/yaml',
        'yml': 'text/yaml',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml'
    }

    def __init__(self, base_dir: str = "backend/temp/files", max_file_size: int = 256 * 1024 * 1024):
        """
        Initialize file storage service

        Args:
            base_dir: Base directory for file storage
            max_file_size: Maximum file size in bytes (default: 256 MB)
        """
        self.base_dir = Path(base_dir)
        self.max_file_size = max_file_size

        # Create base directory if it doesn't exist
        self.base_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"FileStorageService initialized (base_dir: {self.base_dir}, max_size: {self.max_file_size / 1024 / 1024:.0f}MB)")

    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename to prevent security issues

        Args:
            filename: Original filename

        Returns:
            Sanitized filename
        """
        # Remove any path components
        filename = os.path.basename(filename)

        # Remove special characters except dots, underscores, hyphens
        filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)

        # Limit length
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:250] + ext

        return filename

    def _get_file_extension(self, filename: str) -> str:
        """Get file extension (lowercase, without dot)"""
        return os.path.splitext(filename)[1].lower().lstrip('.')

    def _get_conversation_dir(self, conversation_id: str) -> Path:
        """Get conversation directory path"""
        return self.base_dir / conversation_id

    def validate_file(self, filename: str, file_size: int) -> Dict[str, Any]:
        """
        Validate file before upload

        Args:
            filename: Original filename
            file_size: File size in bytes

        Returns:
            Dict with 'valid' bool and optional 'error' message
        """
        # Check file size
        if file_size > self.max_file_size:
            return {
                "valid": False,
                "error": f"File size ({file_size / 1024 / 1024:.1f}MB) exceeds maximum ({self.max_file_size / 1024 / 1024:.0f}MB)"
            }

        # Check file extension
        ext = self._get_file_extension(filename)
        if ext not in self.SUPPORTED_EXTENSIONS:
            return {
                "valid": False,
                "error": f"File type '.{ext}' is not supported. Supported types: {', '.join(sorted(self.SUPPORTED_EXTENSIONS))}"
            }

        return {"valid": True}

    async def save_file(
        self,
        conversation_id: str,
        filename: str,
        file_content: bytes
    ) -> FileMetadata:
        """
        Save uploaded file to storage

        Args:
            conversation_id: Conversation ID
            filename: Original filename
            file_content: File content as bytes

        Returns:
            FileMetadata object

        Raises:
            ValueError: If file validation fails
        """
        # Validate file
        file_size = len(file_content)
        validation = self.validate_file(filename, file_size)
        if not validation["valid"]:
            raise ValueError(validation["error"])

        # Generate file ID and sanitize filename
        file_id = str(uuid.uuid4())
        sanitized_filename = self._sanitize_filename(filename)

        # Get file extension and MIME type
        file_ext = self._get_file_extension(filename)
        mime_type = self.MIME_TYPES.get(file_ext, "application/octet-stream")

        # Create conversation directory
        conv_dir = self._get_conversation_dir(conversation_id)
        conv_dir.mkdir(parents=True, exist_ok=True)

        # Save file with format: {file_id}_{sanitized_filename}
        file_path = conv_dir / f"{file_id}_{sanitized_filename}"

        try:
            with open(file_path, 'wb') as f:
                f.write(file_content)

            logger.info(f"📁 Saved file {filename} ({file_size} bytes) to {file_path}")

            # Create metadata
            metadata = FileMetadata(
                file_id=file_id,
                filename=filename,
                filepath=str(file_path),
                file_type=file_ext,
                file_size=file_size,
                conversation_id=conversation_id,
                mime_type=mime_type
            )

            return metadata

        except Exception as e:
            logger.error(f"Failed to save file {filename}: {e}")
            # Clean up partial file if it exists
            if file_path.exists():
                file_path.unlink()
            raise RuntimeError(f"Failed to save file: {str(e)}")

    def get_file(self, conversation_id: str, file_id: str) -> Optional[FileMetadata]:
        """
        Get file metadata by ID

        Args:
            conversation_id: Conversation ID
            file_id: File ID

        Returns:
            FileMetadata if found, None otherwise
        """
        conv_dir = self._get_conversation_dir(conversation_id)

        if not conv_dir.exists():
            return None

        # Find file with matching ID
        for file_path in conv_dir.glob(f"{file_id}_*"):
            if file_path.is_file():
                # Extract original filename (everything after file_id_)
                full_name = file_path.name
                filename = full_name[len(file_id) + 1:]  # +1 for underscore

                file_ext = self._get_file_extension(filename)
                mime_type = self.MIME_TYPES.get(file_ext, "application/octet-stream")

                return FileMetadata(
                    file_id=file_id,
                    filename=filename,
                    filepath=str(file_path),
                    file_type=file_ext,
                    file_size=file_path.stat().st_size,
                    conversation_id=conversation_id,
                    mime_type=mime_type,
                    uploaded_at=datetime.fromtimestamp(file_path.stat().st_mtime)
                )

        return None

    def list_files(self, conversation_id: str) -> List[FileMetadata]:
        """
        List all files for a conversation

        Args:
            conversation_id: Conversation ID

        Returns:
            List of FileMetadata objects
        """
        conv_dir = self._get_conversation_dir(conversation_id)

        if not conv_dir.exists():
            return []

        files = []
        for file_path in conv_dir.iterdir():
            if file_path.is_file():
                # Parse filename: {file_id}_{original_name}
                parts = file_path.name.split('_', 1)
                if len(parts) == 2:
                    file_id, filename = parts
                    file_ext = self._get_file_extension(filename)
                    mime_type = self.MIME_TYPES.get(file_ext, "application/octet-stream")

                    files.append(FileMetadata(
                        file_id=file_id,
                        filename=filename,
                        filepath=str(file_path),
                        file_type=file_ext,
                        file_size=file_path.stat().st_size,
                        conversation_id=conversation_id,
                        mime_type=mime_type,
                        uploaded_at=datetime.fromtimestamp(file_path.stat().st_mtime)
                    ))

        return files

    async def delete_file(self, conversation_id: str, file_id: str) -> bool:
        """
        Delete a specific file

        Args:
            conversation_id: Conversation ID
            file_id: File ID

        Returns:
            True if deleted, False if not found
        """
        conv_dir = self._get_conversation_dir(conversation_id)

        if not conv_dir.exists():
            return False

        # Find and delete file
        for file_path in conv_dir.glob(f"{file_id}_*"):
            if file_path.is_file():
                try:
                    file_path.unlink()
                    logger.info(f"🗑️  Deleted file {file_path.name}")
                    return True
                except Exception as e:
                    logger.error(f"Failed to delete file {file_path}: {e}")
                    raise RuntimeError(f"Failed to delete file: {str(e)}")

        return False

    async def clear_conversation_files(self, conversation_id: str) -> int:
        """
        Delete all files for a conversation

        Args:
            conversation_id: Conversation ID

        Returns:
            Number of files deleted
        """
        conv_dir = self._get_conversation_dir(conversation_id)

        if not conv_dir.exists():
            return 0

        try:
            file_count = len(list(conv_dir.iterdir()))
            shutil.rmtree(conv_dir)
            logger.info(f"🧹 Cleared {file_count} files for conversation {conversation_id}")
            return file_count
        except Exception as e:
            logger.error(f"Failed to clear conversation files: {e}")
            raise RuntimeError(f"Failed to clear conversation files: {str(e)}")

    def get_file_content(self, conversation_id: str, file_id: str) -> Optional[bytes]:
        """
        Read file content from disk

        Args:
            conversation_id: Conversation ID
            file_id: File ID

        Returns:
            File content as bytes, or None if not found
        """
        file_meta = self.get_file(conversation_id, file_id)

        if not file_meta:
            return None

        try:
            with open(file_meta.filepath, 'rb') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to read file {file_id}: {e}")
            return None

    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        total_files = 0
        total_size = 0
        conversations = 0

        if self.base_dir.exists():
            for conv_dir in self.base_dir.iterdir():
                if conv_dir.is_dir():
                    conversations += 1
                    for file_path in conv_dir.iterdir():
                        if file_path.is_file():
                            total_files += 1
                            total_size += file_path.stat().st_size

        return {
            "total_files": total_files,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / 1024 / 1024, 2),
            "conversations": conversations,
            "max_file_size_mb": self.max_file_size / 1024 / 1024
        }
