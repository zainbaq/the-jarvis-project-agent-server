"""
KM Connection management endpoints

Handles CRUD operations for Knowledge Management server connections.
"""
from fastapi import APIRouter, Request, HTTPException
from typing import List
import logging

from backend.models.km_models import (
    KMConnectionCreate,
    KMConnectionUpdate,
    KMConnectionPublic,
    KMSelectionUpdate,
    KMTestResult,
    KMCollection,
    KMCorpus
)
from backend.tools.km_connector import (
    KMServerClient,
    KMAuthenticationError,
    KMConnectionError,
    KMServerError,
    KMTimeoutError
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/connections", response_model=List[KMConnectionPublic])
async def list_km_connections(request: Request):
    """
    List all KM connections (public view, no API keys exposed)
    """
    storage = request.app.state.km_connection_storage
    return storage.list_connections_public()


@router.post("/connections", response_model=KMConnectionPublic, status_code=201)
async def create_km_connection(
    connection_data: KMConnectionCreate,
    request: Request
):
    """
    Create a new KM server connection

    This will:
    1. Login to the KM server with provided credentials
    2. Store the API key (encrypted)
    3. Fetch available collections and corpuses
    4. Return the new connection (without API key)
    """
    storage = request.app.state.km_connection_storage
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

        # Create the connection
        connection = storage.create_connection(connection_data, api_key)

        # Create client with API key to fetch collections/corpuses
        client = KMServerClient(km_server_url, api_key)

        try:
            # Fetch available collections
            collections_data = await client.list_indexes()
            collections = [
                KMCollection(
                    name=c.get('name', ''),
                    files=c.get('files', []),
                    num_chunks=c.get('num_chunks', 0)
                )
                for c in collections_data
            ]

            # Fetch available corpuses
            corpuses_data = await client.list_corpuses()
            corpuses = [
                KMCorpus(
                    id=c.get('id', 0),
                    name=c.get('name', ''),
                    display_name=c.get('display_name', c.get('name', '')),
                    description=c.get('description'),
                    category=c.get('category'),
                    chunk_count=c.get('chunk_count', 0),
                    file_count=c.get('file_count', 0),
                    is_public=c.get('is_public', False)
                )
                for c in corpuses_data
            ]

            # Update connection with collections and corpuses
            storage.update_connection_data(connection.id, collections, corpuses)
            connection = storage.get_connection(connection.id)

        except Exception as e:
            logger.warning(f"Could not fetch collections/corpuses: {e}")
            # Connection created but without collections info

        logger.info(f"Created KM connection '{connection_data.name}' for user '{connection_data.username}'")
        return KMConnectionPublic.from_connection(connection)

    except KMAuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except KMConnectionError as e:
        raise HTTPException(status_code=503, detail=f"Could not connect to KM server: {str(e)}")
    except KMTimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except KMServerError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating KM connection: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create connection: {str(e)}")


@router.get("/connections/{connection_id}", response_model=KMConnectionPublic)
async def get_km_connection(connection_id: str, request: Request):
    """
    Get details of a specific KM connection
    """
    storage = request.app.state.km_connection_storage
    connection = storage.get_connection(connection_id)

    if not connection:
        raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found")

    return KMConnectionPublic.from_connection(connection)


@router.put("/connections/{connection_id}", response_model=KMConnectionPublic)
async def update_km_connection(
    connection_id: str,
    update_data: KMConnectionUpdate,
    request: Request
):
    """
    Update a KM connection (name, active status, selected collections/corpuses)
    """
    storage = request.app.state.km_connection_storage
    connection = storage.update_connection(connection_id, update_data)

    if not connection:
        raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found")

    logger.info(f"Updated KM connection {connection_id}")
    return KMConnectionPublic.from_connection(connection)


@router.delete("/connections/{connection_id}")
async def delete_km_connection(connection_id: str, request: Request):
    """
    Delete a KM connection
    """
    storage = request.app.state.km_connection_storage
    deleted = storage.delete_connection(connection_id)

    if not deleted:
        raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found")

    logger.info(f"Deleted KM connection {connection_id}")
    return {"message": f"Connection {connection_id} deleted successfully"}


@router.post("/connections/{connection_id}/sync", response_model=KMConnectionPublic)
async def sync_km_connection(connection_id: str, request: Request):
    """
    Sync collections and corpuses from the KM server

    This refreshes the list of available collections and corpuses
    from the KM server for this connection.
    """
    storage = request.app.state.km_connection_storage
    km_server_url = request.app.state.settings.KM_SERVER_URL

    connection = storage.get_connection(connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found")

    api_key = storage.get_connection_api_key(connection_id)
    if not api_key:
        raise HTTPException(status_code=500, detail="Could not retrieve API key for connection")

    client = KMServerClient(km_server_url, api_key)

    try:
        # Fetch available collections
        collections_data = await client.list_indexes()
        collections = [
            KMCollection(
                name=c.get('name', ''),
                files=c.get('files', []),
                num_chunks=c.get('num_chunks', 0)
            )
            for c in collections_data
        ]

        # Fetch available corpuses
        corpuses_data = await client.list_corpuses()
        corpuses = [
            KMCorpus(
                id=c.get('id', 0),
                name=c.get('name', ''),
                display_name=c.get('display_name', c.get('name', '')),
                description=c.get('description'),
                category=c.get('category'),
                chunk_count=c.get('chunk_count', 0),
                file_count=c.get('file_count', 0),
                is_public=c.get('is_public', False)
            )
            for c in corpuses_data
        ]

        # Update connection
        storage.update_connection_data(connection_id, collections, corpuses)
        connection = storage.get_connection(connection_id)

        logger.info(f"Synced KM connection {connection_id}: {len(collections)} collections, {len(corpuses)} corpuses")
        return KMConnectionPublic.from_connection(connection)

    except KMAuthenticationError as e:
        storage.update_status(connection_id, "error", str(e))
        raise HTTPException(status_code=401, detail=str(e))
    except KMConnectionError as e:
        raise HTTPException(status_code=503, detail=f"Could not connect to KM server: {str(e)}")
    except Exception as e:
        logger.error(f"Error syncing KM connection: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to sync: {str(e)}")


@router.post("/connections/{connection_id}/test", response_model=KMTestResult)
async def test_km_connection(connection_id: str, request: Request):
    """
    Test if a KM connection is working

    Returns success status and available collections/corpuses count.
    """
    storage = request.app.state.km_connection_storage
    km_server_url = request.app.state.settings.KM_SERVER_URL

    connection = storage.get_connection(connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found")

    api_key = storage.get_connection_api_key(connection_id)
    if not api_key:
        return KMTestResult(
            success=False,
            message="Could not retrieve API key for connection"
        )

    client = KMServerClient(km_server_url, api_key)
    result = await client.test_connection()

    # Update connection status based on test result
    if result['success']:
        storage.update_status(connection_id, "active", None)
    else:
        storage.update_status(connection_id, "error", result['message'])

    return KMTestResult(
        success=result['success'],
        message=result['message'],
        collections_count=result.get('collections_count', 0),
        corpuses_count=result.get('corpuses_count', 0)
    )


@router.put("/connections/{connection_id}/selections", response_model=KMConnectionPublic)
async def update_km_selections(
    connection_id: str,
    selections: KMSelectionUpdate,
    request: Request
):
    """
    Update selected collections and corpuses for a connection

    This controls which collections and corpuses are searched
    when this connection is used.
    """
    storage = request.app.state.km_connection_storage
    connection = storage.update_selections(connection_id, selections)

    if not connection:
        raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found")

    logger.info(f"Updated selections for KM connection {connection_id}")
    return KMConnectionPublic.from_connection(connection)


@router.get("/status")
async def get_km_status(request: Request):
    """
    Get overall KM connector status

    Returns information about the KM server configuration and connections.
    """
    storage = request.app.state.km_connection_storage
    settings = request.app.state.settings

    connections = storage.list_connections()
    active_connections = [c for c in connections if c.status.value == "active"]
    connections_with_selections = storage.get_active_connections_with_selections()

    return {
        "km_server_url": settings.KM_SERVER_URL,
        "total_connections": len(connections),
        "active_connections": len(active_connections),
        "connections_with_selections": len(connections_with_selections),
        "is_configured": len(connections_with_selections) > 0
    }
