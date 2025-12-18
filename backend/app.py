"""
FastAPI Backend for AI Agent Management
Main application entry point with middleware and logging
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from dotenv import load_dotenv

from backend.routers import agents, health, files, km_connections, session_km, session_endpoints
from backend.agents.registry import AgentRegistry
from backend.services.file_storage import FileStorageService
from backend.services.km_connection_storage import KMConnectionStorage
from backend.services.session_manager import SessionManager
from backend.config import settings
from backend.logging_config import setup_logging
from backend.middleware import setup_middleware

load_dotenv()

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

    # Initialize file storage service
    file_storage = FileStorageService(
        base_dir=settings.FILE_UPLOAD_DIR,
        max_file_size=settings.MAX_FILE_SIZE
    )
    app.state.file_storage = file_storage
    logger.info(f"✅ File storage initialized (max size: {settings.MAX_FILE_SIZE / 1024 / 1024:.0f}MB)")

    # Initialize KM connection storage (for backward compatibility)
    km_storage = KMConnectionStorage(
        storage_file=settings.KM_CONNECTIONS_FILE,
        encryption_key=settings.KM_ENCRYPTION_KEY or None
    )
    app.state.km_connection_storage = km_storage
    app.state.settings = settings  # Store settings for access in routers
    logger.info(f"KM connection storage initialized ({len(km_storage.list_connections())} connections)")

    # Initialize session manager (for session-based isolation)
    session_manager = SessionManager()
    await session_manager.start_cleanup_task()
    app.state.session_manager = session_manager
    logger.info("Session manager initialized (24h TTL, in-memory storage)")

    logger.info("=" * 60)
    logger.info("Server ready to accept requests")
    logger.info("=" * 60)
    
    yield
    
    # Shutdown
    logger.info("=" * 60)
    logger.info("Shutting down AI Agent Backend Server")
    logger.info("=" * 60)
    await session_manager.stop_cleanup_task()
    logger.info("Session manager cleanup task stopped")
    await registry.cleanup()
    logger.info("Cleanup complete")


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
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup custom middleware and error handlers
setup_middleware(app)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(km_connections.router, prefix="/api/km", tags=["km-connections"])

# Session-scoped routers (for session-based isolation)
app.include_router(session_km.router, prefix="/api/session/km", tags=["session-km"])
app.include_router(session_endpoints.router, prefix="/api/session", tags=["session"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Agent Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "agents": "/api/agents",
        "km": "/api/km"
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