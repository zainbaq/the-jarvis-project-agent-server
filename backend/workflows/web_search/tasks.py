import os
import datetime
from .graphs import build_research_workflow_graph
from . import steps

def save_output_to_directory(output_text, directory="research_outputs"):
    """
    Saves the research output text to a file in the specified directory.
    
    Args:
        output_text (str): The text content to save
        directory (str): The directory path where the file should be saved
                        (will be created if it doesn't exist)
    
    Returns:
        str: The full path to the saved file
    """
    # Create the directory if it doesn't exist
    if not os.path.exists(directory):
        os.makedirs(directory)
    
    # Generate a filename with timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Extract a short title from the beginning of the content
    first_line = output_text.split('\n', 1)[0] if '\n' in output_text else output_text
    title_part = first_line.replace('#', '').strip()[:30].replace(' ', '_')
    
    # Create a safe filename
    filename = f"{timestamp}_{title_part}.md"
    filepath = os.path.join(directory, filename)
    
    # Write the content to the file
    with open(filepath, "w", encoding="utf-8") as file:
        file.write(output_text)
    
    print(f"Output saved to: {filepath}")
    return filepath

def perform_deep_research(input_text, provider="openai", api_key=None, temperature: float = 0.7, max_tokens: int = None):
    """
    Perform deep research on the given input.
    
    Args:
        input_text (str): The input text to research
        
    Returns:
        str: The research output as markdown text
    """
    # Configure models
    steps.set_llms(provider, api_key, temperature=temperature, max_tokens=max_tokens)

    # Build and compile the workflow
    workflow = build_research_workflow_graph()
    app = workflow.compile()
    
    # Execute the workflow
    result = app.invoke({
        "input": input_text
    })
    
    # Extract the final output
    if isinstance(result, dict) and 'final_output' in result:
        return result['final_output']
    else:
        # Convert any other result type to string
        return str(result)

def get_description():
    """Get a description of this workflow."""
    desc = """
    This workflow performs deep research on a given topic using an AI-powered agent.
    It searches the web for relevant information, analyzes the results, and generates
    a comprehensive report organized into sections with proper citations.
    """
    return desc

# def perform_task(task):
#     """
#     Perform the research task.
    
#     Args:
#         task (str): The research topic/question
        
#     Returns:
#         str: The research output as markdown text
#     """
#     # Get the research output
#     output = perform_deep_research(task)
    
#     # # Save the output to a file (optional)
#     # try:
#     #     save_output_to_directory(output)
#     # except Exception as e:
#     #     print(f"Warning: Could not save output to file: {e}")
    
#     # Return the output directly
#     return output

# Add this to your workflows/web_search/tasks.py file

from backend.progress_manager import update_progress
import time

# Wrap the perform_deep_research function to include progress reporting
def perform_deep_research_with_progress(input_text, task_id=None, provider="openai", api_key=None, temperature: float = 0.7, max_tokens: int = None):
    """
    Perform deep research with progress reporting.
    
    Args:
        input_text (str): The input text to research
        task_id (str): The task ID for progress reporting
        
    Returns:
        str: The research output as markdown text
    """
    # Configure models
    steps.set_llms(provider, api_key, temperature=temperature, max_tokens=max_tokens)

    # Build and compile the workflow
    workflow = build_research_workflow_graph()
    app = workflow.compile()
    
    # Add progress reporting hooks
    original_create_research_plan = app.nodes['create_research_plan'].fn
    original_gather_research = app.nodes['gather_research'].fn
    original_plan_sections = app.nodes['plan_sections'].fn
    original_generate_section = app.nodes['generate_section'].fn
    original_combine_sections = app.nodes['combine_sections'].fn
    original_evaluate_and_refine = app.nodes['evaluate_and_refine'].fn
    
    # Create wrapped functions with progress reporting
    def create_research_plan_with_progress(state):
        if task_id:
            update_progress(task_id, 15, "Creating research plan...")
        return original_create_research_plan(state)
    
    def gather_research_with_progress(state):
        if task_id:
            update_progress(task_id, 30, "Gathering information from the web...")
        return original_gather_research(state)
    
    def plan_sections_with_progress(state):
        if task_id:
            update_progress(task_id, 50, "Planning the report structure...")
        return original_plan_sections(state)
    
    def generate_section_with_progress(state):
        if task_id:
            # Calculate progress based on sections completed
            sections_total = len(state.get("sections", {}).get("sections", []))
            section_idx = state.get("section_idx", 0)
            if sections_total > 0:
                section_progress = int((section_idx / sections_total) * 30)
                progress = 50 + section_progress
                update_progress(task_id, min(progress, 80), f"Writing section {section_idx + 1} of {sections_total}...")
        return original_generate_section(state)
    
    def combine_sections_with_progress(state):
        if task_id:
            update_progress(task_id, 85, "Combining sections into final report...")
        return original_combine_sections(state)
    
    def evaluate_and_refine_with_progress(state):
        if task_id:
            update_progress(task_id, 95, "Refining and polishing the report...")
        return original_evaluate_and_refine(state)
    
    # Replace the original functions with the wrapped ones
    app.nodes['create_research_plan'].fn = create_research_plan_with_progress
    app.nodes['gather_research'].fn = gather_research_with_progress
    app.nodes['plan_sections'].fn = plan_sections_with_progress
    app.nodes['generate_section'].fn = generate_section_with_progress
    app.nodes['combine_sections'].fn = combine_sections_with_progress
    app.nodes['evaluate_and_refine'].fn = evaluate_and_refine_with_progress
    
    # Execute the workflow
    result = app.invoke({
        "input": input_text
    })
    
    # Extract the final output
    if isinstance(result, dict) and 'final_output' in result:
        return result['final_output']
    else:
        # Convert any other result type to string
        return str(result)

# Modify the perform_task function in workflows/web_search/tasks.py

from backend.progress_manager import update_progress

def perform_task(task, provider="openai", api_key=None, temperature: float = 0.7, max_tokens: int = None, task_id=None):
    """
    Perform the research task with progress tracking.

    Args:
        task (str): The research topic/question
        provider (str): LLM provider (openai, anthropic, etc.)
        api_key (str): API key for the provider
        temperature (float): Temperature for LLM generation
        max_tokens (int): Maximum tokens for LLM generation
        task_id (str, optional): Optional task ID for progress reporting

    Returns:
        str: The research output as markdown text
    """
    # Validate and get API key
    if api_key is None:
        import os
        api_key = os.getenv('OPENAI_API_KEY')

    if not api_key:
        error_msg = "No API key provided and OPENAI_API_KEY not in environment"
        if task_id:
            update_progress(task_id, 0, f"Error: {error_msg}")
        return {"error": error_msg, "status": "error"}

    if task_id:
        update_progress(task_id, 10, "Starting research process")

    # Configure models
    steps.set_llms(provider, api_key, temperature=temperature, max_tokens=max_tokens)

    # Build and compile the workflow
    workflow = build_research_workflow_graph()
    app = workflow.compile()
    
    # Track progress at key points
    if task_id:
        update_progress(task_id, 20, "Creating research plan")
    
    # Execute the workflow
    result = app.invoke({
        "input": task
    })
    
    if task_id:
        update_progress(task_id, 90, "Finalizing research report")
    
    # Extract the final output
    if isinstance(result, dict) and 'final_output' in result:
        output = result['final_output']
    else:
        # Convert any other result type to string
        output = str(result)
    
    if task_id:
        update_progress(task_id, 100, "Research complete")
    
    return output
