from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Dict, Any, Optional

class DocumentVectorStore:
    """A vector store for document intelligence that can be cleared between runs."""
    
    def __init__(self):
        # Initialize with OpenAI embeddings
        self.embeddings = OpenAIEmbeddings()
        self.vector_store = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
    
    def add_document(self, document_text: str, metadata: Dict[str, Any]) -> None:
        """Add a document to the vector store, splitting it into chunks."""
        # Split text into chunks
        chunks = self.text_splitter.split_text(document_text)
        
        # Create metadata for each chunk (all chunks get the same document metadata)
        chunk_metadatas = [metadata] * len(chunks)
        
        if self.vector_store is None:
            # Create the vector store with the first document
            self.vector_store = FAISS.from_texts(
                chunks, 
                self.embeddings,
                metadatas=chunk_metadatas
            )
        else:
            # Add to existing vector store
            self.vector_store.add_texts(
                chunks,
                metadatas=chunk_metadatas
            )
    
    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Add multiple documents to the vector store."""
        for doc in documents:
            self.add_document(doc["content"], {
                "file_path": doc["file_path"],
                "document_id": doc.get("document_id", doc["file_path"]),
                "metadata": doc.get("metadata", {})
            })
    
    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        Search the vector store for document chunks relevant to the query.
        
        Returns:
            List of dictionaries with content and metadata
        """
        if self.vector_store is None:
            return []
        
        docs = self.vector_store.similarity_search(query, k=k)
        
        # Format the results
        results = []
        for doc in docs:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata
            })
            
        return results
    
    def search_by_document(self, query: str, document_id: str, k: int = 5) -> List[Dict[str, Any]]:
        """Search within a specific document."""
        if self.vector_store is None:
            return []
        
        # Create a filter to search only in the specified document
        filter = {"document_id": document_id}
        
        # Search with the filter
        docs = self.vector_store.similarity_search(
            query, 
            k=k,
            filter=filter
        )
        
        # Format the results
        results = []
        for doc in docs:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata
            })
            
        return results
    
    def clear(self) -> None:
        """Clear the vector store."""
        self.vector_store = None

# Create a singleton instance
vector_store = DocumentVectorStore()