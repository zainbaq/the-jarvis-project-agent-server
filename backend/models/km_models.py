"""
Pydantic models for Knowledge Management (KM) server connections
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class KMConnectionStatus(str, Enum):
    """Status of a KM connection"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


class KMCollection(BaseModel):
    """Represents a collection/index in the KM server"""
    name: str = Field(..., description="Collection name")
    files: List[str] = Field(default_factory=list, description="Files in the collection")
    num_chunks: int = Field(0, description="Number of chunks in the collection")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "research_papers",
                "files": ["paper1.pdf", "paper2.pdf"],
                "num_chunks": 543
            }
        }


class KMCorpus(BaseModel):
    """Represents a corpus in the KM server"""
    id: int = Field(..., description="Corpus ID")
    name: str = Field(..., description="Corpus identifier name")
    display_name: str = Field(..., description="Human-readable name")
    description: Optional[str] = Field(None, description="Corpus description")
    category: Optional[str] = Field(None, description="Corpus category")
    chunk_count: int = Field(0, description="Number of chunks")
    file_count: int = Field(0, description="Number of files")
    is_public: bool = Field(False, description="Whether corpus is public")

    class Config:
        json_schema_extra = {
            "example": {
                "id": 42,
                "name": "us_contract_law",
                "display_name": "US Contract Law Reference",
                "description": "Comprehensive contract law reference",
                "category": "legal",
                "chunk_count": 1523,
                "file_count": 15,
                "is_public": True
            }
        }


class KMConnectionCreate(BaseModel):
    """Request model for creating a KM connection"""
    name: str = Field(..., description="Connection display name (alias)")
    username: str = Field(..., description="KM server username")
    password: str = Field(..., description="KM server password")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Engineering Knowledge Base",
                "username": "engineer_user",
                "password": "secure_password_123"
            }
        }


class KMConnectionUpdate(BaseModel):
    """Request model for updating a KM connection"""
    name: Optional[str] = Field(None, description="New connection name")
    selected_collection_names: Optional[List[str]] = Field(
        None, description="List of collection names to search"
    )
    selected_corpus_ids: Optional[List[int]] = Field(
        None, description="List of corpus IDs to search"
    )
    is_active: Optional[bool] = Field(None, description="Whether connection is active")


class KMSelectionUpdate(BaseModel):
    """Request model for updating selected collections/corpuses"""
    selected_collection_names: List[str] = Field(
        default_factory=list, description="List of collection names to search"
    )
    selected_corpus_ids: List[int] = Field(
        default_factory=list, description="List of corpus IDs to search"
    )


class KMConnection(BaseModel):
    """Full KM connection model (stored internally)"""
    id: str = Field(..., description="Unique connection ID")
    name: str = Field(..., description="Connection display name")
    username: str = Field(..., description="KM server username")
    api_key_encrypted: str = Field(..., description="Encrypted API key")
    status: KMConnectionStatus = Field(default=KMConnectionStatus.ACTIVE)
    collections: List[KMCollection] = Field(default_factory=list)
    corpuses: List[KMCorpus] = Field(default_factory=list)
    selected_collection_names: List[str] = Field(default_factory=list)
    selected_corpus_ids: List[int] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_sync_at: Optional[str] = Field(None, description="Last sync timestamp")
    last_error: Optional[str] = Field(None, description="Last error message")


class KMConnectionPublic(BaseModel):
    """Public view of KM connection (no API key or password exposed)"""
    id: str
    name: str
    username: str
    status: KMConnectionStatus
    collections: List[KMCollection]
    corpuses: List[KMCorpus]
    selected_collection_names: List[str]
    selected_corpus_ids: List[int]
    created_at: str
    updated_at: str
    last_sync_at: Optional[str]
    last_error: Optional[str]

    @classmethod
    def from_connection(cls, conn: KMConnection) -> "KMConnectionPublic":
        """Create public view from full connection"""
        return cls(
            id=conn.id,
            name=conn.name,
            username=conn.username,
            status=conn.status,
            collections=conn.collections,
            corpuses=conn.corpuses,
            selected_collection_names=conn.selected_collection_names,
            selected_corpus_ids=conn.selected_corpus_ids,
            created_at=conn.created_at,
            updated_at=conn.updated_at,
            last_sync_at=conn.last_sync_at,
            last_error=conn.last_error
        )


class KMQueryResult(BaseModel):
    """Single result from a KM query"""
    content: str = Field(..., description="Retrieved content")
    source: str = Field(..., description="Source document/file")
    collection_name: Optional[str] = Field(None, description="Collection name")
    corpus_id: Optional[int] = Field(None, description="Corpus ID")
    relevance_score: Optional[float] = Field(None, description="Relevance score (0-1)")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class KMSearchResult(BaseModel):
    """Aggregated search result from KM connector"""
    success: bool
    message: str
    connection_id: str
    connection_name: str
    results_count: int
    results: List[KMQueryResult]
    context: Optional[str] = Field(None, description="Formatted context for prompt")
    errors: List[Dict[str, Any]] = Field(default_factory=list)


class KMTestResult(BaseModel):
    """Result from testing a KM connection"""
    success: bool
    message: str
    collections_count: int = 0
    corpuses_count: int = 0
