import os
import json

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from .states import CodeGenState
from dotenv import load_dotenv
from tools.llm import get_llm

load_dotenv()

# Initialize the language model dynamically
model = None

def set_llm(provider: str, api_key: str, model_name: str = None, temperature: float = 0.0, max_tokens: int = None):
    """Configure the global LLM based on provider and API key."""
    global model
    default = "gpt-4o" if (provider or "openai").lower() == "openai" else "claude-3-5-sonnet-latest"
    model = get_llm(provider, api_key, model_name or default, temperature=temperature, max_tokens=max_tokens)

# Define the nodes of our workflow
def analyze_requirements(state: CodeGenState) -> CodeGenState:
    """Analyze requirements and create a high-level architecture"""
    analysis_prompt = ChatPromptTemplate.from_messages([
        MessagesPlaceholder(variable_name="messages"),
        ("human", """
        Analyze the following project requirements and create a high-level architecture:
        
        {project_requirements}
        
        Return a JSON array of components, where each component has:
        1. name: The name of the file
        2. path: The file path
        3. description: Brief description of the file's purpose
        4. dependencies: List of other components it depends on
        5. create_documentation: Boolean indicating if documentation should be generated for this component. 
                                 Default to false unless explicitly stated.
        
        Return only valid JSON without any additional explanation or markdown formatting.
        """)
    ])
    
    messages = state["messages"] + [HumanMessage(
        content=analysis_prompt.format_messages(
            messages=state["messages"],
            project_requirements=state["project_requirements"]
        )[0].content
    )]
    
    response = model.invoke(messages)
    
    try:
        # Extract the architecture from the response
        content = response.content
        
        # Try to extract JSON from markdown code blocks first
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
        if json_match:
            content = json_match.group(1)
        
        # Clean up the content to make it valid JSON
        content = content.strip()
        
        # Try to parse the JSON
        architecture = json.loads(content)
        
        # Check if architecture is a dictionary with components
        if isinstance(architecture, dict) and "components" in architecture:
            components = architecture["components"]
            print(f"Successfully parsed architecture with {len(components)} components")
            
            # Ensure all paths are relative
            for component in components:
                if "path" in component and component["path"].startswith('/'):
                    component["path"] = component["path"].lstrip('/')
                    print(f"Converting absolute path to relative: {component['path']}")
                    
        elif isinstance(architecture, list):
            components = architecture
            architecture = {"components": components}
            print(f"Successfully parsed architecture with {len(components)} components")
            
            # Ensure all paths are relative
            for component in components:
                if "path" in component and component["path"].startswith('/'):
                    component["path"] = component["path"].lstrip('/')
                    print(f"Converting absolute path to relative: {component['path']}")
        else:
            # Try to handle other formats
            print(f"Architecture type: {type(architecture)}")
            components = architecture.get("components", [])
            
            # Ensure all paths are relative
            for component in components:
                if "path" in component and component["path"].startswith('/'):
                    component["path"] = component["path"].lstrip('/')
                    print(f"Converting absolute path to relative: {component['path']}")
            
        state["architecture"] = architecture
        state["messages"] = messages + [response]
        return state

    except Exception as e:
        error_msg = f"Failed to parse architecture: {str(e)}"
        print(error_msg)
        print("Response content:", response.content)
        return {**state, "error": error_msg}

def prioritize_files(state: CodeGenState) -> CodeGenState:
    """Determine the order in which files should be created"""
    try:
        # Check for valid architecture
        if not state.get("architecture"):
            raise ValueError("No architecture defined")
            
        architecture = state["architecture"]
        print(f"Architecture type: {type(architecture)}")
        
        # Handle dictionary-based architecture
        if isinstance(architecture, dict):
            # Extract components from the dictionary
            components = []
            # Common pattern: architecture might contain a 'components' key
            if "components" in architecture:
                components = architecture["components"]
            # Or files might be directly in the architecture
            elif "files" in architecture:
                components = architecture["files"]
            # Or it might be a dictionary of component names to component details
            else:
                for name, details in architecture.items():
                    if isinstance(details, dict):
                        component = {"name": name, **details}
                        components.append(component)
        # Or if it's already a list, use it directly
        elif isinstance(architecture, list):
            components = architecture
        else:
            raise TypeError(f"Architecture must be a list or dict, got {type(architecture)}")
            
        # Create dependency graph from components
        dependency_graph = {}
        name_to_component = {}
        
        for component in components:
            if not isinstance(component, dict):
                raise TypeError(f"Component must be a dictionary, got {type(component)}")
                
            # Get the name from the component
            if "name" in component:
                name = component["name"]
            elif "filename" in component:
                name = component["filename"]
            else:
                raise ValueError("Component missing 'name' or 'filename' field")
                
            # Get dependencies, which might be under different keys
            dependencies = []
            if "dependencies" in component:
                dependencies = component["dependencies"]
            elif "imports" in component:
                dependencies = component["imports"]
            elif "depends_on" in component:
                dependencies = component["depends_on"]
                
            dependency_graph[name] = set(dependencies)
            name_to_component[name] = component
        
        # Topological sort
        visited = set()
        temp = set()
        order = []
        
        def visit(node):
            if node in temp:
                # Log circular dependency but continue
                print(f"Warning: Circular dependency detected involving {node}")
                return
            if node in visited:
                return
                
            temp.add(node)
            for neighbor in dependency_graph.get(node, []):
                # Skip missing dependencies
                if neighbor not in dependency_graph:
                    continue
                visit(neighbor)
            temp.remove(node)
            visited.add(node)
            order.append(node)
        
        for node in dependency_graph:
            if node not in visited:
                visit(node)
        
        # Reverse the order to get dependencies first
        prioritized = list(reversed(order))
        
        # Update the architecture to reflect the order
        ordered_components = []
        for name in prioritized:
            if name in name_to_component:
                ordered_components.append(name_to_component[name])
                
        print(f"Prioritized files in order: {[comp.get('name', comp.get('filename', 'Unknown')) for comp in ordered_components]}")
        
        # Update the original architecture structure
        if isinstance(architecture, dict):
            if "components" in architecture:
                architecture["components"] = ordered_components
            elif "files" in architecture:
                architecture["files"] = ordered_components
            else:
                # This is a bit tricky, as we've transformed the structure
                # Let's use a safer approach and keep the original structure
                pass
        else:
            architecture = ordered_components
        
        # Return just the updated state, not a dictionary with next
        state['architecture'] = architecture
        return state
        
    except Exception as e:
        error_msg = f"Error in prioritize_files: {str(e)}"
        print(error_msg)
        # Use the proper structure based on your Error handling
        return {
            **state,
            "error": error_msg
        }

def select_next_file(state: CodeGenState) -> CodeGenState:
    """Select the next file to generate with iteration tracking"""
    # Skip if there's an error
    if state.get("error"):
        return {**state, "error": state["error"]}
    
    # Add iteration counter to prevent infinite loops
    iterations = state.get("_iterations", 0)
    if iterations > 100:  # Set a reasonable limit
        error_msg = "Too many iterations in workflow, possible infinite loop"
        print(error_msg)
        return {**state, "error": error_msg, "current_file": None}
    
    try:
        # Get the architecture components
        architecture = state.get("architecture", [])
        
        # Handle the case where architecture is a dict instead of a list
        if isinstance(architecture, dict):
            components = []
            if "components" in architecture:
                components = architecture["components"]
            elif "files" in architecture:
                components = architecture["files"]
            else:
                # Try to extract components from dict structure
                for name, details in architecture.items():
                    if isinstance(details, dict):
                        components.append({"name": name, **details})
        else:
            components = architecture
        
        # Get codebase
        codebase = state.get("codebase", {})
        
        # Find files that haven't been generated yet
        remaining_files = []
        for component in components:
            if isinstance(component, dict) and "name" in component:
                name = component["name"]
                if name not in codebase:
                    remaining_files.append(component)
        
        if not remaining_files:
            print("All files generated, moving to documentation")
            return {**state, "current_file": None, "_iterations": iterations + 1}  # Explicit None
        
        # Select the next file
        next_file = remaining_files[0]["name"]
        print(f"Selected next file to generate: {next_file}")
        
        # Update the state
        return {
            **state,
            "current_file": next_file,
            "_iterations": iterations + 1  # Increment counter
        }
    except Exception as e:
        error_msg = f"Error in select_next_file: {str(e)}"
        print(error_msg)
        return {**state, "error": error_msg, "current_file": None}

def parse_code(text):
    import re
    # Find all code blocks
    code_blocks = re.findall(r'```(?:[a-z]*\n)?(.*?)```', text, re.DOTALL)
    if code_blocks:
        # Join all code blocks (if there are multiple)
        return '\n\n'.join(code_blocks)
    return text  # If no code blocks found, return the original text

def generate_file(state: CodeGenState) -> CodeGenState:
    """Generate code for the current file"""
    current_file = state.get("current_file")
    if not current_file:
        error_msg = "No file selected for generation"
        print(error_msg)
        return {**state, "error": error_msg}
    
    print(f"Generating code for: {current_file}")
    
    try:
        # Get the architecture components
        architecture = state.get("architecture", [])
        
        # Handle the case where architecture is a dict instead of a list
        if isinstance(architecture, dict):
            components = []
            if "components" in architecture:
                components = architecture["components"]
            elif "files" in architecture:
                components = architecture["files"]
            else:
                # Try to extract components from dict structure
                for name, details in architecture.items():
                    if isinstance(details, dict):
                        components.append({"name": name, **details})
        else:
            components = architecture
            
        # Find the component details
        component = None
        for comp in components:
            if isinstance(comp, dict) and "name" in comp and comp["name"] == current_file:
                component = comp
                break
                
        if not component:
            raise ValueError(f"Could not find component details for {current_file}")
        
        # Get dependencies code for context
        dependencies_code = {}
        codebase = state.get("codebase", {})
        
        if "dependencies" in component:
            for dep in component["dependencies"]:
                if dep in codebase:
                    dependencies_code[dep] = codebase[dep]
        
        # Create a prompt for this file
        file_gen_prompt = ChatPromptTemplate.from_messages([
            ("system", """
             You are an expert software developer and are tasked with generating code for a file. Make sure
             to generate the code only for the specific file you are told to generate for. Strictly output only the code."""),
            ("human", """
            Generate the code for the file: {file_path}
            
            Description: {description}
            
            Project requirements:
            {project_requirements}
            
            Dependencies:
            {dependencies}
            
            The code should follow best practices, include proper error handling, and be well-documented.
            """)
        ])
        
        dependencies_str = ""
        for dep_name, dep_code in dependencies_code.items():
            dependencies_str += f"--- {dep_name} ---\n{dep_code}\n\n"
        
        messages = [file_gen_prompt.format(
            file_path=component.get("path", component["name"]),
            description=component.get("description", "No description provided"),
            project_requirements=state["project_requirements"],
            dependencies=dependencies_str
        )]
        
        response = model.invoke(messages)
        
        # Extract code from response
        code = parse_code(response.content)
        
        # Add the generated code to the codebase
        updated_codebase = {**codebase, current_file: code}
        print(f"Successfully generated code for {current_file}")
        
        return {
            **state,
            "codebase": updated_codebase,
            "current_file": None,  # Reset current file
        }
    except Exception as e:
        error_msg = f"Error generating {current_file}: {str(e)}"
        print(error_msg)
        return {**state, "error": error_msg, "current_file": None}

# Node for code review
def review_code(state: CodeGenState) -> CodeGenState:
    """Review the code for quality and potential issues"""
    current_file = state.get("current_file")
    if not current_file or current_file not in state.get("codebase", {}):
        return state  # Skip to next step
    
    try:
        code = state["codebase"][current_file]
        
        review_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert code reviewer. Review the code for quality, security issues, and adherence to best practices."),
            ("human", """
            Review the following code for {file_name}:
            
            ```
            {code}
            ```
            
            Project requirements:
            {project_requirements}
            
            Provide a detailed review focusing on:
            1. Code quality and readability
            2. Security vulnerabilities
            3. Performance issues
            4. Adherence to best practices
            5. Suggestions for improvement
            """)
        ])
        
        messages = [review_prompt.format(
            file_name=current_file,
            code=code,
            project_requirements=state["project_requirements"]
        )]
        
        response = model.invoke(messages)
        
        # Store the review
        code_reviews = {**state.get("code_reviews", {}), current_file: response.content}
        
        return {
            **state,
            "code_reviews": code_reviews,
        }
    except Exception as e:
        error_msg = f"Error in code review for {current_file}: {str(e)}"
        print(error_msg)
        return {
            **state, 
            "error": error_msg
        }

# Node for applying code improvements
def improve_code(state: CodeGenState) -> CodeGenState:
    """Apply improvements based on code review"""
    current_file = state.get("current_file")
    if not current_file or current_file not in state.get("codebase", {}):
        return state  # Skip to next step
    
    # Check if we have a review for this file
    if current_file not in state.get("code_reviews", {}):
        return state  # Skip to next step
    
    try:
        code = state["codebase"][current_file]
        review = state["code_reviews"][current_file]
        
        improvement_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert software developer. Improve the code based on the review."),
            ("human", """
            Original code for {file_name}:
            
            ```
            {code}
            ```
            
            Code review feedback:
            {review}
            
            Please improve the code based on the review feedback.
            Maintain the same functionality while addressing the issues raised.
            Return the improved code only, without explanations.
            """)
        ])
        
        messages = [improvement_prompt.format(
            file_name=current_file,
            code=code,
            review=review
        )]
        
        response = model.invoke(messages)
        
        # Extract improved code, handling potential markdown code blocks
        improved_code = response.content
        if improved_code.startswith("```") and improved_code.endswith("```"):
            # Remove markdown code blocks if present
            lines = improved_code.split("\n")
            if len(lines) > 2:
                improved_code = "\n".join(lines[1:-1])
        
        # Update the codebase with improved code
        updated_codebase = {**state["codebase"], current_file: improved_code}
        
        return {
            **state,
            "codebase": updated_codebase,
        }
    except Exception as e:
        error_msg = f"Error improving code for {current_file}: {str(e)}"
        print(error_msg)
        return {
            **state, 
            "error": error_msg
        }

# Node for creating tests
def generate_tests(state: CodeGenState) -> CodeGenState:
    """Generate tests for the current file"""
    current_file = state.get("current_file")
    if not current_file or current_file not in state.get("codebase", {}):
        return state  # Skip to next step
    
    # Skip test generation for certain files
    if current_file.startswith("test_") or current_file.endswith(".md"):
        return state  # Skip to next step
    
    try:
        code = state["codebase"][current_file]
        
        test_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert test engineer. Create comprehensive tests for the given code."),
            ("human", """
            Create tests for the following code in {file_name}:
            
            ```
            {code}
            ```
            
            Generate appropriate unit tests that cover the main functionality.
            Include edge cases and error conditions.
            The tests should follow best practices for the language and framework used.
            """)
        ])
        
        messages = [test_prompt.format(
            file_name=current_file,
            code=code
        )]
        
        response = model.invoke(messages)
        
        # Extract test code
        test_code = response.content
        
        # Generate a unique test filename
        base_name = os.path.splitext(current_file)[0]
        ext = os.path.splitext(current_file)[1]
        test_filename = f"test_{base_name}{ext}"
        
        # Add the test to the codebase
        updated_codebase = {**state["codebase"], test_filename: test_code}
        
        # Mark this file as having tests
        test_results = {**state.get("test_results", {}), current_file: True}
        
        return {
            **state,
            "codebase": updated_codebase,
            "test_results": test_results,
            "current_file": None  # Reset current file to avoid loops
        }
    except Exception as e:
        error_msg = f"Error generating tests for {current_file}: {str(e)}"
        print(error_msg)
        return {
            **state, 
            "error": error_msg,
            "current_file": None  # Reset current file even on error
        }

# Node for generating documentation
def generate_documentation(state: CodeGenState) -> CodeGenState:
    """Generate documentation for the project"""
    if not state.get("codebase"):
        return state  # Skip if no code
    
    try:
        # Generate documentation for each file
        file_docs = {}
        for filename, code in state["codebase"].items():
            # Skip test files and existing documentation
            if filename.startswith("test_") or filename.endswith(".md"):
                continue
            
            components = state["architecture"]['components']
            for component in components:
                if component['name'] == filename:
                    if component['create_documentation'] == False:
                        continue
                
            doc_prompt = ChatPromptTemplate.from_messages([
                ("system", "You are a technical documentation expert."),
                ("human", """
                Generate documentation for the following code:
                
                ```
                {code}
                ```
                
                Explain the purpose, usage, and important functions/classes.
                Focus on the API and how to use this component within the project.
                Keep it concise.
                """)
            ])
            
            messages = [doc_prompt.format(code=code)]
            response = model.invoke(messages)
            
            doc_filename = f"{os.path.splitext(filename)[0]}.md"
            file_docs[doc_filename] = response.content
        
        # Generate a README.md
        readme_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a technical documentation expert."),
            ("human", """
            Create a README.md for a project with the following requirements:
            
            {project_requirements}
            
            The project includes the following files:
            {file_list}
            
            Include:
            1. Project overview
            2. Installation instructions
            3. Usage examples
            4. Project structure
            5. API documentation
            6. Contributing guidelines
            """)
        ])
        
        # Get a list of main files (not tests)
        main_files = [filename for filename in state["codebase"] 
                      if not filename.startswith("test_")]
        
        file_list = "\n".join([f"- {filename}" for filename in main_files])
        
        messages = [readme_prompt.format(
            project_requirements=state["project_requirements"],
            file_list=file_list
        )]
        
        response = model.invoke(messages)
        
        # Add README to documentation
        file_docs["README.md"] = response.content
        
        # Generate API documentation
        api_doc_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a technical documentation expert."),
            ("human", """
            Create comprehensive API documentation for a project with the following requirements:
            
            {project_requirements}
            
            Based on the following files:
            {file_list}
            
            Generate a detailed API.md that documents:
            1. All endpoints/functions
            2. Parameters and return values
            3. Authentication requirements
            4. Example requests and responses
            """)
        ])
        
        messages = [api_doc_prompt.format(
            project_requirements=state["project_requirements"],
            file_list=file_list
        )]
        
        response = model.invoke(messages)
        
        # Add API docs
        file_docs["API.md"] = response.content
        
        return {
            **state,
            "documentation": file_docs,
        }
    except Exception as e:
        error_msg = f"Error generating documentation: {str(e)}"
        print(error_msg)
        return {
            **state, 
            "error": error_msg
        }

# Error handler node
def handle_error(state: CodeGenState) -> CodeGenState:
    """Handle errors in the workflow"""
    error_message = state.get("error", "An unknown error occurred.")
    print(f"Error encountered: {error_message}")
    # In a real application, you might want to log the error, notify someone, etc.
    return state

# Function to check for errors
def check_for_error(state):
    if state.get("error"):
        return "error"
    return "next"

# Improved function to determine where to go after select_next_file
def route_from_select_next_file(state):
    if state.get("error"):
        return "error"
    
    # Instead of checking current_file, check if there are actually remaining files
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
    
    # Check remaining files
    remaining_files = False
    for component in components:
        if isinstance(component, dict) and "name" in component:
            name = component["name"]
            if name not in codebase:
                remaining_files = True
                break
    
    if remaining_files:
        return "generate_file"
    else:
        return "generate_documentation"