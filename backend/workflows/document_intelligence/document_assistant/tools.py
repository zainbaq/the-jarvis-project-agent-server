from typing import List, Dict, Any, Optional
from .models import DocumentInfo, AgentState
from .document_utils import (
    extract_text_from_document,
    compare_documents,
    extract_form_fields,
    fill_template
)
from .llm_utils import (
    summarize_document,
    execute_analysis_step
)
from .vector_store import vector_store  # Import the vector store

def load_documents(directory_path: str, llm, specific_files: List[str] = None) -> List[DocumentInfo]:
    """
    Load and process documents from the specified directory.
    
    Args:
        directory_path: Path to the directory containing documents
        llm: LLM instance for document summarization
        specific_files: Optional list of specific filenames to load (not full paths)
        
    Returns:
        List of DocumentInfo objects
    """
    from .document_utils import list_documents
    
    # Get all document paths in the directory
    all_file_paths = list_documents(directory_path)
    
    # Filter by specific files if provided
    if specific_files:
        file_paths = []
        for path in all_file_paths:
            filename = path.split('/')[-1] if '/' in path else path.split('\\')[-1] if '\\' in path else path
            if filename in specific_files:
                file_paths.append(path)
    else:
        file_paths = all_file_paths
    
    documents = []
    
    for file_path in file_paths:
        try:
            # Extract text and metadata from the document
            content, metadata = extract_text_from_document(file_path)
            
            # Create a DocumentInfo object
            doc_info = DocumentInfo(
                file_path=file_path,
                content=content,
                metadata=metadata
            )
            
            documents.append(doc_info)
            
        except Exception as e:
            print(f"Error processing document {file_path}: {str(e)}")
    
    return documents

def analyze_document(doc_info: DocumentInfo, aspects: List[str], llm) -> Dict[str, Any]:
    """
    Perform detailed analysis of a document for specific aspects.
    
    Args:
        doc_info: Information about the document to analyze
        aspects: List of aspects to analyze (e.g., ["key_entities", "sentiment", "topics"])
        llm: LLM instance for analysis
        
    Returns:
        Dictionary with analysis results
    """
    # Use vector search to get relevant chunks instead of using the entire document
    query = f"analyze {' '.join(aspects)}"
    relevant_chunks = vector_store.search_by_document(query, doc_info.file_path, k=10)
    
    # Prepare context from relevant chunks
    context = ""
    if relevant_chunks:
        for i, chunk in enumerate(relevant_chunks):
            context += f"Chunk {i+1}:\n{chunk['content']}\n\n"
    else:
        # Fallback to first part of the document if no chunks found
        context = doc_info.content[:10000] + "..."
    
    prompt = f"""
    Analyze the following document focusing on these aspects: {', '.join(aspects)}
    
    DOCUMENT: {doc_info.file_path}
    CONTENT: {context}
    
    Provide a detailed analysis for each requested aspect. Structure your response.
    """
    
    response = llm.invoke(prompt)
    
    return {
        "document": doc_info.file_path,
        "analysis": response.content,
        "aspects": aspects
    }

def extract_information(docs: List[DocumentInfo], entities: List[str], llm) -> Dict[str, Any]:
    """
    Extract specific information from documents using vector search.
    
    Args:
        docs: List of documents to extract information from
        entities: List of entities or information types to extract
        llm: LLM instance for extraction
        
    Returns:
        Dictionary with extracted information
    """
    results = {}
    
    for entity in entities:
        entity_results = []
        
        # Create a query focused on the entity
        query = f"extract {entity} information"
        
        for doc in docs:
            # Use vector search to find relevant chunks for this entity in this document
            relevant_chunks = vector_store.search_by_document(query, doc.file_path, k=5)
            
            # Prepare context from relevant chunks
            context = ""
            if relevant_chunks:
                for i, chunk in enumerate(relevant_chunks):
                    context += f"Chunk {i+1}:\n{chunk['content']}\n\n"
            else:
                # Fallback to first part of the document if no chunks found
                context = doc.content[:5000] + "..."
            
            prompt = f"""
            Extract information about "{entity}" from the following document:
            
            DOCUMENT: {doc.file_path}
            CONTENT: {context}
            
            Provide all relevant information about {entity} found in this document.
            If no information is found, state "No information found".
            """
            
            response = llm.invoke(prompt)
            
            entity_results.append({
                "document": doc.file_path,
                "information": response.content
            })
        
        results[entity] = entity_results
    
    return results

def summarize_multiple_documents(docs: List[DocumentInfo], llm) -> str:
    """
    Create a comprehensive summary of multiple documents using vector search.
    
    Args:
        docs: List of documents to summarize
        llm: LLM instance for summarization
        
    Returns:
        Combined summary text
    """
    # Create a prompt for combined summary
    prompt = "combine document summaries"
    
    # Search for representative chunks across all documents
    all_chunks = []
    for doc in docs:
        # Get key chunks from each document
        doc_chunks = vector_store.search_by_document(prompt, doc.file_path, k=3)
        if doc_chunks:
            all_chunks.append({
                "document": doc.file_path,
                "chunks": doc_chunks
            })
    
    # Prepare combined context
    combined_context = ""
    for doc_info in all_chunks:
        combined_context += f"\nDOCUMENT: {doc_info['document']}\n"
        for i, chunk in enumerate(doc_info['chunks']):
            combined_context += f"Chunk {i+1}:\n{chunk['content']}\n\n"
    
    summary_prompt = f"""
    Create a comprehensive combined summary of the following documents:
    
    {combined_context}
    
    This summary should integrate information from all documents, 
    highlighting the most important points, shared themes, and any notable differences.
    The summary should be comprehensive but concise, highlighting the key information.
    """
    
    response = llm.invoke(summary_prompt)
    return response.content

def transform_document_format(doc_info: DocumentInfo, target_format: str, llm) -> Dict[str, Any]:
    """
    Transform a document to a different format using vector search for efficiency.
    
    Args:
        doc_info: Information about the document to transform
        target_format: The target format (e.g., "json", "markdown", "html")
        llm: LLM instance for transformation
        
    Returns:
        Dictionary with the transformed document
    """
    # Search for relevant chunks to process
    relevant_chunks = vector_store.search_by_document("important content transform format", doc_info.file_path, k=8)
    
    # Prepare context from relevant chunks
    context = ""
    if relevant_chunks:
        for i, chunk in enumerate(relevant_chunks):
            context += f"Chunk {i+1}:\n{chunk['content']}\n\n"
    else:
        # Fallback to a portion of the document if no chunks found
        context = doc_info.content[:8000] + "..."
    
    prompt = f"""
    Transform the following document content to {target_format} format:
    
    DOCUMENT: {doc_info.file_path}
    CONTENT: {context}
    
    Provide the transformed document in {target_format} format.
    Be sure to preserve all important information and structure appropriately.
    """
    
    response = llm.invoke(prompt)
    
    return {
        "original_document": doc_info.file_path,
        "target_format": target_format,
        "transformed_content": response.content
    }