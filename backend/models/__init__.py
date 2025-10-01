# models/__init__.py
"""
Pydantic models for API requests and responses
"""
from .requests import ChatRequest, WorkflowExecuteRequest
from .responses import (
    AgentInfo,
    ChatResponse,
    WorkflowExecuteResponse,
    ErrorResponse,
    HealthResponse,
    AgentType
)

__all__ = [
    "ChatRequest",
    "WorkflowExecuteRequest",
    "AgentInfo",
    "ChatResponse",
    "WorkflowExecuteResponse",
    "ErrorResponse",
    "HealthResponse",
    "AgentType"
]


# agents/__init__.py
"""
Agent implementations and registry
"""
from .base import BaseAgent, WorkflowAgent, AgentCapability
from .openai_agent import OpenAIAgent
from .langgraph_agent import LangGraphAgent
from .registry import AgentRegistry

__all__ = [
    "BaseAgent",
    "WorkflowAgent",
    "AgentCapability",
    "OpenAIAgent",
    "LangGraphAgent",
    "AgentRegistry"
]


# routers/__init__.py
"""
API route handlers
"""
from . import agents
from . import health

__all__ = ["agents", "health"]


# workflows/__init__.py
"""
LangGraph workflow implementations
"""
# Import workflows here as needed
# from .developer import tasks

__all__ = []