"""
KM Connector Tool - Knowledge Management server integration

Provides semantic search against a Knowledge Management server
to retrieve relevant context for agent queries.
"""
import os
import logging
import asyncio
import requests
from typing import List, Dict, Optional, Any
from datetime import datetime

from backend.models.km_models import (
    KMConnection,
    KMConnectionStatus,
    KMCollection,
    KMCorpus,
    KMQueryResult,
    KMSearchResult
)

logger = logging.getLogger(__name__)


class KMServerClient:
    """
    Client for interacting with a Knowledge Management server

    Handles authentication and API calls to the KM server.
    """

    def __init__(self, base_url: str, api_key: str, timeout: int = 30):
        """
        Initialize KM server client

        Args:
            base_url: KM server base URL
            api_key: API key for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }

    def is_configured(self) -> bool:
        """Check if client is properly configured"""
        return bool(self.base_url and self.api_key)

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        json_data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make HTTP request to KM server

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            json_data: JSON body data
            params: Query parameters

        Returns:
            Response JSON data

        Raises:
            KMServerError: If request fails
        """
        url = f"{self.base_url}{endpoint}"

        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    json=json_data,
                    params=params,
                    timeout=self.timeout
                )
            )

            if response.status_code == 401:
                raise KMAuthenticationError("Invalid or expired API key")
            elif response.status_code == 403:
                raise KMAuthenticationError("Insufficient permissions")
            elif response.status_code == 429:
                raise KMRateLimitError("Rate limit exceeded")
            elif response.status_code >= 400:
                detail = response.json().get('detail', response.text) if response.text else 'Unknown error'
                raise KMServerError(f"Server error ({response.status_code}): {detail}")

            return response.json()

        except requests.exceptions.Timeout:
            raise KMTimeoutError(f"Request to {endpoint} timed out")
        except requests.exceptions.ConnectionError:
            raise KMConnectionError(f"Could not connect to KM server at {self.base_url}")
        except requests.exceptions.RequestException as e:
            raise KMServerError(f"Request failed: {str(e)}")

    async def login(self, username: str, password: str) -> Dict[str, Any]:
        """
        Login to KM server and get API key

        Args:
            username: KM server username
            password: KM server password

        Returns:
            Dict with api_key, expires_at, message
        """
        # Don't use self.headers for login - no API key yet
        url = f"{self.base_url}/api/v1/user/login"

        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(
                    url=url,
                    json={"username": username, "password": password},
                    headers={'Content-Type': 'application/json'},
                    timeout=self.timeout
                )
            )

            if response.status_code == 401:
                raise KMAuthenticationError("Invalid username or password")
            elif response.status_code >= 400:
                detail = response.json().get('detail', response.text) if response.text else 'Unknown error'
                raise KMServerError(f"Login failed ({response.status_code}): {detail}")

            return response.json()

        except requests.exceptions.Timeout:
            raise KMTimeoutError("Login request timed out")
        except requests.exceptions.ConnectionError:
            raise KMConnectionError(f"Could not connect to KM server at {self.base_url}")

    async def query(
        self,
        query: str,
        collection_names: Optional[List[str]] = None,
        n_results: int = 5
    ) -> Dict[str, Any]:
        """
        Query the KM server using POST /api/v1/query/

        Args:
            query: Search query string
            collection_names: List of collection names to search (None = all)
            n_results: Maximum number of results

        Returns:
            Dict with context and raw_results
        """
        data = {
            "query": query,
            "n_results": min(n_results, 20)
        }

        if collection_names:
            if len(collection_names) == 1:
                data["collection"] = collection_names[0]
            else:
                data["collections"] = collection_names

        logger.info(f"[KM DEBUG] === KM SERVER API REQUEST ===")
        logger.info(f"[KM DEBUG] URL: {self.base_url}/api/v1/query/")
        logger.info(f"[KM DEBUG] Method: POST")
        logger.info(f"[KM DEBUG] Request Body: {data}")

        response = await self._make_request("POST", "/api/v1/query/", json_data=data)

        logger.info(f"[KM DEBUG] === KM SERVER API RESPONSE ===")
        logger.info(f"[KM DEBUG] Response keys: {response.keys() if response else 'None'}")
        logger.info(f"[KM DEBUG] Full response: {response}")
        logger.info(f"[KM DEBUG] === END KM SERVER API RESPONSE ===")

        return response

    async def query_corpus(
        self,
        corpus_id: int,
        query: str,
        n_results: int = 5
    ) -> Dict[str, Any]:
        """
        Query a specific corpus

        Args:
            corpus_id: Corpus ID
            query: Search query string
            n_results: Maximum number of results

        Returns:
            Dict with context and raw_results
        """
        data = {
            "query": query,
            "n_results": min(n_results, 20)
        }

        return await self._make_request(
            "POST",
            f"/api/v1/corpus/{corpus_id}/query",
            json_data=data
        )

    async def list_indexes(self) -> List[Dict[str, Any]]:
        """
        Get available collections

        Returns:
            List of collection dicts with name, files, num_chunks
        """
        response = await self._make_request("GET", "/api/v1/list-indexes/")
        return response.get("collections", [])

    async def list_corpuses(self, approved_only: bool = True) -> List[Dict[str, Any]]:
        """
        Get available corpuses

        Args:
            approved_only: Only return approved corpuses

        Returns:
            List of corpus dicts
        """
        params = {"approved_only": str(approved_only).lower()}
        response = await self._make_request("GET", "/api/v1/corpus/", params=params)
        return response.get("corpuses", [])

    async def test_connection(self) -> Dict[str, Any]:
        """
        Test if connection is working

        Returns:
            Dict with success status and available collections/corpuses
        """
        try:
            collections = await self.list_indexes()
            corpuses = await self.list_corpuses()

            return {
                "success": True,
                "message": "Connection successful",
                "collections_count": len(collections),
                "corpuses_count": len(corpuses)
            }
        except Exception as e:
            return {
                "success": False,
                "message": str(e),
                "collections_count": 0,
                "corpuses_count": 0
            }


class KMConnectorTool:
    """
    Main KM connector tool - manages KM server connections and queries

    Orchestrates queries across multiple KM connections and formats
    results for agent consumption.
    """

    def __init__(self, connection_storage: "KMConnectionStorage", base_url: str):
        """
        Initialize KM connector tool

        Args:
            connection_storage: Storage service for KM connections
            base_url: KM server base URL (from config)
        """
        self.connection_storage = connection_storage
        self.base_url = base_url
        self._clients: Dict[str, KMServerClient] = {}

        logger.info(f"KMConnectorTool initialized (server: {base_url})")

    def is_configured(self) -> bool:
        """Check if any active KM connections exist with selections"""
        connections = self.connection_storage.get_active_connections_with_selections()
        return len(connections) > 0

    def has_connections(self) -> bool:
        """Check if any KM connections exist (active or not)"""
        connections = self.connection_storage.list_connections()
        return len(connections) > 0

    def _get_client(self, connection_id: str) -> Optional[KMServerClient]:
        """
        Get or create client for a connection

        Args:
            connection_id: Connection ID

        Returns:
            KMServerClient or None if connection not found
        """
        # Return cached client if exists
        if connection_id in self._clients:
            return self._clients[connection_id]

        # Get connection and API key
        api_key = self.connection_storage.get_connection_api_key(connection_id)
        if not api_key:
            logger.error(f"Could not get API key for connection {connection_id}")
            return None

        # Create and cache client
        client = KMServerClient(self.base_url, api_key)
        self._clients[connection_id] = client
        return client

    def _clear_client_cache(self, connection_id: str):
        """Clear cached client for a connection"""
        if connection_id in self._clients:
            del self._clients[connection_id]

    async def search_and_store(
        self,
        conversation_id: str,
        user_query: str,
        connection_ids: Optional[List[str]] = None,
        n_results: int = 5
    ) -> Dict[str, Any]:
        """
        Main method: query KM servers and aggregate results

        Args:
            conversation_id: Conversation identifier
            user_query: User's search query
            connection_ids: Specific connection IDs to use (None = all active with selections)
            n_results: Number of results per query

        Returns:
            Dict with aggregated results and metadata
        """
        logger.info(f"[KM DEBUG] search_and_store called:")
        logger.info(f"[KM DEBUG]   - conversation_id: {conversation_id}")
        logger.info(f"[KM DEBUG]   - connection_ids param: {connection_ids}")
        logger.info(f"[KM DEBUG]   - n_results: {n_results}")

        # Get connections to query
        if connection_ids:
            connections = [
                self.connection_storage.get_connection(cid)
                for cid in connection_ids
            ]
            logger.info(f"[KM DEBUG]   - Found {len([c for c in connections if c])} connections from provided IDs")
            for c in connections:
                if c:
                    logger.info(f"[KM DEBUG]   - Connection '{c.name}' (id={c.id}): status={c.status}, collections={c.selected_collection_names}, corpuses={c.selected_corpus_ids}")
            connections = [c for c in connections if c and c.status == KMConnectionStatus.ACTIVE]
            logger.info(f"[KM DEBUG]   - After ACTIVE filter: {len(connections)} connections")
        else:
            connections = self.connection_storage.get_active_connections_with_selections()
            logger.info(f"[KM DEBUG]   - Using all active connections with selections: {len(connections)}")

        if not connections:
            return {
                'success': False,
                'message': 'No active KM connections with selections found',
                'results': [],
                'results_count': 0
            }

        all_results: List[KMSearchResult] = []
        errors: List[Dict[str, Any]] = []

        for conn in connections:
            try:
                result = await self._query_connection(conn, user_query, n_results)
                all_results.append(result)
            except KMAuthenticationError as e:
                errors.append({
                    "connection_id": conn.id,
                    "connection_name": conn.name,
                    "error_type": "authentication",
                    "message": str(e)
                })
                # Mark connection as error
                self.connection_storage.update_status(
                    conn.id, KMConnectionStatus.ERROR, str(e)
                )
                self._clear_client_cache(conn.id)
            except KMTimeoutError as e:
                errors.append({
                    "connection_id": conn.id,
                    "connection_name": conn.name,
                    "error_type": "timeout",
                    "message": str(e)
                })
            except Exception as e:
                errors.append({
                    "connection_id": conn.id,
                    "connection_name": conn.name,
                    "error_type": "unknown",
                    "message": str(e)
                })
                logger.error(f"Error querying KM connection {conn.id}: {e}", exc_info=True)

        # Aggregate results
        total_results = sum(r.results_count for r in all_results)

        return {
            'success': len(all_results) > 0,
            'message': f'Retrieved {total_results} results from {len(all_results)} connection(s)',
            'results': [r.model_dump() for r in all_results],
            'results_count': total_results,
            'connections_queried': len(connections),
            'connections_successful': len(all_results),
            'errors': errors,
            'partial_failure': len(errors) > 0 and len(all_results) > 0
        }

    async def _query_connection(
        self,
        connection: KMConnection,
        query: str,
        n_results: int
    ) -> KMSearchResult:
        """
        Query a single KM connection

        Args:
            connection: KM connection
            query: Search query
            n_results: Number of results

        Returns:
            KMSearchResult with query results
        """
        logger.info(f"[KM DEBUG] _query_connection called for '{connection.name}':")
        logger.info(f"[KM DEBUG]   - selected_collection_names: {connection.selected_collection_names}")
        logger.info(f"[KM DEBUG]   - selected_corpus_ids: {connection.selected_corpus_ids}")

        client = self._get_client(connection.id)
        if not client:
            raise KMConnectionError(f"Could not create client for connection {connection.id}")

        all_query_results: List[KMQueryResult] = []

        # Check if connection has any selections
        if not connection.selected_collection_names and not connection.selected_corpus_ids:
            logger.warning(f"[KM DEBUG] Connection '{connection.name}' has NO selections - returning empty results")
            return KMSearchResult(
                success=True,
                message="No collections or corpuses selected",
                connection_id=connection.id,
                connection_name=connection.name,
                results_count=0,
                results=[],
                context=""
            )

        # Query collections
        if connection.selected_collection_names:
            try:
                response = await client.query(
                    query=query,
                    collection_names=connection.selected_collection_names,
                    n_results=n_results
                )

                # Log raw response structure
                logger.info(f"[KM DEBUG] Parsing KM response for collections query:")
                logger.info(f"[KM DEBUG]   - Response type: {type(response)}")
                logger.info(f"[KM DEBUG]   - Response keys: {response.keys() if isinstance(response, dict) else 'N/A'}")

                # Check for 'context' field directly in response (KM server may return this)
                if 'context' in response:
                    logger.info(f"[KM DEBUG]   - Found 'context' field in response: {len(response['context'])} chars")
                    logger.info(f"[KM DEBUG]   - Context preview: {response['context'][:500] if response['context'] else 'EMPTY'}...")

                # Parse results from raw_results
                raw_results = response.get('raw_results', {})
                logger.info(f"[KM DEBUG]   - raw_results keys: {raw_results.keys() if isinstance(raw_results, dict) else 'N/A'}")

                documents = raw_results.get('documents', [[]])[0] if raw_results.get('documents') else []
                metadatas = raw_results.get('metadatas', [[]])[0] if raw_results.get('metadatas') else []
                distances = raw_results.get('distances', [[]])[0] if raw_results.get('distances') else []

                logger.info(f"[KM DEBUG]   - Parsed documents count: {len(documents)}")
                logger.info(f"[KM DEBUG]   - Parsed metadatas count: {len(metadatas)}")
                logger.info(f"[KM DEBUG]   - Parsed distances count: {len(distances)}")

                for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances)):
                    logger.info(f"[KM DEBUG]   - Document {i}: len={len(doc) if doc else 0}, dist={dist}, meta={meta}")
                    all_query_results.append(KMQueryResult(
                        content=doc,
                        source=meta.get('source', 'Unknown'),
                        collection_name=meta.get('collection', connection.selected_collection_names[0] if connection.selected_collection_names else None),
                        relevance_score=max(0, 1 - dist) if dist else None,
                        metadata=meta
                    ))

            except Exception as e:
                logger.error(f"Error querying collections for {connection.id}: {e}", exc_info=True)
                raise

        # Query corpuses
        for corpus_id in connection.selected_corpus_ids:
            try:
                response = await client.query_corpus(
                    corpus_id=corpus_id,
                    query=query,
                    n_results=n_results
                )

                # Parse results
                raw_results = response.get('raw_results', {})
                documents = raw_results.get('documents', [[]])[0]
                metadatas = raw_results.get('metadatas', [[]])[0]
                distances = raw_results.get('distances', [[]])[0]

                for doc, meta, dist in zip(documents, metadatas, distances):
                    all_query_results.append(KMQueryResult(
                        content=doc,
                        source=meta.get('source', 'Unknown'),
                        corpus_id=corpus_id,
                        relevance_score=max(0, 1 - dist) if dist else None,
                        metadata=meta
                    ))

            except Exception as e:
                logger.error(f"Error querying corpus {corpus_id} for {connection.id}: {e}")
                # Continue with other corpuses

        # Sort by relevance
        all_query_results.sort(
            key=lambda x: x.relevance_score or 0,
            reverse=True
        )

        # Limit total results
        all_query_results = all_query_results[:n_results * 2]

        logger.info(f"[KM DEBUG] Building context from {len(all_query_results)} query results")

        # Format context
        context = self.get_km_context(all_query_results)

        logger.info(f"[KM DEBUG] === FINAL KMSearchResult ===")
        logger.info(f"[KM DEBUG]   - results_count: {len(all_query_results)}")
        logger.info(f"[KM DEBUG]   - context length: {len(context) if context else 0}")
        logger.info(f"[KM DEBUG]   - context preview: {context[:500] if context else 'EMPTY'}...")
        logger.info(f"[KM DEBUG] === END FINAL KMSearchResult ===")

        return KMSearchResult(
            success=True,
            message=f"Retrieved {len(all_query_results)} results",
            connection_id=connection.id,
            connection_name=connection.name,
            results_count=len(all_query_results),
            results=all_query_results,
            context=context
        )

    def get_km_context(
        self,
        results: List[KMQueryResult],
        max_length: int = 4000
    ) -> str:
        """
        Format KM results as context for agent consumption

        Args:
            results: List of query results
            max_length: Maximum character length

        Returns:
            Formatted text with relevant KM results
        """
        logger.info(f"[KM DEBUG] get_km_context called with {len(results)} results")
        if not results:
            logger.info(f"[KM DEBUG] get_km_context: No results to format")
            return ""

        parts = ["=== Knowledge Base Results ==="]

        for i, result in enumerate(results, 1):
            relevance = result.relevance_score
            logger.info(f"[KM DEBUG] get_km_context: Result {i} - relevance={relevance}, content_len={len(result.content) if result.content else 0}")

            # Include all results - the KM server already ranked them
            # Only skip if explicitly marked as irrelevant (negative score)
            if relevance is not None and relevance < 0:
                logger.info(f"[KM DEBUG] get_km_context: Skipping result {i} due to negative relevance")
                continue

            part = f"\n[Result {i}]"
            part += f"\nSource: {result.source}"

            if result.collection_name:
                part += f" (Collection: {result.collection_name})"
            elif result.corpus_id:
                part += f" (Corpus ID: {result.corpus_id})"

            content = result.content
            if content:
                if len(content) > 500:
                    content = content[:500] + "..."
                part += f"\nContent: {content}"

            if relevance is not None:
                part += f"\nRelevance: {relevance:.2f}"
            part += "\n" + "-" * 50

            # Check length limit
            if len('\n'.join(parts)) + len(part) > max_length:
                logger.info(f"[KM DEBUG] get_km_context: Stopping at result {i} due to length limit")
                break

            parts.append(part)
            logger.info(f"[KM DEBUG] get_km_context: Added result {i}")

        if len(parts) == 1:  # Only header
            logger.info(f"[KM DEBUG] get_km_context: No results passed filter, returning empty")
            return ""

        parts.append("=== End Knowledge Base Results ===")
        final_context = '\n'.join(parts)
        logger.info(f"[KM DEBUG] get_km_context: Final context length: {len(final_context)} chars")
        return final_context

    def clear_conversation(self, conversation_id: str) -> bool:
        """
        Clear any cached data for a conversation

        Note: KM connector doesn't store per-conversation data,
        so this is a no-op but kept for interface consistency.
        """
        return True

    async def test_connection(self, connection_id: str) -> Dict[str, Any]:
        """
        Test a specific KM connection

        Args:
            connection_id: Connection ID to test

        Returns:
            Dict with test results
        """
        client = self._get_client(connection_id)
        if not client:
            return {
                "success": False,
                "message": "Connection not found or API key unavailable"
            }

        return await client.test_connection()


# Custom exceptions for KM operations
class KMError(Exception):
    """Base exception for KM errors"""
    pass


class KMConnectionError(KMError):
    """Could not connect to KM server"""
    pass


class KMAuthenticationError(KMError):
    """Authentication failed"""
    pass


class KMServerError(KMError):
    """KM server returned an error"""
    pass


class KMTimeoutError(KMError):
    """Request timed out"""
    pass


class KMRateLimitError(KMError):
    """Rate limit exceeded"""
    pass
