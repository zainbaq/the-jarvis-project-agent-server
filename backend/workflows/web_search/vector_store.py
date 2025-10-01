from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Dict, Any, Optional

class ResearchVectorStore:
    """A vector store for research data that can be cleared between runs."""
    
    def __init__(self):
        # Initialize with OpenAI embeddings
        self.embeddings = OpenAIEmbeddings()
        self.vector_store = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
    
    def add_texts(self, texts: List[str], metadatas: Optional[List[Dict[str, Any]]] = None) -> None:
        """Add texts to the vector store, creating it if it doesn't exist."""
        # Split texts into chunks
        docs = []
        for i, text in enumerate(texts):
            chunks = self.text_splitter.split_text(text)
            # Create metadata for each chunk if provided
            chunk_metadatas = None
            if metadatas and i < len(metadatas):
                chunk_metadatas = [metadatas[i]] * len(chunks)
            
            if self.vector_store is None:
                # Create the vector store with the first set of documents
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
    
    def search(self, query: str, k: int = 5) -> List[str]:
        """Search the vector store for documents relevant to the query."""
        if self.vector_store is None:
            return []
        
        docs = self.vector_store.similarity_search(query, k=k)
        return [doc.page_content for doc in docs]
    
    def clear(self) -> None:
        """Clear the vector store."""
        self.vector_store = None

# Create a singleton instance
vector_store = ResearchVectorStore()