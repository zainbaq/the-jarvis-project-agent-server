"""
Session-scoped KM Connection endpoints

All KM connections are session-scoped:
- Login required per session (no reuse of API keys between sessions)
- Connections stored in memory only
- Lost when session expires or server restarts
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid
import logging

from backend.models.km_models import (
    KMConnectionCreate,
    KMSelectionUpdate,
    KMTestResult,
    KMCollection,
    KMCorpus,
    KMConnectionStatus
)
from backend.tools.km_connector import (
    KMServerClient,
    KMAuthenticationError,
    KMConnectionError,
    KMServerError,
    KMTimeoutError
)
from backend.services.session_manager import SessionKMConnection, SessionState

router = APIRouter()
logger = logging.getLogger(__name__)


# Response models for session KM connections
class SessionKMConnectionPublic(BaseModel):
    """Public view of session KM connection (no API key exposed)"""
    id: str
    name: str
    username: str
    status: str
    collections: List[KMCollection]
    corpuses: List[KMCorpus]
    selected_collection_names: List[str]
    selected_corpus_ids: List[int]
    created_at: str
    last_sync_at: Optional[str]
    last_error: Optional[str]


class SessionKMConnectionUpdate(BaseModel):
    """Request model for updating a session KM connection"""
    name: Optional[str] = Field(None, description="New connection name")
    status: Optional[str] = Field(None, description="Connection status (active/inactive)")


def get_session(request: Request) -> SessionState:
    """Dependency to get current session"""
    session = getattr(request.state, 'session', None)
    if not session:
        raise HTTPException(status_code=400, detail="No session found. Ensure X-Session-ID header is provided.")
    return session


def _to_public(conn: SessionKMConnection) -> SessionKMConnectionPublic:
    """Convert session KM connection to public view"""
    return SessionKMConnectionPublic(
        id=conn.id,
        name=conn.name,
        username=conn.username,
        status=conn.status,
        collections=[KMCollection(**c) if isinstance(c, dict) else c for c in conn.collections],
        corpuses=[KMCorpus(**c) if isinstance(c, dict) else c for c in conn.corpuses],
        selected_collection_names=conn.selected_collection_names,
        selected_corpus_ids=conn.selected_corpus_ids,
        created_at=conn.created_at.isoformat() if isinstance(conn.created_at, datetime) else str(conn.created_at),
        last_sync_at=conn.last_sync_at.isoformat() if conn.last_sync_at else None,
        last_error=conn.last_error
    )


@router.get("/connections", response_model=List[SessionKMConnectionPublic])
async def list_session_km_connections(request: Request):
    """
    List all KM connections for current session

    Returns connections that are scoped to this browser session only.
    Other sessions/tabs will not see these connections.
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager

    connections = session_manager.get_km_connections(session.session_id)
    return [_to_public(c) for c in connections]


@router.post("/connections", response_model=SessionKMConnectionPublic, status_code=201)
async def create_session_km_connection(
    connection_data: KMConnectionCreate,
    request: Request
):
    """
    Create a new KM connection for this session

    This will:
    1. Login to the KM server with provided credentials
    2. Store the API key in session memory (not persisted)
    3. Fetch available collections and corpuses
    4. Return the new connection (without API key)

    Note: This connection is only available in this session and will be
    lost when the session expires or the server restarts.
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager
    km_server_url = request.app.state.settings.KM_SERVER_URL

    # Create a temporary client to login
    temp_client = KMServerClient(km_server_url, "")

    try:
        # Login to get API key
        login_response = await temp_client.login(
            username=connection_data.username,
            password=connection_data.password
        )
        api_key = login_response.get('api_key')

        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="Login succeeded but no API key returned"
            )

        # Create session-scoped connection
        connection = SessionKMConnection(
            id=str(uuid.uuid4()),
            name=connection_data.name,
            username=connection_data.username,
            api_key=api_key  # Stored in memory only
        )

        # Fetch collections/corpuses
        client = KMServerClient(km_server_url, api_key)

        try:
            # Fetch available collections
            collections_data = await client.list_indexes()
            connection.collections = [
                {
                    'name': c.get('name', ''),
                    'files': c.get('files', []),
                    'num_chunks': c.get('num_chunks', 0)
                }
                for c in collections_data
            ]

            # Fetch available corpuses
            corpuses_data = await client.list_corpuses()
            connection.corpuses = [
                {
                    'id': c.get('id', 0),
                    'name': c.get('name', ''),
                    'display_name': c.get('display_name', c.get('name', '')),
                    'description': c.get('description'),
                    'category': c.get('category'),
                    'chunk_count': c.get('chunk_count', 0),
                    'file_count': c.get('file_count', 0),
                    'is_public': c.get('is_public', False)
                }
                for c in corpuses_data
            ]

            connection.last_sync_at = datetime.utcnow()

        except Exception as e:
            logger.warning(f"Could not fetch collections/corpuses: {e}")
            connection.last_error = str(e)

        # Add to session
        session_manager.add_km_connection(session.session_id, connection)

        logger.info(f"Created session KM connection '{connection_data.name}' for session {session.session_id[:12]}...")
        return _to_public(connection)

    except KMAuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except KMConnectionError as e:
        raise HTTPException(status_code=503, detail=f"Could not connect to KM server: {str(e)}")
    except KMTimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except KMServerError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating session KM connection: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create connection: {str(e)}")


@router.get("/connections/{connection_id}", response_model=SessionKMConnectionPublic)
async def get_session_km_connection(connection_id: str, request: Request):
    """
    Get details of a specific KM connection in this session
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager

    connection = session_manager.get_km_connection(session.session_id, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found in this session")

    return _to_public(connection)


@router.put("/connections/{connection_id}", response_model=SessionKMConnectionPublic)
async def update_session_km_connection(
    connection_id: str,
    update_data: SessionKMConnectionUpdate,
    request: Request
):
    """
    Update a session KM connection (name, status)
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager

    connection = session_manager.get_km_connection(session.session_id, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found in this session")

    updates = {}
    if update_data.name is not None:
        updates['name'] = update_data.name
    if update_data.status is not None:
        updates['status'] = update_data.status

    if updates:
        session_manager.update_km_connection(session.session_id, connection_id, updates)

    # Get updated connection
    connection = session_manager.get_km_connection(session.session_id, connection_id)
    logger.info(f"Updated session KM connection {connection_id}")
    return _to_public(connection)


@router.delete("/connections/{connection_id}")
async def delete_session_km_connection(connection_id: str, request: Request):
    """
    Delete a KM connection from this session
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager

    deleted = session_manager.delete_km_connection(session.session_id, connection_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found in this session")

    logger.info(f"Deleted session KM connection {connection_id}")
    return {"message": f"Connection {connection_id} deleted successfully"}


@router.post("/connections/{connection_id}/sync", response_model=SessionKMConnectionPublic)
async def sync_session_km_connection(connection_id: str, request: Request):
    """
    Sync collections and corpuses from the KM server

    This refreshes the list of available collections and corpuses
    from the KM server for this connection.
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager
    km_server_url = request.app.state.settings.KM_SERVER_URL

    connection = session_manager.get_km_connection(session.session_id, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found in this session")

    client = KMServerClient(km_server_url, connection.api_key)

    try:
        # Fetch available collections
        collections_data = await client.list_indexes()
        collections = [
            {
                'name': c.get('name', ''),
                'files': c.get('files', []),
                'num_chunks': c.get('num_chunks', 0)
            }
            for c in collections_data
        ]

        # Fetch available corpuses
        corpuses_data = await client.list_corpuses()
        corpuses = [
            {
                'id': c.get('id', 0),
                'name': c.get('name', ''),
                'display_name': c.get('display_name', c.get('name', '')),
                'description': c.get('description'),
                'category': c.get('category'),
                'chunk_count': c.get('chunk_count', 0),
                'file_count': c.get('file_count', 0),
                'is_public': c.get('is_public', False)
            }
            for c in corpuses_data
        ]

        # Update connection
        session_manager.update_km_connection(session.session_id, connection_id, {
            'collections': collections,
            'corpuses': corpuses,
            'last_sync_at': datetime.utcnow(),
            'last_error': None
        })

        connection = session_manager.get_km_connection(session.session_id, connection_id)
        logger.info(f"Synced session KM connection {connection_id}: {len(collections)} collections, {len(corpuses)} corpuses")
        return _to_public(connection)

    except KMAuthenticationError as e:
        session_manager.update_km_connection(session.session_id, connection_id, {
            'status': 'error',
            'last_error': str(e)
        })
        raise HTTPException(status_code=401, detail=str(e))
    except KMConnectionError as e:
        raise HTTPException(status_code=503, detail=f"Could not connect to KM server: {str(e)}")
    except Exception as e:
        logger.error(f"Error syncing session KM connection: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to sync: {str(e)}")


@router.post("/connections/{connection_id}/test", response_model=KMTestResult)
async def test_session_km_connection(connection_id: str, request: Request):
    """
    Test if a session KM connection is working

    Returns success status and available collections/corpuses count.
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager
    km_server_url = request.app.state.settings.KM_SERVER_URL

    connection = session_manager.get_km_connection(session.session_id, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found in this session")

    client = KMServerClient(km_server_url, connection.api_key)
    result = await client.test_connection()

    # Update connection status based on test result
    if result['success']:
        session_manager.update_km_connection(session.session_id, connection_id, {
            'status': 'active',
            'last_error': None
        })
    else:
        session_manager.update_km_connection(session.session_id, connection_id, {
            'status': 'error',
            'last_error': result['message']
        })

    return KMTestResult(
        success=result['success'],
        message=result['message'],
        collections_count=result.get('collections_count', 0),
        corpuses_count=result.get('corpuses_count', 0)
    )


@router.put("/connections/{connection_id}/selections", response_model=SessionKMConnectionPublic)
async def update_session_km_selections(
    connection_id: str,
    selections: KMSelectionUpdate,
    request: Request
):
    """
    Update selected collections and corpuses for a session connection

    This controls which collections and corpuses are searched
    when this connection is used.
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager

    connection = session_manager.get_km_connection(session.session_id, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found in this session")

    session_manager.update_km_connection(session.session_id, connection_id, {
        'selected_collection_names': selections.selected_collection_names,
        'selected_corpus_ids': selections.selected_corpus_ids
    })

    connection = session_manager.get_km_connection(session.session_id, connection_id)
    logger.info(f"Updated selections for session KM connection {connection_id}")
    return _to_public(connection)


@router.get("/status")
async def get_session_km_status(request: Request):
    """
    Get KM connector status for this session

    Returns information about the KM server configuration and session connections.
    """
    session = get_session(request)
    session_manager = request.app.state.session_manager
    settings = request.app.state.settings

    connections = session_manager.get_km_connections(session.session_id)
    active_connections = [c for c in connections if c.status == "active"]
    connections_with_selections = [
        c for c in connections
        if c.status == "active" and (c.selected_collection_names or c.selected_corpus_ids)
    ]

    return {
        "session_id": session.session_id[:12] + "...",
        "km_server_url": settings.KM_SERVER_URL,
        "total_connections": len(connections),
        "active_connections": len(active_connections),
        "connections_with_selections": len(connections_with_selections),
        "is_configured": len(connections_with_selections) > 0
    }
