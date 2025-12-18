"""
File Search Tool - Custom file search using ChromaDB for endpoint agents

Provides semantic search over uploaded files using vector embeddings.
Similar architecture to WebSearchTool but for file content.
"""
import logging
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
import chromadb
from chromadb.config import Settings as ChromaSettings

logger = logging.getLogger(__name__)


class FileParserService:
    """Service for parsing different file types into text"""

    @staticmethod
    def parse_text_file(file_path: str) -> str:
        """Parse plain text files (txt, md, code, etc.)"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to parse text file {file_path}: {e}")
            return ""

    @staticmethod
    def parse_pdf(file_path: str) -> str:
        """Parse PDF files"""
        try:
            import PyPDF2
            text = []
            with open(file_path, 'rb') as f:
                pdf_reader = PyPDF2.PdfReader(f)
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text.append(page_text)
            return "\n\n".join(text)
        except ImportError:
            logger.warning("PyPDF2 not installed. Install with: pip install PyPDF2")
            return f"[PDF file: {Path(file_path).name} - PyPDF2 required for parsing]"
        except Exception as e:
            logger.error(f"Failed to parse PDF {file_path}: {e}")
            return f"[PDF parsing failed: {str(e)}]"

    @staticmethod
    def parse_docx(file_path: str) -> str:
        """Parse DOCX files"""
        try:
            import docx
            doc = docx.Document(file_path)
            paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
            return "\n\n".join(paragraphs)
        except ImportError:
            logger.warning("python-docx not installed. Install with: pip install python-docx")
            return f"[DOCX file: {Path(file_path).name} - python-docx required for parsing]"
        except Exception as e:
            logger.error(f"Failed to parse DOCX {file_path}: {e}")
            return f"[DOCX parsing failed: {str(e)}]"

    @staticmethod
    def parse_csv(file_path: str) -> str:
        """Parse CSV files"""
        try:
            import pandas as pd
            df = pd.read_csv(file_path)
            # Return a formatted representation
            return f"CSV Data ({len(df)} rows, {len(df.columns)} columns):\n\n{df.head(100).to_string()}"
        except ImportError:
            logger.warning("pandas not installed. Install with: pip install pandas")
            return f"[CSV file: {Path(file_path).name} - pandas required for parsing]"
        except Exception as e:
            logger.error(f"Failed to parse CSV {file_path}: {e}")
            return f"[CSV parsing failed: {str(e)}]"

    @staticmethod
    def parse_json(file_path: str) -> str:
        """Parse JSON files"""
        try:
            import json
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return json.dumps(data, indent=2)
        except Exception as e:
            logger.error(f"Failed to parse JSON {file_path}: {e}")
            return f"[JSON parsing failed: {str(e)}]"

    @staticmethod
    def parse_xml(file_path: str) -> str:
        """Parse XML files"""
        try:
            import xml.etree.ElementTree as ET
            tree = ET.parse(file_path)
            root = tree.getroot()
            return ET.tostring(root, encoding='unicode', method='xml')
        except Exception as e:
            logger.error(f"Failed to parse XML {file_path}: {e}")
            return f"[XML parsing failed: {str(e)}]"

    @classmethod
    def parse_file(cls, file_path: str, file_type: str) -> str:
        """
        Parse file based on type

        Args:
            file_path: Path to file
            file_type: File extension (without dot)

        Returns:
            Parsed text content
        """
        # Text-based files
        if file_type in ['txt', 'md', 'rtf']:
            return cls.parse_text_file(file_path)

        # Code files
        if file_type in ['py', 'js', 'ts', 'tsx', 'jsx', 'java', 'cpp', 'c',
                         'go', 'rs', 'rb', 'php', 'swift', 'kt', 'cs',
                         'html', 'css', 'scss', 'sql', 'sh', 'yaml', 'yml']:
            return cls.parse_text_file(file_path)

        # Document files
        if file_type == 'pdf':
            return cls.parse_pdf(file_path)
        if file_type == 'docx':
            return cls.parse_docx(file_path)

        # Data files
        if file_type == 'csv':
            return cls.parse_csv(file_path)
        if file_type == 'json':
            return cls.parse_json(file_path)
        if file_type == 'xml':
            return cls.parse_xml(file_path)

        # Images (not parseable to text)
        if file_type in ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']:
            return f"[Image file: {Path(file_path).name} - visual content not extractable]"

        # Unsupported
        return f"[File type .{file_type} not supported for text extraction]"


class FileVectorStoreService:
    """Service for managing file content in ChromaDB vector store"""

    def __init__(self, storage_dir: str = "backend/vector_stores/files"):
        """
        Initialize file vector store

        Args:
            storage_dir: Directory for ChromaDB persistent storage
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=str(self.storage_dir),
            settings=ChromaSettings(anonymized_telemetry=False)
        )

        logger.info(f"FileVectorStoreService initialized (storage: {self.storage_dir})")

    def _get_collection_name(self, conversation_id: str) -> str:
        """Get collection name for conversation"""
        return f"files_{conversation_id}"

    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """
        Chunk text into overlapping segments

        Args:
            text: Text to chunk
            chunk_size: Target chunk size in characters
            overlap: Overlap between chunks

        Returns:
            List of text chunks
        """
        if len(text) <= chunk_size:
            return [text]

        chunks = []
        start = 0

        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap

        return chunks

    def add_file_content(
        self,
        conversation_id: str,
        file_id: str,
        filename: str,
        file_type: str,
        content: str
    ) -> int:
        """
        Add file content to vector store

        Args:
            conversation_id: Conversation ID
            file_id: File ID
            filename: Original filename
            file_type: File extension
            content: Parsed file content

        Returns:
            Number of chunks added
        """
        collection_name = self._get_collection_name(conversation_id)

        try:
            # Get or create collection
            collection = self.client.get_or_create_collection(
                name=collection_name,
                metadata={"conversation_id": conversation_id}
            )

            # Chunk content
            chunks = self._chunk_text(content)

            # Prepare documents and metadata
            documents = []
            metadatas = []
            ids = []

            for i, chunk in enumerate(chunks):
                if not chunk.strip():
                    continue

                documents.append(chunk)
                metadatas.append({
                    "file_id": file_id,
                    "filename": filename,
                    "file_type": file_type,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                })
                ids.append(f"{file_id}_chunk_{i}")

            # Add to collection
            if documents:
                collection.add(
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )

            logger.info(f"Added {len(documents)} chunks from {filename} to vector store")
            return len(documents)

        except Exception as e:
            logger.error(f"Failed to add file content to vector store: {e}")
            raise

    def search_files(
        self,
        conversation_id: str,
        query: str,
        n_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search files using semantic search

        Args:
            conversation_id: Conversation ID
            query: Search query
            n_results: Number of results to return

        Returns:
            List of search results with content and metadata
        """
        collection_name = self._get_collection_name(conversation_id)

        try:
            collection = self.client.get_collection(name=collection_name)

            # Perform semantic search
            results = collection.query(
                query_texts=[query],
                n_results=n_results
            )

            # Format results
            formatted_results = []
            if results and results['documents'] and len(results['documents']) > 0:
                for i, doc in enumerate(results['documents'][0]):
                    metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                    distance = results['distances'][0][i] if results['distances'] else None

                    formatted_results.append({
                        "content": doc,
                        "filename": metadata.get("filename", "Unknown"),
                        "file_type": metadata.get("file_type", ""),
                        "chunk_index": metadata.get("chunk_index", 0),
                        "relevance_score": 1 - distance if distance is not None else 0
                    })

            return formatted_results

        except Exception as e:
            logger.warning(f"Search failed for conversation {conversation_id}: {e}")
            return []

    def clear_conversation(self, conversation_id: str):
        """Delete vector store collection for conversation"""
        collection_name = self._get_collection_name(conversation_id)

        try:
            self.client.delete_collection(name=collection_name)
            logger.info(f"Cleared file vector store for conversation {conversation_id}")
        except Exception as e:
            logger.warning(f"Failed to clear vector store: {e}")


class FileSearchTool:
    """
    File search tool for endpoint agents

    Provides semantic search over uploaded files using ChromaDB
    """

    def __init__(self, storage_dir: str = "backend/vector_stores/files"):
        """Initialize file search tool"""
        self.parser = FileParserService()
        self.vector_store = FileVectorStoreService(storage_dir)
        logger.info("FileSearchTool initialized")

    async def index_files(
        self,
        conversation_id: str,
        files: List[Any]  # List of FileMetadata objects
    ) -> Dict[str, Any]:
        """
        Index files for semantic search

        Args:
            conversation_id: Conversation ID
            files: List of FileMetadata objects

        Returns:
            Indexing results
        """
        total_chunks = 0
        indexed_files = 0

        for file_meta in files:
            try:
                # Parse file content
                content = self.parser.parse_file(file_meta.filepath, file_meta.file_type)

                if not content.strip():
                    logger.warning(f"No content extracted from {file_meta.filename}")
                    continue

                # Add to vector store
                chunks_added = self.vector_store.add_file_content(
                    conversation_id=conversation_id,
                    file_id=file_meta.file_id,
                    filename=file_meta.filename,
                    file_type=file_meta.file_type,
                    content=content
                )

                total_chunks += chunks_added
                indexed_files += 1

            except Exception as e:
                logger.error(f"Failed to index file {file_meta.filename}: {e}")

        return {
            "indexed_files": indexed_files,
            "total_chunks": total_chunks,
            "total_files": len(files)
        }

    def get_file_context(
        self,
        conversation_id: str,
        query: str,
        max_results: int = 5,
        max_length: int = 2000
    ) -> str:
        """
        Get formatted file search context for prompt injection

        Args:
            conversation_id: Conversation ID
            query: Search query
            max_results: Maximum number of results
            max_length: Maximum total length of context

        Returns:
            Formatted context string
        """
        # Search for relevant content
        results = self.vector_store.search_files(
            conversation_id=conversation_id,
            query=query,
            n_results=max_results
        )

        if not results:
            return ""

        # Format results
        context_parts = ["=== RELEVANT FILE CONTENT ===\n"]

        current_length = len(context_parts[0])

        for i, result in enumerate(results, 1):
            filename = result['filename']
            content = result['content']
            chunk_idx = result['chunk_index']
            score = result['relevance_score']

            # Format entry
            entry = f"\n[File {i}] {filename} (chunk {chunk_idx}, relevance: {score:.2f})\n{content}\n"

            # Check length
            if current_length + len(entry) > max_length:
                context_parts.append("\n...(additional results truncated)...")
                break

            context_parts.append(entry)
            current_length += len(entry)

        context_parts.append("\n=== END FILE CONTENT ===")

        return "".join(context_parts)

    def clear_conversation(self, conversation_id: str):
        """Clear file search data for conversation"""
        self.vector_store.clear_conversation(conversation_id)

    def is_configured(self) -> bool:
        """Check if file search is properly configured"""
        return True  # ChromaDB is always available
