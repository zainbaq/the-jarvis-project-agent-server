from .states import CodeGenState
from .graphs import build_code_generation_graph
from datetime import date
import os
import json
from dotenv import load_dotenv
from . import steps

load_dotenv()

# Function to generate the project and return a JSON object
def generate_project(project_requirements: str, recursion_limit: int = 100):
    """Generate a complete project and return a JSON representation"""
    # Initialize the state
    initial_state = CodeGenState(
        project_requirements=project_requirements,
        architecture=[],
        codebase={},
        current_file=None,
        messages=[],
        error=None,
        code_reviews={},
        test_results={},
        documentation={},
        _iterations=0,  # Add iteration counter to track and prevent infinite loops
        create_documentation=True,
        completed_files=[]
    )
    
    print("Building graph...")
    # Build the fixed graph
    graph = build_code_generation_graph()
    
    print("Compiling graph...")
    # Compile the graph
    app = graph.compile()
    
    print("Running workflow...")
    # Run the workflow with a higher recursion limit
    final_state = None
    try:
        # Use invoke with a higher recursion limit
        final_state = app.invoke(initial_state, config={"recursion_limit": recursion_limit})
        print("Workflow completed successfully")
    except Exception as e:
        print(f"Workflow execution error: {str(e)}")
        import traceback
        traceback.print_exc()
        # Try to get the state even if there was an error
        try:
            final_state = app.get_state()
            print("Retrieved partial state after error")
        except:
            print("Could not retrieve state after error")
            return initial_state
    
    # If we still don't have a final state, use the initial state
    if not final_state:
        print("No state available, returning initial state")
        return initial_state
    result = {
        "project_requirements": project_requirements,
        "architecture": final_state.get("architecture", []),
        "codebase": final_state.get("codebase", {}),
        "code_reviews": final_state.get("code_reviews", {}),
        "test_results": final_state.get("test_results", {}),
        "documentation": final_state.get("documentation", {}),
        "error": final_state.get("error", None)
    }
    print(result)
    # Return the state as a dictionary
    return result


# Function to save the project JSON to disk
def save_project_to_disk(project_json, output_dir: str = "generated_project"):
    """Save a project JSON representation to disk"""
    from datetime import date
    import os
    import json
    
    # Add date suffix to output directory
    output_dir = output_dir + "_" + date.today().strftime("%Y%m%d")
    os.makedirs(output_dir, exist_ok=True)
    
    # Save code
    for filename, code in project_json.get("codebase", {}).items():
        # Get path from the architecture if available
        architecture = project_json.get("architecture", [])
        
        # Handle different architecture formats
        if isinstance(architecture, dict):
            components = architecture.get("components", [])
            component = next((c for c in components if isinstance(c, dict) and c.get("name") == filename), None)
        else:
            component = next((c for c in architecture if isinstance(c, dict) and c.get("name") == filename), None)
            
        # Get the filepath, but ensure it's relative (not starting with /)
        filepath = component.get("path", filename) if component else filename
        
        # Remove leading slash to make it relative
        if filepath.startswith('/'):
            filepath = filepath.lstrip('/')
            print(f"Converting absolute path to relative: {filepath}")
        
        # Check if the path ends with a directory separator and append the filename if it does
        if filepath.endswith('/') or os.path.isdir(os.path.join(output_dir, filepath)):
            filepath = os.path.join(filepath, filename)
            print(f"Path was a directory, appending filename: {filepath}")
        
        # Create directories if needed
        dir_path = os.path.dirname(os.path.join(output_dir, filepath))
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        
        # Write the file
        file_path = os.path.join(output_dir, filepath)
        print(f"Writing file: {file_path}")
        
        # Double-check it's not a directory
        if os.path.isdir(file_path):
            # If it's a directory, append the filename
            file_path = os.path.join(file_path, filename)
            print(f"Fixed path that was a directory: {file_path}")
        
        with open(file_path, "w") as f:
            f.write(code)
    
    # Save documentation
    docs_dir = os.path.join(output_dir, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    
    for filename, content in project_json.get("documentation", {}).items():
        if filename == "README.md":
            # Save README at the root
            with open(os.path.join(output_dir, filename), "w") as f:
                f.write(content)
        else:
            # Save other docs in the docs directory
            with open(os.path.join(docs_dir, filename), "w") as f:
                f.write(content)
    
    # Save code reviews
    reviews_dir = os.path.join(output_dir, "code_reviews")
    os.makedirs(reviews_dir, exist_ok=True)
    
    for filename, review in project_json.get("code_reviews", {}).items():
        with open(os.path.join(reviews_dir, f"{filename}_review.md"), "w") as f:
            f.write(review)
    
    # Create a project summary
    summary = {
        "files_generated": list(project_json.get("codebase", {}).keys()),
        "files_with_tests": list(project_json.get("test_results", {}).keys()),
        "documentation_generated": list(project_json.get("documentation", {}).keys()),
        "code_reviews_performed": list(project_json.get("code_reviews", {}).keys()),
    }
    
    with open(os.path.join(output_dir, "project_summary.json"), "w") as f:
        json.dump(summary, f, indent=2)
    
    print(f"Project saved successfully in ./{output_dir}/")
    print(f"Saved {len(project_json.get('codebase', {}))} code files")
    print(f"Saved documentation for {len(project_json.get('documentation', {}))} files")
    print(f"Saved code reviews for {len(project_json.get('code_reviews', {}))} files")
    
    return output_dir

# Example of how to use these functions together
def generate_and_save_complete_project(project_requirements: str, output_dir: str = "generated_project", recursion_limit: int = 100):
    """Generate a complete project with code, tests, reviews, and documentation"""
    # Generate the project JSON
    project_json = generate_project(project_requirements, recursion_limit)
    
    # Save the project to disk
    save_project_to_disk(project_json, output_dir)
    
    return project_json

def get_description():
    desc = """
    This workflow initializes a code generation agent to create a complete project based on user requirements.
    It includes generating code, tests, reviews, and documentation.
    The input to this workflow is a string describing the exact project requirements. 
    The agent returns a response containining a link to download the generated project.
    Only call this workflow to write code for a project.
    """
    return desc

# def perform_task(task):
#     """
#     Perform a task based on the provided keyword arguments.
    
#     Args:
#         **kwargs: Keyword arguments containing user input and other parameters
        
#     Returns:
#         Dictionary with the task results
#     """
#     # Extract the relevant parameters from kwargs
#     # Generate the complete project
#     return generate_project(project_requirements=task)

# Add this to your workflows/developer/tasks.py file

from progress_manager import update_progress

# Add a progress-tracked version of generate_project
def generate_project_with_progress(project_requirements: str, task_id=None, recursion_limit: int = 100):
    """Generate a complete project and return a JSON representation with progress reporting"""
    # Initialize the state
    initial_state = CodeGenState(
        project_requirements=project_requirements,
        architecture=[],
        codebase={},
        current_file=None,
        messages=[],
        error=None,
        code_reviews={},
        test_results={},
        documentation={},
        _iterations=0,  # Add iteration counter to track and prevent infinite loops
        create_documentation=True,
        completed_files=[]
    )
    
    print("Building graph...")
    # Build the fixed graph
    graph = build_code_generation_graph()
    
    print("Compiling graph...")
    # Compile the graph
    app = graph.compile()
    
    # Add progress tracking hooks to key steps
    original_analyze_requirements = app.nodes['analyze_requirements'].fn
    original_prioritize_files = app.nodes['prioritize_files'].fn
    original_select_next_file = app.nodes['select_next_file'].fn
    original_generate_file = app.nodes['generate_file'].fn
    original_review_code = app.nodes['review_code'].fn
    original_improve_code = app.nodes['improve_code'].fn
    original_generate_tests = app.nodes['generate_tests'].fn
    original_generate_documentation = app.nodes['generate_documentation'].fn
    
    # Create wrapped functions with progress reporting
    def analyze_requirements_with_progress(state):
        if task_id:
            update_progress(task_id, 10, "Analyzing project requirements...")
        return original_analyze_requirements(state)
    
    def prioritize_files_with_progress(state):
        if task_id:
            update_progress(task_id, 20, "Prioritizing files for generation...")
        return original_prioritize_files(state)
    
    def select_next_file_with_progress(state):
        # Count files based on architecture
        if task_id:
            architecture = state.get("architecture", [])
            codebase = state.get("codebase", {})
            
            # Get components based on architecture type
            if isinstance(architecture, dict):
                components = []
                if "components" in architecture:
                    components = architecture["components"]
                elif "files" in architecture:
                    components = architecture["files"]
                else:
                    for name, details in architecture.items():
                        if isinstance(details, dict):
                            components.append({"name": name, **details})
            else:
                components = architecture
            
            total_files = len(components)
            generated_files = len(codebase)
            
            if total_files > 0:
                progress = 20 + int((generated_files / total_files) * 50)
                progress = min(progress, 70)  # Cap at 70% for file generation
                update_progress(task_id, progress, f"Generating files ({generated_files}/{total_files})...")
                
        return original_select_next_file(state)
    
    def generate_file_with_progress(state):
        return original_generate_file(state)
    
    def review_code_with_progress(state):
        return original_review_code(state)
    
    def improve_code_with_progress(state):
        return original_improve_code(state)
    
    def generate_tests_with_progress(state):
        return original_generate_tests(state)
    
    def generate_documentation_with_progress(state):
        if task_id:
            update_progress(task_id, 80, "Generating project documentation...")
        return original_generate_documentation(state)
    
    # Replace the original functions with the wrapped ones
    app.nodes['analyze_requirements'].fn = analyze_requirements_with_progress
    app.nodes['prioritize_files'].fn = prioritize_files_with_progress
    app.nodes['select_next_file'].fn = select_next_file_with_progress
    app.nodes['generate_file'].fn = generate_file_with_progress
    app.nodes['review_code'].fn = review_code_with_progress
    app.nodes['improve_code'].fn = improve_code_with_progress
    app.nodes['generate_tests'].fn = generate_tests_with_progress
    app.nodes['generate_documentation'].fn = generate_documentation_with_progress
    
    print("Running workflow...")
    # Run the workflow with a higher recursion limit
    final_state = None
    try:
        # Use invoke with a higher recursion limit
        if task_id:
            update_progress(task_id, 25, "Starting code generation...")
        
        final_state = app.invoke(initial_state, config={"recursion_limit": recursion_limit})
        print("Workflow completed successfully")
        
        if task_id:
            update_progress(task_id, 95, "Finalizing project...")
    except Exception as e:
        print(f"Workflow execution error: {str(e)}")
        import traceback
        traceback.print_exc()
        # Try to get the state even if there was an error
        try:
            final_state = app.get_state()
            print("Retrieved partial state after error")
        except:
            print("Could not retrieve state after error")
            return initial_state
    
    # If we still don't have a final state, use the initial state
    if not final_state:
        print("No state available, returning initial state")
        return initial_state
        
    result = {
        "project_requirements": project_requirements,
        "architecture": final_state.get("architecture", []),
        "codebase": final_state.get("codebase", {}),
        "code_reviews": final_state.get("code_reviews", {}),
        "test_results": final_state.get("test_results", {}),
        "documentation": final_state.get("documentation", {}),
        "error": final_state.get("error", None)
    }
    
    # Return the state as a dictionary
    return result

# Modify the perform_task function in workflows/developer/tasks.py

from progress_manager import update_progress

def perform_task(task, provider="openai", api_key=None, temperature: float = 0.0, max_tokens: int = None, task_id=None, recursion_limit: int = 100):
    """
    Perform a task with progress tracking.

    Args:
        task: The project requirements
        provider: LLM provider (openai, anthropic, etc.)
        api_key: API key for the provider
        temperature: Temperature for LLM generation
        max_tokens: Maximum tokens for LLM generation
        task_id: Optional task ID for progress reporting
        recursion_limit: Maximum recursion limit for workflow

    Returns:
        Dictionary with the task results
    """
    # Validate and get API key
    if api_key is None:
        import os
        api_key = os.getenv('OPENAI_API_KEY')

    if not api_key:
        error_msg = "No API key provided and OPENAI_API_KEY not in environment"
        if task_id:
            update_progress(task_id, 0, f"Error: {error_msg}")
        return {
            "error": error_msg,
            "status": "error"
        }

    # Configure model for this task
    steps.set_llm(provider, api_key, temperature=temperature, max_tokens=max_tokens)

    # Report initial progress
    if task_id:
        update_progress(task_id, 10, "Analyzing project requirements")
    
    # Initialize the state
    initial_state = CodeGenState(
        project_requirements=task,
        architecture=[],
        codebase={},
        current_file=None,
        messages=[],
        error=None,
        code_reviews={},
        test_results={},
        documentation={},
        _iterations=0,
        create_documentation=True,
        completed_files=[]
    )
    
    # Build and compile the graph
    graph = build_code_generation_graph()
    app = graph.compile()
    
    if task_id:
        update_progress(task_id, 25, "Starting code generation")
    
    # Run the workflow
    try:
        final_state = app.invoke(initial_state, config={"recursion_limit": recursion_limit})
        
        if task_id:
            update_progress(task_id, 90, "Finalizing project")
        
    except Exception as e:
        if task_id:
            update_progress(task_id, 0, f"Error: {str(e)}")

        import traceback
        traceback.print_exc()

        # Return error information (app.get_state() doesn't exist on compiled graphs)
        return {
            "error": str(e),
            "status": "error",
            "project_requirements": task
        }
    
    # Prepare the result
    result = {
        "project_requirements": task,
        "architecture": final_state.get("architecture", []),
        "codebase": final_state.get("codebase", {}),
        "code_reviews": final_state.get("code_reviews", {}),
        "test_results": final_state.get("test_results", {}),
        "documentation": final_state.get("documentation", {}),
        "error": final_state.get("error", None)
    }
    print(f"In perform task: {len(result)}")
    
    if task_id:
        update_progress(task_id, 100, "Project generation complete")
    
    return result