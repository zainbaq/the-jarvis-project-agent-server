"""
Web Search Tool - Agent-agnostic web search using Serper API

This tool provides:
- Web search via Serper API
- Result storage in ChromaDB vector store
- Semantic search over stored results
- Query extraction from user messages
"""
import os
import uuid
import logging
import asyncio
import re
import requests
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path

# ChromaDB for vector storage
try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    logging.warning("ChromaDB not available. Install with: pip install chromadb")

logger = logging.getLogger(__name__)


class SerperService:
    """Service for interacting with Serper API for web search"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Serper service
        
        Args:
            api_key: Serper API key (defaults to env variable)
        """
        self.api_key = api_key or os.getenv("SERPER_API_KEY")
        self.base_url = "https://google.serper.dev/search"
        
        if not self.api_key:
            logger.warning("SERPER_API_KEY not found. Web search will not work.")
    
    def is_configured(self) -> bool:
        """Check if service is properly configured"""
        return bool(self.api_key)
    
    async def search(self, query: str, num_results: int = 3) -> List[Dict]:
        """
        Perform a web search using Serper API
        
        Args:
            query: Search query string
            num_results: Number of results to return (max 10)
            
        Returns:
            List of search results with title, link, snippet, source
        """
        if not self.is_configured():
            logger.error("Serper API key not configured")
            return []
        
        # Limit results to prevent excessive API usage
        num_results = min(max(1, num_results), 10)
        
        headers = {
            'X-API-KEY': self.api_key,
            'Content-Type': 'application/json'
        }
        
        payload = {
            'q': query.strip(),
            'num': num_results,
            'gl': 'us',  # Country
            'hl': 'en'   # Language
        }
        
        try:
            # Use requests.post in executor for async compatibility
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(
                    self.base_url,
                    headers=headers,
                    json=payload,
                    timeout=10
                )
            )
            response.raise_for_status()
            
            data = response.json()
            results = []
            
            # Extract organic results
            for result in data.get('organic', [])[:num_results]:
                results.append({
                    'title': result.get('title', '').strip(),
                    'link': result.get('link', '').strip(),
                    'snippet': result.get('snippet', '').strip(),
                    'source': result.get('displayLink', '').strip()
                })
            
            logger.info(f"Serper: Retrieved {len(results)} results for query: '{query[:50]}...'")
            return results
            
        except requests.exceptions.Timeout:
            logger.error("Serper API request timed out")
            return []
        except requests.exceptions.RequestException as e:
            logger.error(f"Serper API error: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in Serper search: {str(e)}")
            return []


class VectorStoreService:
    """Service for managing conversation-specific vector stores for web search results"""
    
    def __init__(self, storage_dir: str = "vector_stores"):
        """
        Initialize vector store service
        
        Args:
            storage_dir: Directory for persistent storage
        """
        if not CHROMADB_AVAILABLE:
            logger.error("ChromaDB not available. Vector storage disabled.")
            self.client = None
            return
        
        # Create vector store directory
        self.vector_store_dir = Path(storage_dir)
        self.vector_store_dir.mkdir(exist_ok=True)
        
        try:
            # Initialize ChromaDB client
            self.client = chromadb.PersistentClient(
                path=str(self.vector_store_dir),
                settings=ChromaSettings(
                    allow_reset=True,
                    anonymized_telemetry=False
                )
            )
            logger.info(f"ChromaDB initialized at {self.vector_store_dir}")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            self.client = None
        
        # Track collections per conversation
        self._collections = {}
    
    def is_available(self) -> bool:
        """Check if vector store is available"""
        return self.client is not None
    
    def _get_collection_name(self, conversation_id: str) -> str:
        """
        Generate valid collection name for conversation
        
        ChromaDB requires alphanumeric + underscores only
        """
        clean_id = re.sub(r'[^a-zA-Z0-9_]', '_', conversation_id)
        return f"search_{clean_id}"
    
    def _get_or_create_collection(self, conversation_id: str):
        """Get or create vector collection for conversation"""
        if not self.is_available():
            return None
        
        collection_name = self._get_collection_name(conversation_id)
        
        # Return cached collection
        if collection_name in self._collections:
            return self._collections[collection_name]
        
        try:
            # Try to get existing collection
            collection = self.client.get_collection(name=collection_name)
            logger.debug(f"Retrieved existing collection: {collection_name}")
        except Exception:
            # Create new collection if it doesn't exist
            try:
                collection = self.client.create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine"}
                )
                logger.info(f"Created new collection: {collection_name}")
            except Exception as e:
                logger.error(f"Failed to create collection {collection_name}: {e}")
                return None
        
        self._collections[collection_name] = collection
        return collection
    
    def add_search_results(
        self,
        conversation_id: str,
        search_results: List[Dict],
        search_queries: List[str]
    ) -> bool:
        """
        Add search results to conversation's vector store
        
        Args:
            conversation_id: Conversation identifier
            search_results: List of search result dicts
            search_queries: List of queries that generated these results
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            logger.warning("Vector store not available, skipping result storage")
            return False
        
        collection = self._get_or_create_collection(conversation_id)
        if not collection:
            return False
        
        documents = []
        metadatas = []
        ids = []
        
        for i, result in enumerate(search_results):
            # Skip empty results
            if not result.get('title') and not result.get('snippet'):
                continue
            
            # Create document text from title and snippet
            doc_parts = []
            if result.get('title'):
                doc_parts.append(f"Title: {result['title']}")
            if result.get('snippet'):
                doc_parts.append(f"Content: {result['snippet']}")
            
            doc_text = '\n'.join(doc_parts)
            
            # Determine which query this result came from
            query_index = i // 3  # Assuming 3 results per query
            query = search_queries[query_index] if query_index < len(search_queries) else "unknown"
            
            documents.append(doc_text)
            metadatas.append({
                'title': result.get('title', '')[:500],  # Truncate long titles
                'link': result.get('link', ''),
                'source': result.get('source', ''),
                'query': query,
                'result_index': i,
                'timestamp': datetime.utcnow().isoformat()
            })
            ids.append(f"search_{conversation_id}_{uuid.uuid4().hex[:8]}")
        
        if not documents:
            logger.warning("No valid documents to add to vector store")
            return False
        
        try:
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"Added {len(documents)} search results to vector store")
            return True
        except Exception as e:
            logger.error(f"Error adding search results to vector store: {e}")
            return False
    
    def search_results(
        self,
        conversation_id: str,
        query: str,
        n_results: int = 5
    ) -> List[Dict]:
        """
        Search stored results for conversation using semantic similarity
        
        Args:
            conversation_id: Conversation identifier
            query: Search query
            n_results: Number of results to return
            
        Returns:
            List of relevant search results with relevance scores
        """
        if not self.is_available():
            return []
        
        try:
            collection = self._get_or_create_collection(conversation_id)
            if not collection:
                return []
            
            # Check if collection has any documents
            if collection.count() == 0:
                return []
            
            results = collection.query(
                query_texts=[query],
                n_results=min(n_results, collection.count()),
                include=['documents', 'metadatas', 'distances']
            )
            
            if not results['documents'] or not results['documents'][0]:
                return []
            
            # Format results
            formatted_results = []
            for doc, metadata, distance in zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            ):
                formatted_results.append({
                    'content': doc,
                    'title': metadata.get('title', ''),
                    'link': metadata.get('link', ''),
                    'source': metadata.get('source', ''),
                    'query': metadata.get('query', ''),
                    'relevance_score': max(0, 1 - distance),  # Convert distance to similarity
                    'timestamp': metadata.get('timestamp', '')
                })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching vector store: {e}")
            return []
    
    def clear_conversation(self, conversation_id: str) -> bool:
        """Clear all search results for a conversation"""
        if not self.is_available():
            return True
        
        collection_name = self._get_collection_name(conversation_id)
        
        try:
            self.client.delete_collection(name=collection_name)
            if collection_name in self._collections:
                del self._collections[collection_name]
            logger.info(f"Cleared search results for conversation {conversation_id}")
            return True
        except Exception as e:
            logger.error(f"Error clearing search results: {e}")
            return False
    
    def get_stats(self, conversation_id: str) -> Dict:
        """Get statistics about conversation's stored results"""
        if not self.is_available():
            return {"available": False, "count": 0}
        
        try:
            collection = self._get_or_create_collection(conversation_id)
            if not collection:
                return {"available": False, "count": 0}
            
            return {
                "available": True,
                "count": collection.count(),
                "collection_name": self._get_collection_name(conversation_id)
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {"available": False, "count": 0, "error": str(e)}


class QueryExtractor:
    """Extracts search queries from user messages"""
    
    @staticmethod
    def extract_queries(user_query: str, max_queries: int = 3) -> List[str]:
        """
        Extract relevant search queries from user's message
        
        Args:
            user_query: User's message
            max_queries: Maximum number of queries to generate
            
        Returns:
            List of search query strings
        """
        # Clean input
        cleaned = re.sub(r'[^\w\s\-]', '', user_query.strip())
        cleaned = ' '.join(cleaned.split())
        
        if not cleaned:
            return ["search query"]
        
        queries = []
        
        # Main query (first 12 words)
        main_query = ' '.join(cleaned.split()[:12])
        if main_query:
            queries.append(main_query)
        
        # Extract key terms (words longer than 3 chars)
        words = cleaned.lower().split()
        key_terms = [w for w in words if len(w) > 3 and w.isalpha()]
        
        # Second query: key terms + "latest 2024"
        if key_terms and len(key_terms) >= 2:
            second_query = ' '.join(key_terms[:6]) + " latest 2024"
            if second_query != main_query:
                queries.append(second_query)
        
        # Third query: add context based on query type
        if len(queries) > 0:
            base = queries[0].split()[:4]
            question_words = ["what", "how", "why", "when", "where", "which"]
            
            if any(w in cleaned.lower() for w in question_words):
                third_query = ' '.join(base) + " guide tutorial"
            else:
                third_query = ' '.join(base) + " examples"
            
            if third_query not in queries and len(queries) < max_queries:
                queries.append(third_query)
        
        # Ensure we have exactly max_queries
        while len(queries) < max_queries:
            if queries:
                queries.append(f"{queries[0]} overview")
            else:
                queries.append(cleaned or "search")
        
        return queries[:max_queries]


class WebSearchTool:
    """
    Main web search tool - agent-agnostic
    
    Orchestrates query extraction, web search, and vector storage
    """
    
    def __init__(self, api_key: Optional[str] = None, storage_dir: str = "vector_stores"):
        """
        Initialize web search tool
        
        Args:
            api_key: Serper API key (optional, defaults to env)
            storage_dir: Directory for vector store persistence
        """
        self.serper = SerperService(api_key=api_key)
        self.vector_store = VectorStoreService(storage_dir=storage_dir)
        self.query_extractor = QueryExtractor()
        
        logger.info("WebSearchTool initialized")
        self._log_configuration()
    
    def _log_configuration(self):
        """Log configuration status"""
        if not self.is_configured():
            logger.warning("Web search not fully configured:")
            if not self.serper.is_configured():
                logger.warning("  - Serper API key missing")
            if not self.vector_store.is_available():
                logger.warning("  - Vector store not available")
    
    def is_configured(self) -> bool:
        """Check if tool is ready to use"""
        return self.serper.is_configured()
    
    def is_vector_store_available(self) -> bool:
        """Check if vector store is available"""
        return self.vector_store.is_available()
    
    async def search_and_store(
        self,
        conversation_id: str,
        user_query: str,
        num_queries: int = 3,
        results_per_query: int = 3
    ) -> Dict:
        """
        Main method: extract queries, search web, store in vector store
        
        Args:
            conversation_id: Unique conversation identifier
            user_query: User's original query
            num_queries: Number of search queries to generate
            results_per_query: Results per query
            
        Returns:
            Dict with search results summary and metadata
        """
        if not self.is_configured():
            return {
                'success': False,
                'message': 'Web search not configured (missing SERPER_API_KEY)',
                'queries': [],
                'results_count': 0
            }
        
        try:
            # Extract search queries
            search_queries = self.query_extractor.extract_queries(
                user_query,
                max_queries=num_queries
            )
            logger.info(f"Extracted queries: {search_queries}")
            
            # Perform searches
            all_results = []
            successful_queries = []
            
            for query in search_queries:
                try:
                    results = await self.serper.search(query, num_results=results_per_query)
                    if results:
                        all_results.extend(results)
                        successful_queries.append(query)
                    
                    # Small delay between requests
                    await asyncio.sleep(0.2)
                    
                except Exception as e:
                    logger.error(f"Error searching '{query}': {e}")
                    continue
            
            if not all_results:
                return {
                    'success': False,
                    'message': 'No search results found',
                    'queries': search_queries,
                    'successful_queries': successful_queries,
                    'results_count': 0
                }
            
            # Store in vector store
            vector_stored = False
            if self.is_vector_store_available():
                vector_stored = self.vector_store.add_search_results(
                    conversation_id=conversation_id,
                    search_results=all_results,
                    search_queries=successful_queries
                )
            
            return {
                'success': True,
                'message': f'Found {len(all_results)} search results',
                'queries': search_queries,
                'successful_queries': successful_queries,
                'results_count': len(all_results),
                'vector_stored': vector_stored,
                'sample_results': [
                    {
                        'title': r.get('title', 'No title')[:80],
                        'source': r.get('source', 'Unknown'),
                        'link': r.get('link', '')
                    }
                    for r in all_results[:5]
                ]
            }
            
        except Exception as e:
            logger.error(f"Error in search_and_store: {e}", exc_info=True)
            return {
                'success': False,
                'message': f'Search failed: {str(e)}',
                'queries': [],
                'results_count': 0
            }
    
    def get_search_context(
        self,
        conversation_id: str,
        query: str,
        max_results: int = 5,
        max_length: int = 2000
    ) -> str:
        """
        Get formatted search context for agent consumption
        
        Args:
            conversation_id: Conversation identifier
            query: Query to search for
            max_results: Maximum number of results
            max_length: Maximum character length
            
        Returns:
            Formatted text with relevant search results
        """
        if not self.is_vector_store_available():
            return ""
        
        results = self.vector_store.search_results(
            conversation_id, query, max_results
        )
        
        if not results:
            return ""
        
        # Format results
        parts = ["=== Relevant Web Search Results ==="]
        
        for i, result in enumerate(results, 1):
            relevance = result.get('relevance_score', 0)
            
            # Skip low relevance
            if relevance < 0.1:
                continue
            
            part = f"\n[Result {i}] {result.get('title', 'No title')}"
            part += f"\nSource: {result.get('source', 'Unknown')}"
            
            content = result.get('content', '')
            if content:
                # Clean content
                content = content.replace('Title: ', '').replace('Content: ', '').strip()
                if len(content) > 200:
                    content = content[:200] + "..."
                part += f"\nContent: {content}"
            
            if result.get('link'):
                part += f"\nURL: {result['link']}"
            
            part += f"\nRelevance: {relevance:.2f}\n" + "-" * 50
            
            # Check length limit
            if len('\n'.join(parts)) + len(part) > max_length:
                break
            
            parts.append(part)
        
        if len(parts) == 1:  # Only header
            return ""
        
        parts.append("=== End Search Results ===")
        return '\n'.join(parts)
    
    def get_stats(self, conversation_id: str) -> Dict:
        """Get statistics about stored search results"""
        return self.vector_store.get_stats(conversation_id)
    
    def clear_conversation(self, conversation_id: str) -> bool:
        """Clear all search data for a conversation"""
        return self.vector_store.clear_conversation(conversation_id)
    
    async def test_connection(self) -> Dict:
        """Test the web search tool"""
        return {
            "serper_configured": self.serper.is_configured(),
            "vector_store_available": self.vector_store.is_available(),
            "overall_ready": self.is_configured()
        }