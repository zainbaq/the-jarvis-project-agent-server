"""
Pydantic models for API requests
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class UploadedFileMetadata(BaseModel):
    """Metadata for uploaded files"""
    file_id: str = Field(..., description="Unique file identifier")
    filename: str = Field(..., description="Original filename")
    file_type: str = Field(..., description="File extension")
    file_size: int = Field(..., description="File size in bytes")
    uploaded_at: str = Field(..., description="Upload timestamp (ISO format)")

    class Config:
        json_schema_extra = {
            "example": {
                "file_id": "abc123",
                "filename": "document.pdf",
                "file_type": "pdf",
                "file_size": 1024000,
                "uploaded_at": "2025-12-13T18:00:00"
            }
        }


class ChatRequest(BaseModel):
    """Request model for chat interactions"""
    message: str = Field(..., description="User message to send to the agent")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID for context")
    enable_web_search: bool = Field(False, description="Enable web search for this query")
    enable_km_search: bool = Field(False, description="Enable knowledge management search for this query")
    km_connection_ids: Optional[List[str]] = Field(None, description="Specific KM connection IDs to use (None = all active)")
    uploaded_files: Optional[List[UploadedFileMetadata]] = Field(None, description="List of uploaded file metadata")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Optional parameters to override defaults")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "What are the latest developments in AI?",
                "conversation_id": "conv_12345",
                "enable_web_search": True,
                "enable_km_search": True,
                "km_connection_ids": ["conn_123", "conn_456"],
                "parameters": {
                    "temperature": 0.7,
                    "max_tokens": 2000
                }
            }
        }


class WorkflowExecuteRequest(BaseModel):
    """Request model for workflow execution"""
    task: str = Field(..., description="Task description for the workflow")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Optional workflow parameters")
    
    class Config:
        json_schema_extra = {
            "example": {
                "task": "Create a REST API for a todo application with FastAPI",
                "parameters": {
                    "recursion_limit": 100,
                    "temperature": 0.0
                }
            }
        }