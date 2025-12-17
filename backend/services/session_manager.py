"""
Session Manager - In-memory session state management

Features:
- Session creation and lookup
- Session-scoped KM connections (requires fresh login per session)
- Session-scoped custom endpoints
- Session-scoped agent config overrides
- Automatic session cleanup on expiry
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import uuid
import logging
import asyncio
from threading import Lock

logger = logging.getLogger(__name__)

SESSION_TTL_HOURS = 24  # Sessions expire after 24 hours of inactivity


@dataclass
class CustomEndpoint:
    """Custom agent endpoint configuration"""
    id: str
    name: str
    url: str
    api_key: str  # Stored in memory only
    model: str
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class SessionKMConnection:
    """Session-scoped KM connection (in-memory only)"""
    id: str
    name: str
    username: str
    api_key: str  # Plaintext, in-memory only
    status: str = "active"
    collections: List[Dict] = field(default_factory=list)
    corpuses: List[Dict] = field(default_factory=list)
    selected_collection_names: List[str] = field(default_factory=list)
    selected_corpus_ids: List[int] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_sync_at: Optional[datetime] = None
    last_error: Optional[str] = None


@dataclass
class SessionState:
    """Complete state for a single session"""
    session_id: str
    conversation_id: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)

    # Session-scoped data
    km_connections: Dict[str, SessionKMConnection] = field(default_factory=dict)
    custom_endpoints: Dict[str, CustomEndpoint] = field(default_factory=dict)
    agent_config_overrides: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    files: List[str] = field(default_factory=list)


class SessionManager:
    """
    Manages all session state in-memory

    Thread-safe session operations with automatic cleanup
    """

    def __init__(self, ttl_hours: int = SESSION_TTL_HOURS):
        self._sessions: Dict[str, SessionState] = {}
        self._lock = Lock()
        self._ttl = timedelta(hours=ttl_hours)
        self._cleanup_task: Optional[asyncio.Task] = None

    async def start_cleanup_task(self):
        """Start background task to clean expired sessions"""
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("Session cleanup task started")

    async def stop_cleanup_task(self):
        """Stop the cleanup task"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            logger.info("Session cleanup task stopped")

    async def _cleanup_loop(self):
        """Periodic cleanup of expired sessions"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                self._cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in session cleanup: {e}")

    def _cleanup_expired(self):
        """Remove expired sessions"""
        now = datetime.utcnow()
        with self._lock:
            expired = [
                sid for sid, session in self._sessions.items()
                if now - session.last_activity > self._ttl
            ]
            for sid in expired:
                del self._sessions[sid]
                logger.info(f"Cleaned up expired session: {sid[:20]}...")
            if expired:
                logger.info(f"Cleaned up {len(expired)} expired sessions")

    def get_or_create_session(self, session_id: Optional[str]) -> SessionState:
        """Get existing session or create new one"""
        with self._lock:
            if session_id and session_id in self._sessions:
                session = self._sessions[session_id]
                session.last_activity = datetime.utcnow()
                return session

            # Create new session
            new_id = session_id or f"session_{uuid.uuid4()}"
            conv_id = f"conv_{uuid.uuid4().hex[:12]}"

            session = SessionState(
                session_id=new_id,
                conversation_id=conv_id
            )
            self._sessions[new_id] = session
            logger.info(f"Created new session: {new_id[:20]}... with conversation: {conv_id}")
            return session

    def get_session(self, session_id: str) -> Optional[SessionState]:
        """Get session by ID, returns None if not found"""
        with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.last_activity = datetime.utcnow()
            return session

    def delete_session(self, session_id: str) -> bool:
        """Delete a session"""
        with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                logger.info(f"Deleted session: {session_id[:20]}...")
                return True
            return False

    # ==================== KM Connection Methods ====================

    def add_km_connection(self, session_id: str, connection: SessionKMConnection) -> bool:
        """Add KM connection to session"""
        session = self.get_session(session_id)
        if not session:
            return False
        with self._lock:
            session.km_connections[connection.id] = connection
        return True

    def get_km_connections(self, session_id: str) -> List[SessionKMConnection]:
        """Get all KM connections for session"""
        session = self.get_session(session_id)
        if not session:
            return []
        return list(session.km_connections.values())

    def get_km_connection(self, session_id: str, connection_id: str) -> Optional[SessionKMConnection]:
        """Get specific KM connection"""
        session = self.get_session(session_id)
        if not session:
            return None
        return session.km_connections.get(connection_id)

    def update_km_connection(self, session_id: str, connection_id: str, updates: Dict[str, Any]) -> bool:
        """Update KM connection fields"""
        session = self.get_session(session_id)
        if not session or connection_id not in session.km_connections:
            return False

        connection = session.km_connections[connection_id]
        for key, value in updates.items():
            if hasattr(connection, key):
                setattr(connection, key, value)
        return True

    def delete_km_connection(self, session_id: str, connection_id: str) -> bool:
        """Delete KM connection from session"""
        session = self.get_session(session_id)
        if not session or connection_id not in session.km_connections:
            return False
        with self._lock:
            del session.km_connections[connection_id]
        return True

    # ==================== Custom Endpoint Methods ====================

    def add_custom_endpoint(self, session_id: str, endpoint: CustomEndpoint) -> bool:
        """Add custom endpoint to session"""
        session = self.get_session(session_id)
        if not session:
            return False
        with self._lock:
            session.custom_endpoints[endpoint.id] = endpoint
        return True

    def get_custom_endpoints(self, session_id: str) -> List[CustomEndpoint]:
        """Get all custom endpoints for session"""
        session = self.get_session(session_id)
        if not session:
            return []
        return list(session.custom_endpoints.values())

    def get_custom_endpoint(self, session_id: str, endpoint_id: str) -> Optional[CustomEndpoint]:
        """Get specific custom endpoint"""
        session = self.get_session(session_id)
        if not session:
            return None
        return session.custom_endpoints.get(endpoint_id)

    def delete_custom_endpoint(self, session_id: str, endpoint_id: str) -> bool:
        """Delete custom endpoint from session"""
        session = self.get_session(session_id)
        if not session or endpoint_id not in session.custom_endpoints:
            return False
        with self._lock:
            del session.custom_endpoints[endpoint_id]
        return True

    # ==================== Agent Config Override Methods ====================

    def set_agent_config_override(self, session_id: str, agent_id: str, config: Dict[str, Any]) -> bool:
        """Set config overrides for an agent in this session"""
        session = self.get_session(session_id)
        if not session:
            return False
        with self._lock:
            session.agent_config_overrides[agent_id] = config
        return True

    def get_agent_config_override(self, session_id: str, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get config overrides for an agent"""
        session = self.get_session(session_id)
        if not session:
            return None
        return session.agent_config_overrides.get(agent_id)

    def clear_agent_config_override(self, session_id: str, agent_id: str) -> bool:
        """Clear config overrides for an agent"""
        session = self.get_session(session_id)
        if not session or agent_id not in session.agent_config_overrides:
            return False
        with self._lock:
            del session.agent_config_overrides[agent_id]
        return True

    # ==================== Stats ====================

    def get_stats(self) -> Dict[str, Any]:
        """Get session manager statistics"""
        with self._lock:
            return {
                "active_sessions": len(self._sessions),
                "total_km_connections": sum(
                    len(s.km_connections) for s in self._sessions.values()
                ),
                "total_custom_endpoints": sum(
                    len(s.custom_endpoints) for s in self._sessions.values()
                ),
                "ttl_hours": self._ttl.total_seconds() / 3600
            }
