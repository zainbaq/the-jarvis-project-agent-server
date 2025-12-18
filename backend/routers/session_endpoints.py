"""
Session-scoped custom endpoint management

Custom endpoints are stored per-session:
- API keys stored in session memory only
- Not persisted to disk
- Lost when session expires or server restarts
"""
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid
import logging

from backend.services.session_manager import CustomEndpoint, SessionState

router = APIRouter()
logger = logging.getLogger(__name__)


class CustomEndpointCreate(BaseModel):
    """Request model for creating a custom endpoint"""
    name: str = Field(..., description="Display name for the endpoint")
    url: str = Field(..., description="Base URL of the OpenAI-compatible API")
    api_key: str = Field(..., description="API key for authentication")
    model: str = Field(..., description="Model identifier to use")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "My Custom LLM",
                "url": "https://api.example.com/v1",
                "api_key": "sk-...",
                "model": "gpt-4-turbo"
            }
        }


class CustomEndpointPublic(BaseModel):
    """Public view of custom endpoint (no API key exposed)"""
    id: str
    name: str
    url: str
    model: str
    created_at: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "endpoint_abc123",
                "name": "My Custom LLM",
                "url": "https://api.example.com/v1",
                "model": "gpt-4-turbo",
                "created_at": "2025-01-15T10:30:00"
            }
        }


class CustomEndpointUpdate(BaseModel):
    """Request model for updating a custom endpoint"""
    name: Optional[str] = Field(None, description="New display name")
    url: Optional[str] = Field(None, description="New base URL")
    api_key: Optional[str] = Field(None, description="New API key")
    model: Optional[str] = Field(None, description="New model identifier")


def get_session(request: Request) -> SessionState:
    """Dependency to get current session"""
    session = getattr(request.state, 'session', None)
    if not session:
        raise HTTPException(status_code=400, detail="No session found. Ensure X-Session-ID header is provided.")
    return session


def _to_public(endpoint: CustomEndpoint) -> CustomEndpointPublic:
    """Convert custom endpoint to public view (no API key)"""
    created_at = endpoint.created_at
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()
    return CustomEndpointPublic(
        id=endpoint.id,
        name=endpoint.name,
        url=endpoint.url,
        model=endpoint.model,
        created_at=str(created_at)
    )


@router.get("/endpoints", response_model=List[CustomEndpointPublic])
async def list_custom_endpoints(request: Request):
    """
    List all custom endpoints for the current session

    Returns endpoints that are scoped to this browser session only.
    Other sessions/tabs will not see these endpoints.
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager

    endpoints = session_manager.get_custom_endpoints(session.session_id)
    return [_to_public(e) for e in endpoints]


@router.post("/endpoints", response_model=CustomEndpointPublic, status_code=201)
async def create_custom_endpoint(
    data: CustomEndpointCreate,
    request: Request
):
    """
    Create a custom endpoint for this session

    The endpoint will be available as an agent option in this session.
    API key is stored in memory only and will not persist across server restarts.
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager

    endpoint = CustomEndpoint(
        id=f"custom_{uuid.uuid4().hex[:12]}",
        name=data.name,
        url=data.url,
        api_key=data.api_key,
        model=data.model
    )

    session_manager.add_custom_endpoint(session.session_id, endpoint)

    logger.info(f"Created custom endpoint '{data.name}' for session {session.session_id[:12]}...")
    return _to_public(endpoint)


@router.get("/endpoints/{endpoint_id}", response_model=CustomEndpointPublic)
async def get_custom_endpoint(endpoint_id: str, request: Request):
    """
    Get details of a specific custom endpoint in this session
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager

    endpoint = session_manager.get_custom_endpoint(session.session_id, endpoint_id)
    if not endpoint:
        raise HTTPException(status_code=404, detail=f"Endpoint {endpoint_id} not found in this session")

    return _to_public(endpoint)


@router.put("/endpoints/{endpoint_id}", response_model=CustomEndpointPublic)
async def update_custom_endpoint(
    endpoint_id: str,
    update_data: CustomEndpointUpdate,
    request: Request
):
    """
    Update a custom endpoint in this session
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager

    endpoint = session_manager.get_custom_endpoint(session.session_id, endpoint_id)
    if not endpoint:
        raise HTTPException(status_code=404, detail=f"Endpoint {endpoint_id} not found in this session")

    # Apply updates
    if update_data.name is not None:
        endpoint.name = update_data.name
    if update_data.url is not None:
        endpoint.url = update_data.url
    if update_data.api_key is not None:
        endpoint.api_key = update_data.api_key
    if update_data.model is not None:
        endpoint.model = update_data.model

    logger.info(f"Updated custom endpoint {endpoint_id}")
    return _to_public(endpoint)


@router.delete("/endpoints/{endpoint_id}")
async def delete_custom_endpoint(endpoint_id: str, request: Request):
    """
    Delete a custom endpoint from this session
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager

    deleted = session_manager.delete_custom_endpoint(session.session_id, endpoint_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Endpoint {endpoint_id} not found in this session")

    logger.info(f"Deleted custom endpoint {endpoint_id}")
    return {"message": f"Endpoint {endpoint_id} deleted successfully"}


@router.post("/endpoints/{endpoint_id}/test")
async def test_custom_endpoint(endpoint_id: str, request: Request):
    """
    Test if a custom endpoint is working

    Sends a simple request to verify the endpoint is accessible.
    """
    import httpx

    session = get_session(request)
    session_manager = request.app.state.session_manager

    endpoint = session_manager.get_custom_endpoint(session.session_id, endpoint_id)
    if not endpoint:
        raise HTTPException(status_code=404, detail=f"Endpoint {endpoint_id} not found in this session")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try to list models (common OpenAI-compatible endpoint)
            response = await client.get(
                f"{endpoint.url.rstrip('/')}/models",
                headers={"Authorization": f"Bearer {endpoint.api_key}"}
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "message": "Endpoint is accessible",
                    "status_code": response.status_code
                }
            else:
                return {
                    "success": False,
                    "message": f"Endpoint returned status {response.status_code}",
                    "status_code": response.status_code
                }

    except httpx.TimeoutException:
        return {
            "success": False,
            "message": "Connection timed out"
        }
    except httpx.ConnectError as e:
        return {
            "success": False,
            "message": f"Connection failed: {str(e)}"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Test failed: {str(e)}"
        }


@router.get("/info")
async def get_session_info(request: Request):
    """
    Get information about the current session

    Returns session ID, conversation ID, and counts of session-scoped resources.
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager

    return {
        "session_id": session.session_id,
        "conversation_id": session.conversation_id,
        "created_at": session.created_at.isoformat(),
        "last_activity": session.last_activity.isoformat(),
        "km_connections_count": len(session.km_connections),
        "custom_endpoints_count": len(session.custom_endpoints),
        "agent_config_overrides_count": len(session.agent_config_overrides)
    }
