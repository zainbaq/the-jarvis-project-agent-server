"""
Pydantic models for API responses
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum


class AgentType(str, Enum):
    """Supported agent types"""
    OPENAI = "openai"
    LANGGRAPH = "langgraph"
    CUSTOM = "custom"


class AgentInfo(BaseModel):
    """Information about an agent"""
    agent_id: str = Field(..., description="Unique agent identifier")
    name: str = Field(..., description="Agent display name")
    type: str = Field(..., description="Agent type (openai, langgraph, custom)")
    description: str = Field(..., description="Agent description")
    capabilities: List[str] = Field(default_factory=list, description="Agent capabilities")
    status: str = Field(..., description="Agent status (active, inactive)")
    config: Dict[str, Any] = Field(default_factory=dict, description="Public configuration")
    
    class Config:
        json_schema_extra = {
            "example": {
                "agent_id": "gpt4_assistant",
                "name": "GPT-4 Assistant",
                "type": "openai",
                "description": "General purpose GPT-4 conversational assistant",
                "capabilities": ["chat", "streaming"],
                "status": "active",
                "config": {
                    "model": "gpt-4",
                    "temperature": 0.7
                }
            }
        }


class ChatResponse(BaseModel):
    """Response from chat interaction"""
    response: str = Field(..., description="Agent's response")
    conversation_id: str = Field(..., description="Conversation ID used")
    agent_id: str = Field(..., description="Agent that processed the request")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "response": "Hello! I'd be happy to help you with Python.",
                "conversation_id": "conv_12345",
                "agent_id": "gpt4_assistant",
                "metadata": {
                    "tokens_used": 150,
                    "model": "gpt-4"
                }
            }
        }


class WorkflowExecuteResponse(BaseModel):
    """Response from workflow execution"""
    status: str = Field(..., description="Execution status (completed, failed)")
    result: Optional[Any] = Field(None, description="Workflow result")
    error: Optional[str] = Field(None, description="Error message if failed")
    execution_time: Optional[float] = Field(None, description="Execution time in seconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "completed",
                "result": {
                    "codebase": {"main.py": "# Generated code"},
                    "documentation": {"README.md": "# Project"}
                },
                "error": None,
                "execution_time": 45.2
            }
        }


class ErrorResponse(BaseModel):
    """Error response"""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    request_id: Optional[str] = Field(None, description="Request ID for tracking")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "Agent not found",
                "detail": "Agent with ID 'unknown_agent' does not exist",
                "request_id": "req_12345"
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    agents_loaded: int = Field(..., description="Number of agents loaded")
    uptime: float = Field(..., description="Server uptime in seconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "version": "1.0.0",
                "agents_loaded": 4,
                "uptime": 3600.5
            }
        }