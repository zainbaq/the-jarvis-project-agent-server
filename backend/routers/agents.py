"""
Agent management and interaction endpoints
"""
from fastapi import APIRouter, Request, HTTPException, Query
from typing import List, Optional
import logging

from models.requests import ChatRequest, WorkflowExecuteRequest
from models.responses import (
    AgentInfo, ChatResponse, WorkflowExecuteResponse, ErrorResponse
)
from agents.base import WorkflowAgent

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[AgentInfo])
async def list_agents(
    request: Request,
    agent_type: Optional[str] = Query(None, description="Filter by agent type"),
    capability: Optional[str] = Query(None, description="Filter by capability")
):
    """
    List all available agents
    
    Optional filters:
    - agent_type: Filter by type (openai, langgraph, etc.)
    - capability: Filter by capability (chat, workflow, etc.)
    """
    registry = request.app.state.agent_registry
    
    if agent_type:
        agents = registry.get_agents_by_type(agent_type)
        return [agent.get_info() for agent in agents]
    
    if capability:
        agents = registry.get_agents_by_capability(capability)
        return [agent.get_info() for agent in agents]
    
    return registry.list_agents()


@router.get("/{agent_id}", response_model=AgentInfo)
async def get_agent(agent_id: str, request: Request):
    """
    Get information about a specific agent
    """
    registry = request.app.state.agent_registry
    agent = registry.get_agent(agent_id)
    
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    return agent.get_info()


@router.post("/{agent_id}/chat", response_model=ChatResponse)
async def chat_with_agent(agent_id: str, chat_request: ChatRequest, request: Request):
    """
    Send a chat message to an agent
    
    The agent will maintain conversation context using the conversation_id
    """
    registry = request.app.state.agent_registry
    agent = registry.get_agent(agent_id)
    
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    try:
        result = await agent.query(
            message=chat_request.message,
            conversation_id=chat_request.conversation_id,
            parameters=chat_request.parameters
        )
        
        return ChatResponse(
            response=result["response"],
            conversation_id=result["conversation_id"],
            agent_id=agent_id,
            metadata=result.get("metadata", {})
        )
        
    except Exception as e:
        logger.error(f"Error in chat with agent {agent_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat: {str(e)}"
        )


@router.post("/{agent_id}/workflow", response_model=WorkflowExecuteResponse)
async def execute_workflow(
    agent_id: str, 
    workflow_request: WorkflowExecuteRequest, 
    request: Request
):
    """
    Execute a workflow on a workflow-capable agent
    
    This endpoint is specifically for agents that support workflow execution
    (e.g., LangGraph agents)
    """
    registry = request.app.state.agent_registry
    agent = registry.get_agent(agent_id)
    
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    # Check if agent supports workflow execution
    if not isinstance(agent, WorkflowAgent):
        raise HTTPException(
            status_code=400,
            detail=f"Agent {agent_id} does not support workflow execution"
        )
    
    try:
        result = await agent.execute_workflow(
            task=workflow_request.task,
            parameters=workflow_request.parameters
        )
        
        return WorkflowExecuteResponse(**result)
        
    except Exception as e:
        logger.error(f"Error executing workflow on agent {agent_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error executing workflow: {str(e)}"
        )


@router.delete("/{agent_id}/conversations/{conversation_id}")
async def delete_conversation(
    agent_id: str, 
    conversation_id: str, 
    request: Request
):
    """
    Delete conversation history for a specific agent
    
    This clears the conversation context stored by the agent
    """
    registry = request.app.state.agent_registry
    agent = registry.get_agent(agent_id)
    
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    try:
        # For OpenAI agents, we can clear the conversation history
        from agents.openai_agent import OpenAIAgent
        
        if isinstance(agent, OpenAIAgent):
            if conversation_id in agent.conversations:
                del agent.conversations[conversation_id]
                return {"status": "success", "message": f"Conversation {conversation_id} deleted"}
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"Conversation {conversation_id} not found"
                )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Agent {agent_id} does not support conversation deletion"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting conversation: {str(e)}"
        )


@router.post("/{agent_id}/test")
async def test_agent(agent_id: str, request: Request):
    """
    Test an agent's connection and functionality
    
    This performs a simple test query to verify the agent is working
    """
    registry = request.app.state.agent_registry
    agent = registry.get_agent(agent_id)
    
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    try:
        # For OpenAI agents, use their test_connection method
        from agents.openai_agent import OpenAIAgent
        
        if isinstance(agent, OpenAIAgent):
            result = await agent.test_connection()
            return result
        else:
            # Generic test - just try to query
            result = await agent.query(
                message="Hello! This is a connection test.",
                conversation_id="test_connection"
            )
            
            return {
                "success": True,
                "message": "Test successful",
                "response_preview": result["response"][:100],
                "agent_type": agent.get_type()
            }
            
    except Exception as e:
        logger.error(f"Error testing agent {agent_id}: {e}")
        return {
            "success": False,
            "message": "Test failed",
            "error": str(e),
            "agent_type": agent.get_type()
        }