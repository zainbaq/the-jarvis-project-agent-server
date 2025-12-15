"""
KM Connection Storage Service - Manages KM server connections with encrypted API keys

Handles:
- Connection CRUD operations
- API key encryption/decryption
- JSON file-based persistence
"""
import os
import json
import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
from cryptography.fernet import Fernet
import base64
import hashlib

from backend.models.km_models import (
    KMConnection,
    KMConnectionCreate,
    KMConnectionUpdate,
    KMConnectionPublic,
    KMConnectionStatus,
    KMCollection,
    KMCorpus,
    KMSelectionUpdate
)

logger = logging.getLogger(__name__)


class KMConnectionStorage:
    """
    Service for managing KM server connections with encrypted storage

    Connections are stored in: backend/data/km_connections.json
    API keys are encrypted using Fernet symmetric encryption
    """

    def __init__(
        self,
        storage_file: str = "backend/data/km_connections.json",
        encryption_key: Optional[str] = None
    ):
        """
        Initialize KM connection storage

        Args:
            storage_file: Path to JSON storage file
            encryption_key: Fernet encryption key (auto-generated if not provided)
        """
        self.storage_file = Path(storage_file)

        # Ensure directory exists
        self.storage_file.parent.mkdir(parents=True, exist_ok=True)

        # Initialize encryption
        self._init_encryption(encryption_key)

        # Load existing connections
        self._connections: Dict[str, KMConnection] = {}
        self._load_connections()

        logger.info(f"KMConnectionStorage initialized (file: {self.storage_file})")

    def _init_encryption(self, encryption_key: Optional[str] = None):
        """Initialize Fernet encryption"""
        if encryption_key:
            # Use provided key (should be a valid Fernet key)
            try:
                self._cipher = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
            except Exception:
                # If invalid, derive a key from the provided string
                key = base64.urlsafe_b64encode(hashlib.sha256(encryption_key.encode()).digest())
                self._cipher = Fernet(key)
        else:
            # Check for key file
            key_file = self.storage_file.parent / ".km_encryption_key"
            if key_file.exists():
                with open(key_file, 'rb') as f:
                    key = f.read()
                self._cipher = Fernet(key)
            else:
                # Generate new key and save
                key = Fernet.generate_key()
                with open(key_file, 'wb') as f:
                    f.write(key)
                self._cipher = Fernet(key)
                logger.warning(f"Generated new encryption key at {key_file}")

    def _encrypt_api_key(self, api_key: str) -> str:
        """Encrypt an API key"""
        return self._cipher.encrypt(api_key.encode()).decode()

    def _decrypt_api_key(self, encrypted: str) -> str:
        """Decrypt an API key"""
        return self._cipher.decrypt(encrypted.encode()).decode()

    def _load_connections(self):
        """Load connections from JSON file"""
        if not self.storage_file.exists():
            self._connections = {}
            return

        try:
            with open(self.storage_file, 'r') as f:
                data = json.load(f)

            for conn_data in data.get('connections', []):
                try:
                    # Parse collections
                    collections = [
                        KMCollection(**c) for c in conn_data.get('collections', [])
                    ]

                    # Parse corpuses
                    corpuses = [
                        KMCorpus(**c) for c in conn_data.get('corpuses', [])
                    ]

                    conn = KMConnection(
                        id=conn_data['id'],
                        name=conn_data['name'],
                        username=conn_data['username'],
                        api_key_encrypted=conn_data['api_key_encrypted'],
                        status=KMConnectionStatus(conn_data.get('status', 'active')),
                        collections=collections,
                        corpuses=corpuses,
                        selected_collection_names=conn_data.get('selected_collection_names', []),
                        selected_corpus_ids=conn_data.get('selected_corpus_ids', []),
                        created_at=conn_data['created_at'],
                        updated_at=conn_data['updated_at'],
                        last_sync_at=conn_data.get('last_sync_at'),
                        last_error=conn_data.get('last_error')
                    )
                    self._connections[conn.id] = conn
                except Exception as e:
                    logger.error(f"Failed to load connection {conn_data.get('id')}: {e}")

            logger.info(f"Loaded {len(self._connections)} KM connections")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse connections file: {e}")
            self._connections = {}
        except Exception as e:
            logger.error(f"Failed to load connections: {e}")
            self._connections = {}

    def _save_connections(self):
        """Save connections to JSON file"""
        try:
            data = {
                'connections': [
                    {
                        'id': conn.id,
                        'name': conn.name,
                        'username': conn.username,
                        'api_key_encrypted': conn.api_key_encrypted,
                        'status': conn.status.value,
                        'collections': [c.model_dump() for c in conn.collections],
                        'corpuses': [c.model_dump() for c in conn.corpuses],
                        'selected_collection_names': conn.selected_collection_names,
                        'selected_corpus_ids': conn.selected_corpus_ids,
                        'created_at': conn.created_at,
                        'updated_at': conn.updated_at,
                        'last_sync_at': conn.last_sync_at,
                        'last_error': conn.last_error
                    }
                    for conn in self._connections.values()
                ]
            }

            with open(self.storage_file, 'w') as f:
                json.dump(data, f, indent=2)

            logger.debug(f"Saved {len(self._connections)} connections")

        except Exception as e:
            logger.error(f"Failed to save connections: {e}")
            raise RuntimeError(f"Failed to save connections: {str(e)}")

    def create_connection(
        self,
        create_data: KMConnectionCreate,
        api_key: str
    ) -> KMConnection:
        """
        Create a new KM connection

        Args:
            create_data: Connection creation data
            api_key: API key obtained from KM server login

        Returns:
            Created KMConnection
        """
        conn_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        conn = KMConnection(
            id=conn_id,
            name=create_data.name,
            username=create_data.username,
            api_key_encrypted=self._encrypt_api_key(api_key),
            status=KMConnectionStatus.ACTIVE,
            collections=[],
            corpuses=[],
            selected_collection_names=[],
            selected_corpus_ids=[],
            created_at=now,
            updated_at=now
        )

        self._connections[conn_id] = conn
        self._save_connections()

        logger.info(f"Created KM connection '{create_data.name}' (id: {conn_id})")
        return conn

    def get_connection(self, connection_id: str) -> Optional[KMConnection]:
        """Get a connection by ID"""
        return self._connections.get(connection_id)

    def get_connection_api_key(self, connection_id: str) -> Optional[str]:
        """Get decrypted API key for a connection"""
        conn = self._connections.get(connection_id)
        if not conn:
            return None
        try:
            return self._decrypt_api_key(conn.api_key_encrypted)
        except Exception as e:
            logger.error(f"Failed to decrypt API key for {connection_id}: {e}")
            return None

    def list_connections(self) -> List[KMConnection]:
        """List all connections"""
        return list(self._connections.values())

    def list_connections_public(self) -> List[KMConnectionPublic]:
        """List all connections (public view without API keys)"""
        return [
            KMConnectionPublic.from_connection(conn)
            for conn in self._connections.values()
        ]

    def update_connection(
        self,
        connection_id: str,
        update_data: KMConnectionUpdate
    ) -> Optional[KMConnection]:
        """
        Update a connection

        Args:
            connection_id: Connection ID
            update_data: Fields to update

        Returns:
            Updated connection, or None if not found
        """
        conn = self._connections.get(connection_id)
        if not conn:
            return None

        if update_data.name is not None:
            conn.name = update_data.name

        if update_data.selected_collection_names is not None:
            conn.selected_collection_names = update_data.selected_collection_names

        if update_data.selected_corpus_ids is not None:
            conn.selected_corpus_ids = update_data.selected_corpus_ids

        if update_data.is_active is not None:
            conn.status = KMConnectionStatus.ACTIVE if update_data.is_active else KMConnectionStatus.INACTIVE

        conn.updated_at = datetime.utcnow().isoformat()

        self._save_connections()
        logger.info(f"Updated KM connection {connection_id}")
        return conn

    def update_selections(
        self,
        connection_id: str,
        selections: KMSelectionUpdate
    ) -> Optional[KMConnection]:
        """
        Update selected collections and corpuses for a connection

        Args:
            connection_id: Connection ID
            selections: New selections

        Returns:
            Updated connection, or None if not found
        """
        conn = self._connections.get(connection_id)
        if not conn:
            return None

        conn.selected_collection_names = selections.selected_collection_names
        conn.selected_corpus_ids = selections.selected_corpus_ids
        conn.updated_at = datetime.utcnow().isoformat()

        self._save_connections()
        logger.info(f"Updated selections for KM connection {connection_id}")
        return conn

    def update_connection_data(
        self,
        connection_id: str,
        collections: List[KMCollection],
        corpuses: List[KMCorpus]
    ) -> Optional[KMConnection]:
        """
        Update collections and corpuses for a connection (after sync)

        Args:
            connection_id: Connection ID
            collections: Available collections
            corpuses: Available corpuses

        Returns:
            Updated connection, or None if not found
        """
        conn = self._connections.get(connection_id)
        if not conn:
            return None

        conn.collections = collections
        conn.corpuses = corpuses
        conn.last_sync_at = datetime.utcnow().isoformat()
        conn.updated_at = datetime.utcnow().isoformat()
        conn.last_error = None
        conn.status = KMConnectionStatus.ACTIVE

        self._save_connections()
        logger.info(f"Synced data for KM connection {connection_id}: {len(collections)} collections, {len(corpuses)} corpuses")
        return conn

    def update_status(
        self,
        connection_id: str,
        status: KMConnectionStatus,
        error: Optional[str] = None
    ) -> Optional[KMConnection]:
        """
        Update connection status

        Args:
            connection_id: Connection ID
            status: New status
            error: Optional error message

        Returns:
            Updated connection, or None if not found
        """
        conn = self._connections.get(connection_id)
        if not conn:
            return None

        conn.status = status
        conn.last_error = error
        conn.updated_at = datetime.utcnow().isoformat()

        self._save_connections()
        logger.info(f"Updated status for KM connection {connection_id}: {status.value}")
        return conn

    def delete_connection(self, connection_id: str) -> bool:
        """
        Delete a connection

        Args:
            connection_id: Connection ID

        Returns:
            True if deleted, False if not found
        """
        if connection_id not in self._connections:
            return False

        conn = self._connections.pop(connection_id)
        self._save_connections()

        logger.info(f"Deleted KM connection '{conn.name}' (id: {connection_id})")
        return True

    def get_active_connections(self) -> List[KMConnection]:
        """Get all active connections"""
        return [
            conn for conn in self._connections.values()
            if conn.status == KMConnectionStatus.ACTIVE
        ]

    def get_active_connections_with_selections(self) -> List[KMConnection]:
        """Get active connections that have at least one collection or corpus selected"""
        return [
            conn for conn in self._connections.values()
            if conn.status == KMConnectionStatus.ACTIVE
            and (conn.selected_collection_names or conn.selected_corpus_ids)
        ]
