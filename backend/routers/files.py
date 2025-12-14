"""
File Upload Router - API endpoints for file management

Endpoints:
- POST   /api/files/{conversation_id}/upload
- GET    /api/files/{conversation_id}/files
- DELETE /api/files/{conversation_id}/files/{file_id}
- GET    /api/files/{conversation_id}/files/{file_id}/download
"""
import logging
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
import io

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{conversation_id}/upload")
async def upload_file(
    conversation_id: str,
    request: Request,
    file: UploadFile = File(...)
) -> JSONResponse:
    """
    Upload a file for a conversation

    Args:
        conversation_id: Conversation ID
        file: File to upload

    Returns:
        File metadata

    Raises:
        HTTPException: If validation fails or upload errors
    """
    file_storage = request.app.state.file_storage

    try:
        # Read file content
        file_content = await file.read()

        # Validate and save file
        file_metadata = await file_storage.save_file(
            conversation_id=conversation_id,
            filename=file.filename,
            file_content=file_content
        )

        logger.info(f"✅ File uploaded: {file.filename} ({len(file_content)} bytes) for conversation {conversation_id}")

        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "message": "File uploaded successfully",
                "file": file_metadata.to_dict()
            }
        )

    except ValueError as e:
        # Validation error
        logger.warning(f"File validation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(f"Failed to upload file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/{conversation_id}/files")
async def list_files(
    conversation_id: str,
    request: Request
) -> JSONResponse:
    """
    List all files for a conversation

    Args:
        conversation_id: Conversation ID

    Returns:
        List of file metadata
    """
    file_storage = request.app.state.file_storage

    try:
        files = file_storage.list_files(conversation_id)

        return JSONResponse(
            content={
                "success": True,
                "conversation_id": conversation_id,
                "files": [f.to_dict() for f in files],
                "count": len(files)
            }
        )

    except Exception as e:
        logger.error(f"Failed to list files: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")


@router.delete("/{conversation_id}/files/{file_id}")
async def delete_file(
    conversation_id: str,
    file_id: str,
    request: Request
) -> JSONResponse:
    """
    Delete a specific file

    Args:
        conversation_id: Conversation ID
        file_id: File ID to delete

    Returns:
        Success message

    Raises:
        HTTPException: If file not found or deletion fails
    """
    file_storage = request.app.state.file_storage

    try:
        deleted = await file_storage.delete_file(conversation_id, file_id)

        if not deleted:
            raise HTTPException(status_code=404, detail=f"File {file_id} not found")

        logger.info(f"✅ Deleted file {file_id} from conversation {conversation_id}")

        return JSONResponse(
            content={
                "success": True,
                "message": "File deleted successfully",
                "file_id": file_id
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")


@router.get("/{conversation_id}/files/{file_id}/download")
async def download_file(
    conversation_id: str,
    file_id: str,
    request: Request
) -> StreamingResponse:
    """
    Download a file

    Args:
        conversation_id: Conversation ID
        file_id: File ID to download

    Returns:
        File content as streaming response

    Raises:
        HTTPException: If file not found
    """
    file_storage = request.app.state.file_storage

    try:
        # Get file metadata
        file_metadata = file_storage.get_file(conversation_id, file_id)

        if not file_metadata:
            raise HTTPException(status_code=404, detail=f"File {file_id} not found")

        # Get file content
        file_content = file_storage.get_file_content(conversation_id, file_id)

        if file_content is None:
            raise HTTPException(status_code=404, detail=f"File content not found")

        # Create streaming response
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=file_metadata.mime_type,
            headers={
                "Content-Disposition": f'attachment; filename="{file_metadata.filename}"',
                "Content-Length": str(file_metadata.file_size)
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")


@router.get("/stats")
async def get_storage_stats(request: Request) -> JSONResponse:
    """
    Get storage statistics

    Returns:
        Storage stats (total files, size, etc.)
    """
    file_storage = request.app.state.file_storage

    try:
        stats = file_storage.get_storage_stats()

        return JSONResponse(
            content={
                "success": True,
                "stats": stats
            }
        )

    except Exception as e:
        logger.error(f"Failed to get storage stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get storage stats: {str(e)}")
