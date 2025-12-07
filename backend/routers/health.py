"""
Health check and status endpoints
"""
from fastapi import APIRouter, Request
from backend.models.responses import HealthResponse
import time

router = APIRouter()

# Track start time for uptime calculation
start_time = time.time()


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    """
    Health check endpoint
    
    Returns service status and basic information
    """
    registry = request.app.state.agent_registry
    
    return HealthResponse(
        status="healthy" if registry.is_initialized() else "initializing",
        version="1.0.0",
        agents_loaded=len(registry.agents),
        uptime=time.time() - start_time
    )


@router.get("/status")
async def detailed_status(request: Request):
    """
    Detailed status endpoint with registry information
    """
    registry = request.app.state.agent_registry
    
    return {
        "status": "healthy" if registry.is_initialized() else "initializing",
        "version": "1.0.0",
        "uptime": time.time() - start_time,
        "registry": registry.get_registry_info(),
        "agents": [
            {
                "agent_id": agent.agent_id,
                "name": agent.name,
                "type": agent.get_type(),
                "status": "active" if agent._initialized else "inactive"
            }
            for agent in registry.agents.values()
        ]
    }