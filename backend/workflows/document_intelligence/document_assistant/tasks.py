import os
import argparse
from typing import Dict, Any, List
from .agent import create_document_agent
from .models import AgentState
from progress_manager import update_progress

def process_document_request(user_input: str, document_paths: List[str] = None, provider: str = "openai", api_key: str = None, model_name: str = "gpt-4o", temperature: float = 0.2, max_tokens: int = None, task_id: str = None) -> Dict[str, Any]:
    """
    Process a document-related request from the user.
    
    Args:
        user_input: The user's request describing what they want to do with the documents
        document_paths: List of paths to the documents to process
        provider: The LLM provider
        api_key: API key for the provider
        model_name: The LLM model to use
        task_id: Optional task ID for progress tracking
        
    Returns:
        Dictionary with the processing results
    """
    # Report initial progress
    if task_id:
        update_progress(task_id, 10, "Initializing document intelligence agent")
    
    try:
        # Validate input
        if not user_input or not user_input.strip():
            return {
                "content": "Error: User input is required",
                "format": "text"
            }
            
        # Validate document paths
        valid_paths = []
        missing_paths = []
        
        if document_paths:
            for path in document_paths:
                if os.path.exists(path) and os.path.isfile(path):
                    valid_paths.append(path)
                else:
                    missing_paths.append(path)
        
        if not valid_paths:
            return {
                "content": f"Error: No valid document paths provided. Missing: {missing_paths}",
                "format": "text"
            }
            
        # Update progress
        if task_id:
            update_progress(task_id, 20, "Creating document agent")

        # Create the document agent with the file paths
        agent = create_document_agent(provider=provider, api_key=api_key, model_name=model_name, file_paths=valid_paths, temperature=temperature, max_tokens=max_tokens)
        
        # Initialize the agent state
        initial_state = AgentState(user_input=user_input)
        
        # Update progress
        if task_id:
            update_progress(task_id, 25, "Analyzing documents")
            
        # Run the agent and get the final state
        final_state = agent.invoke(initial_state)
        print(final_state['final_output'])
        # Update progress
        if task_id:
            update_progress(task_id, 95, "Finalizing output")
        
        # Debug output: print the final state
        print("Final state keys:", dir(final_state))
        print("Final state type:", type(final_state))
        
        # Properly handle the final state whether it's a dict or object
        # This works with both AddableValuesDict and regular dictionaries
        if isinstance(final_state, dict):
            # Extract directly from dictionary
            final_output = final_state.get("final_output")
            status = final_state.get("status")
            error = final_state.get("error")
            working_memory = final_state.get("working_memory", {})
            
            # Get task requirements if available
            if "task_requirements" in final_state:
                task_requirements = final_state["task_requirements"]
                output_format = task_requirements.output_format.lower() if hasattr(task_requirements, "output_format") else "markdown"
            else:
                output_format = "markdown"
        else:
            # Try to access as object attributes
            final_output = getattr(final_state, "final_output", None)
            status = getattr(final_state, "status", None)
            error = getattr(final_state, "error", None)
            working_memory = getattr(final_state, "working_memory", {})
            
            # Get task requirements if available
            task_requirements = getattr(final_state, "task_requirements", None)
            if task_requirements:
                output_format = task_requirements.output_format.lower() if hasattr(task_requirements, "output_format") else "markdown"
            else:
                output_format = "markdown"
        
        # Debug info
        print(f"Final output exists: {final_output is not None}")
        if final_output:
            print(f"Final output preview: {str(final_output)[:200]}...")
        
        # Handle error state
        if status == "error" and error:
            return {
                "content": f"Error: {error}",
                "format": "text"
            }
            
        # Return the final output if available
        if final_output:
            # Determine format
            if output_format == "json":
                format_type = "json"
            else:
                format_type = "markdown"
                
            return {
                "content": final_output,
                "format": format_type
            }
        
        # If final_output is not available but we have working_memory, try to extract output from that
        if working_memory:
            # Try to get result from the last step in working memory
            last_step_keys = [k for k in working_memory.keys() if k.startswith('step_')]
            if last_step_keys:
                # Get the highest step number
                last_step = max(last_step_keys, key=lambda k: int(k.split('_')[1]))
                result = working_memory[last_step]
                
                return {
                    "content": result,
                    "format": "markdown"
                }
                
        # Fallback if no output available
        return {
            "content": "The document processing completed, but no output was generated.",
            "format": "text"
        }
            
    except Exception as e:
        # Handle any exceptions during agent execution
        error_msg = f"Error processing document request: {str(e)}"
        print(error_msg)
        import traceback
        traceback.print_exc()  # Print full stack trace for debugging
        
        if task_id:
            update_progress(task_id, 0, error_msg)
            
        return {
            "content": error_msg,
            "format": "text"
        }

def get_description() -> str:
    """
    Get a description of the document processing task.
    
    Returns:
        A string description of the task
    """
    desc = """
    This assistant helps you process documents based on your input.
    You can ask it to analyze, summarize, or extract information from your uploaded documents.
    It can handle PDF, DOCX, TXT, and image files.
    Examples of what you can ask:
    - "Summarize these documents"
    - "Extract key information about [topic] from these files"
    - "Compare these documents and highlight the differences"
    - "Create a table of the important data points in these files"
    """
    return desc

def perform_task(task_request, provider: str = "openai", api_key: str = None, temperature: float = 0.2, max_tokens: int = None, task_id=None):
    """
    Perform a task based on the provided keyword arguments.
    
    Args:
        task_request: Dictionary containing user request and document paths
        provider: LLM provider
        api_key: API key for the provider
        task_id: Optional task ID for progress tracking
        
    Returns:
        Dictionary with the task results
    """
    user_input = task_request.get("user_request", "")
    document_paths = task_request.get("document_paths", [])
    
    # Process the document request directly and return its result
    # This skips any additional formatting so we get the expected result structure
    return process_document_request(
        user_input=user_input,
        document_paths=document_paths,
        provider=provider,
        api_key=api_key,
        model_name="gpt-4o",
        temperature=temperature,
        max_tokens=max_tokens,
        task_id=task_id
    )