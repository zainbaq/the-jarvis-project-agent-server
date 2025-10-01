"""
Pydantic models for API requests
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class ChatRequest(BaseModel):
    """Request model for chat interactions"""
    message: str = Field(..., description="User message to send to the agent")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID for context")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Optional parameters to override defaults")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Hello, can you help me with Python?",
                "conversation_id": "conv_12345",
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