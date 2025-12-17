"""
Agent management and interaction endpoints - WITH AGENT MANAGER INTEGRATION

Supports both:
- Global agents (from config/agents.json)
- Session-scoped custom endpoints (stored in session memory)
"""
from fastapi import APIRouter, Request, HTTPException, Query
from typing import List, Optional, Dict, Any
import logging

from backend.models.requests import ChatRequest, WorkflowExecuteRequest
from backend.models.responses import (
    AgentInfo, ChatResponse, WorkflowExecuteResponse, ErrorResponse
)
from backend.agents.base import WorkflowAgent, AgentCapability
from backend.agents.endpoint_agent import EndpointAgent
from backend.agent_manager import get_agent_manager
from backend.services.session_manager import CustomEndpoint, SessionKMConnection
from backend.models.km_models import KMConnection, KMConnectionStatus

router = APIRouter()
logger = logging.getLogger(__name__)


class SessionKMConnectionAdapter:
    """
    Adapter to make session KM connections compatible with KMConnectorTool.

    Wraps session manager's KM connections to provide the same interface
    as KMConnectionStorage.
    """

    def __init__(self, session_manager, session_id: str):
        self.session_manager = session_manager
        self.session_id = session_id

    def _to_km_connection(self, session_conn: SessionKMConnection) -> KMConnection:
        """Convert SessionKMConnection to KMConnection model"""
        # Convert datetime to ISO string format
        created_at_str = session_conn.created_at.isoformat() if hasattr(session_conn.created_at, 'isoformat') else str(session_conn.created_at)
        last_sync_str = session_conn.last_sync_at.isoformat() if session_conn.last_sync_at and hasattr(session_conn.last_sync_at, 'isoformat') else None

        return KMConnection(
            id=session_conn.id,
            name=session_conn.name,
            username=session_conn.username,
            api_key_encrypted="session_managed",  # Placeholder - actual key accessed via get_connection_api_key
            status=KMConnectionStatus(session_conn.status) if session_conn.status in ["active", "inactive", "error"] else KMConnectionStatus.ACTIVE,
            collections=[],  # Not needed for search
            corpuses=[],  # Not needed for search
            selected_collection_names=session_conn.selected_collection_names,
            selected_corpus_ids=session_conn.selected_corpus_ids,
            created_at=created_at_str,
            last_sync_at=last_sync_str,
            last_error=session_conn.last_error
        )

    def get_connection(self, connection_id: str) -> Optional[KMConnection]:
        """Get a connection by ID"""
        session_conn = self.session_manager.get_km_connection(self.session_id, connection_id)
        if session_conn:
            return self._to_km_connection(session_conn)
        return None

    def get_connection_api_key(self, connection_id: str) -> Optional[str]:
        """Get API key for a connection"""
        session_conn = self.session_manager.get_km_connection(self.session_id, connection_id)
        if session_conn:
            return session_conn.api_key
        return None

    def list_connections(self) -> List[KMConnection]:
        """List all connections"""
        session_conns = self.session_manager.get_km_connections(self.session_id)
        return [self._to_km_connection(c) for c in session_conns]

    def get_active_connections_with_selections(self) -> List[KMConnection]:
        """Get active connections that have selections"""
        session_conns = self.session_manager.get_km_connections(self.session_id)
        result = []
        for c in session_conns:
            if c.status == "active" and (c.selected_collection_names or c.selected_corpus_ids):
                result.append(self._to_km_connection(c))
        return result

    def update_status(self, connection_id: str, status: KMConnectionStatus, error: Optional[str] = None):
        """Update connection status"""
        updates = {'status': status.value}
        if error:
            updates['last_error'] = error
        self.session_manager.update_km_connection(self.session_id, connection_id, updates)


def _create_temp_endpoint_agent(endpoint: CustomEndpoint) -> EndpointAgent:
    """Create a temporary EndpointAgent from a session custom endpoint"""
    config = {
        'api_key': endpoint.api_key,
        'base_url': endpoint.url,
        'model': endpoint.model,
        'name': endpoint.name,
        'description': f"Custom endpoint: {endpoint.name}"
    }
    agent = EndpointAgent(agent_id=endpoint.id, config=config)
    return agent


def _custom_endpoint_to_agent_info(endpoint: CustomEndpoint) -> AgentInfo:
    """Convert a CustomEndpoint to AgentInfo for listing"""
    return AgentInfo(
        agent_id=endpoint.id,
        name=endpoint.name,
        type="custom_endpoint",
        description=f"Custom endpoint ({endpoint.model})",
        capabilities=["chat", "streaming"],
        config={
            "url": endpoint.url,
            "model": endpoint.model
        }
    )


@router.get("/", response_model=List[AgentInfo])
async def list_agents(
    request: Request,
    agent_type: Optional[str] = Query(None, description="Filter by agent type"),
    capability: Optional[str] = Query(None, description="Filter by capability"),
    include_custom: bool = Query(True, description="Include session custom endpoints")
):
    """
    List all available agents

    Includes both global agents and session-scoped custom endpoints.

    Optional filters:
    - agent_type: Filter by type (openai, endpoint, langgraph, custom_endpoint, etc.)
    - capability: Filter by capability (chat, workflow, etc.)
    - include_custom: Include session custom endpoints (default: True)
    """
    registry = request.app.state.agent_registry
    result = []

    # Get global agents
    if agent_type:
        agents = registry.get_agents_by_type(agent_type)
        result = [agent.get_info() for agent in agents]
    elif capability:
        agents = registry.get_agents_by_capability(capability)
        result = [agent.get_info() for agent in agents]
    else:
        result = registry.list_agents()

    # Add session custom endpoints if requested
    if include_custom and hasattr(request.state, 'session'):
        session = request.state.session
        session_manager = request.app.state.session_manager
        custom_endpoints = session_manager.get_custom_endpoints(session.session_id)

        for endpoint in custom_endpoints:
            # Apply type filter if specified
            if agent_type and agent_type != "custom_endpoint":
                continue
            # Apply capability filter if specified
            if capability and capability not in ["chat", "streaming"]:
                continue

            result.append(_custom_endpoint_to_agent_info(endpoint))

    return result


@router.get("/{agent_id}", response_model=AgentInfo)
async def get_agent(agent_id: str, request: Request):
    """
    Get information about a specific agent

    Checks both global agents and session custom endpoints.
    """
    # First check session custom endpoints
    if hasattr(request.state, 'session'):
        session = request.state.session
        session_manager = request.app.state.session_manager
        custom_endpoint = session_manager.get_custom_endpoint(session.session_id, agent_id)
        if custom_endpoint:
            return _custom_endpoint_to_agent_info(custom_endpoint)

    # Then check global registry
    registry = request.app.state.agent_registry
    agent = registry.get_agent(agent_id)

    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    return agent.get_info()


@router.post("/{agent_id}/chat", response_model=ChatResponse)
async def chat_with_agent(agent_id: str, chat_request: ChatRequest, request: Request):
    """
    Send a chat message to an agent

    The agent manager will handle:
    - Web search if enabled
    - KM search if enabled (session-scoped)
    - Prompt engineering with search results
    - Tool orchestration
    - Conversation context management

    Supports both global agents and session custom endpoints.
    """
    # Log incoming parameters
    logger.info(f"[Chat] /chat endpoint received request for agent: {agent_id}")
    logger.debug(f"[Chat]   - enable_km_search: {chat_request.enable_km_search}")
    logger.debug(f"[Chat]   - km_connection_ids: {chat_request.km_connection_ids}")
    logger.debug(f"[Chat]   - enable_web_search: {chat_request.enable_web_search}")

    agent = None
    is_custom_endpoint = False

    # First check if this is a session custom endpoint
    if hasattr(request.state, 'session'):
        session = request.state.session
        session_manager = request.app.state.session_manager
        custom_endpoint = session_manager.get_custom_endpoint(session.session_id, agent_id)

        if custom_endpoint:
            # Create temporary agent for this custom endpoint
            agent = _create_temp_endpoint_agent(custom_endpoint)
            await agent.initialize()
            is_custom_endpoint = True
            logger.info(f"[Chat] Using session custom endpoint: {custom_endpoint.name}")

    # If not a custom endpoint, check global registry
    if not agent:
        registry = request.app.state.agent_registry
        agent = registry.get_agent(agent_id)

    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    try:
        # Get agent manager
        agent_manager = get_agent_manager()

        # Set up KM connector with session-aware storage
        # Always update to use session connections (they may have changed)
        if hasattr(request.state, 'session') and hasattr(request.app.state, 'session_manager'):
            session = request.state.session
            session_adapter = SessionKMConnectionAdapter(
                request.app.state.session_manager,
                session.session_id
            )
            agent_manager.set_km_connector(
                session_adapter,
                request.app.state.settings.KM_SERVER_URL
            )
            logger.debug(f"[Chat] Using session KM connections for session {session.session_id[:12]}...")
        elif hasattr(request.app.state, 'km_connection_storage') and not agent_manager.km_connector_tool:
            # Fallback to file-based storage if no session
            agent_manager.set_km_connector(
                request.app.state.km_connection_storage,
                request.app.state.settings.KM_SERVER_URL
            )

        # Get conversation history (if agent supports it)
        conversation_history = None
        if hasattr(agent, 'conversations') and chat_request.conversation_id:
            conversation_history = agent.conversations.get(
                chat_request.conversation_id, []
            )

        # Load file metadata from storage if files are uploaded
        file_metadata_list = None
        if chat_request.uploaded_files and chat_request.conversation_id:
            file_storage = request.app.state.file_storage
            file_metadata_list = []
            for uploaded_file in chat_request.uploaded_files:
                file_meta = file_storage.get_file(
                    conversation_id=chat_request.conversation_id,
                    file_id=uploaded_file.file_id
                )
                if file_meta:
                    file_metadata_list.append(file_meta)

        # Process query through agent manager
        result = await agent_manager.process_query(
            agent=agent,
            message=chat_request.message,
            conversation_id=chat_request.conversation_id,
            enable_web_search=chat_request.enable_web_search,
            enable_km_search=chat_request.enable_km_search,
            km_connection_ids=chat_request.km_connection_ids,
            uploaded_files=file_metadata_list,
            conversation_history=conversation_history,
            parameters=chat_request.parameters
        )

        response = ChatResponse(
            response=result["response"],
            conversation_id=result["conversation_id"],
            agent_id=agent_id,
            metadata=result.get("metadata", {}),
            tools_used=result.get("tools_used", []),
            web_search_enabled=result.get("web_search_enabled", False),
            km_search_enabled=result.get("km_search_enabled", False)
        )

        # Cleanup temporary custom endpoint agent
        if is_custom_endpoint:
            await agent.cleanup()

        return response

    except Exception as e:
        # Cleanup temporary custom endpoint agent on error
        if is_custom_endpoint and agent:
            try:
                await agent.cleanup()
            except Exception:
                pass

        logger.error(f"Error in chat with agent {agent_id}: {e}", exc_info=True)
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
        # For agents with conversation storage
        from backend.agents.openai_agent import OpenAIAgent
        from backend.agents.endpoint_agent import EndpointAgent
        
        if isinstance(agent, (OpenAIAgent, EndpointAgent)):
            if conversation_id in agent.conversations:
                del agent.conversations[conversation_id]

                # Get agent manager for tool cleanup
                from backend.agent_manager import get_agent_manager
                agent_manager = get_agent_manager()

                # Clear web search data
                if agent_manager.web_search_tool.is_vector_store_available():
                    agent_manager.web_search_tool.clear_conversation(conversation_id)

                # Clear file search data
                if agent_manager.tools_available.get("file_search"):
                    agent_manager.file_search_tool.clear_conversation(conversation_id)

                # Clear local uploaded files
                file_storage = request.app.state.file_storage
                await file_storage.clear_conversation_files(conversation_id)

                # Clear OpenAI file resources if OpenAI agent
                if isinstance(agent, OpenAIAgent):
                    await agent.cleanup_conversation(conversation_id)

                return {
                    "status": "success",
                    "message": f"Conversation {conversation_id} deleted"
                }
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
        # For agents with test_connection method
        from backend.agents.openai_agent import OpenAIAgent
        from backend.agents.endpoint_agent import EndpointAgent
        
        if isinstance(agent, (OpenAIAgent, EndpointAgent)):
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


@router.get("/tools/status")
async def get_tools_status(request: Request):
    """
    Get status of available tools (web search, etc.)
    """
    from backend.agent_manager import get_agent_manager
    
    agent_manager = get_agent_manager()
    tools = agent_manager.get_available_tools()
    
    return {
        "tools": tools,
        "web_search_configured": tools.get("web_search", False)
    }


@router.post("/tools/test")
async def test_tools(request: Request):
    """
    Test all available tools
    """
    from backend.agent_manager import get_agent_manager
    
    try:
        agent_manager = get_agent_manager()
        results = await agent_manager.test_tools()
        
        return {
            "success": True,
            "results": results
        }
    except Exception as e:
        logger.error(f"Error testing tools: {e}")
        return {
            "success": False,
            "error": str(e)
        }