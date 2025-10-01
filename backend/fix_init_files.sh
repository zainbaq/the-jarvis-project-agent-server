#!/bin/bash
# Script to create all __init__.py files correctly
# Run from backend/ directory

echo "Creating __init__.py files..."

# models/__init__.py
cat > models/__init__.py << 'EOF'
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
EOF
echo "✅ Created models/__init__.py"

# agents/__init__.py
cat > agents/__init__.py << 'EOF'
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
EOF
echo "✅ Created agents/__init__.py"

# routers/__init__.py
cat > routers/__init__.py << 'EOF'
"""
API route handlers
"""
from . import agents
from . import health

__all__ = ["agents", "health"]
EOF
echo "✅ Created routers/__init__.py"

# tools/__init__.py
cat > tools/__init__.py << 'EOF'
"""
Tools and utilities for agents and workflows
"""
from .llm import get_llm

__all__ = ["get_llm"]
EOF
echo "✅ Created tools/__init__.py"

# workflows/__init__.py
cat > workflows/__init__.py << 'EOF'
"""
LangGraph workflow implementations
"""
# Import workflows here as needed
# from .developer import tasks

__all__ = []
EOF
echo "✅ Created workflows/__init__.py"

echo ""
echo "All __init__.py files created successfully!"
echo "You can now run: python app.py"