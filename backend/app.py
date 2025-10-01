"""
FastAPI Backend for AI Agent Management
Main application entry point with middleware and logging
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from routers import agents, health
from agents.registry import AgentRegistry
from config import settings
from logging_config import setup_logging
from middleware import setup_middleware

# Setup logging first
setup_logging(
    log_level=settings.DEBUG and "DEBUG" or "INFO",
    log_to_file=True
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("=" * 60)
    logger.info("🚀 Starting AI Agent Backend Server")
    logger.info("=" * 60)
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug Mode: {settings.DEBUG}")
    logger.info(f"Host: {settings.HOST}:{settings.PORT}")
    
    # Initialize agent registry
    registry = AgentRegistry(settings.AGENT_CONFIG_PATH)
    await registry.initialize()
    app.state.agent_registry = registry
    
    logger.info(f"✅ Loaded {len(registry.list_agents())} agents")
    
    # Log loaded agents
    for agent_info in registry.list_agents():
        logger.info(f"   - {agent_info.name} ({agent_info.agent_id}) - {agent_info.type}")
    
    logger.info("=" * 60)
    logger.info("✅ Server ready to accept requests")
    logger.info("=" * 60)
    
    yield
    
    # Shutdown
    logger.info("=" * 60)
    logger.info("🛑 Shutting down AI Agent Backend Server")
    logger.info("=" * 60)
    await registry.cleanup()
    logger.info("✅ Cleanup complete")


# Create FastAPI app
app = FastAPI(
    title="AI Agent Backend",
    description="Unified backend for managing multiple AI agents (LangGraph, OpenAI, Custom, etc.)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup custom middleware and error handlers
setup_middleware(app)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Agent Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "agents": "/api/agents"
    }


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting server on {settings.HOST}:{settings.PORT}")
    
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )