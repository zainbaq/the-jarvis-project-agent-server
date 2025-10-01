from typing import Literal, Dict, Any
from langgraph.graph import StateGraph, END, START
from .models import AgentState, TaskRequirement, ExecutionPlan, PlanStep, DocumentInfo
from .llm_utils import (
    create_llm,
    analyze_user_requirements,
    create_execution_plan,
)
from .evaluator import evaluate_output, should_revise_or_complete, revise_output
from .tools import load_documents
from .vector_store import vector_store  # Import the vector store
import os


def parse_requirements(state: AgentState, llm) -> AgentState:
    """Parse the user's requirements and determine the task type."""
    try:
        print(f"Parsing requirements for input: {state.user_input}")
        
        # Check if user input exists
        if not state.user_input or not state.user_input.strip():
            return state.update(
                error="Cannot parse requirements: user input is empty",
                status="error"
            )
            
        # Analyze the user input to determine requirements
        try:
            task_requirements = analyze_user_requirements(llm, state.user_input)
        except Exception as e:
            print(f"Error in analyze_user_requirements: {str(e)}")
            # Create a fallback TaskRequirement
            task_requirements = TaskRequirement(
                task_type="analysis",
                output_format="text",
                specific_requirements={"fallback": True, "original_request": state.user_input}
            )
        
        print(f"Parsed task type: {task_requirements.task_type}")
        print(f"Output format: {task_requirements.output_format}")
        
        return state.update(
            task_requirements=task_requirements,
            status="requirements_parsed"
        )
    except Exception as e:
        print(f"Error parsing requirements: {str(e)}")
        return state.update(
            error=f"Error parsing requirements: {str(e)}",
            status="error"
        )
        
# Load and process documents
def load_process_documents(state: AgentState, llm, documents_dir: str = None, file_paths: list = None) -> AgentState:
    """
    Load and process documents either from a directory or from provided file paths.
    
    Args:
        state: Current state
        llm: Language model
        documents_dir: Directory containing documents (optional)
        file_paths: List of file paths (optional)
        
    Returns:
        Updated state
    """
    try:
        # Clear the vector store at the beginning of a new task
        vector_store.clear()
        
        documents = []
        
        # Process from directory if provided
        if documents_dir and os.path.exists(documents_dir):
            print(f"Loading documents from directory: {documents_dir}")
            documents = load_documents(documents_dir, llm)
            
        # Process specific file paths if provided
        elif file_paths:
            print(f"Loading {len(file_paths)} document(s) from provided paths")
            for file_path in file_paths:
                if os.path.exists(file_path):
                    # Load single document
                    docs = load_documents(os.path.dirname(file_path), llm, [os.path.basename(file_path)])
                    if docs:
                        documents.extend(docs)
                else:
                    print(f"Warning: File not found - {file_path}")
        
        if not documents:
            print("No documents found or provided")
            return state.update(
                error=f"No documents found or provided",
                status="error"
            )
            
        print(f"Successfully loaded {len(documents)} documents")
        for doc in documents:
            print(f"  - {doc.file_path} ({len(doc.content)} chars)")
            
            # Add document to vector store
            vector_store.add_document(
                doc.content,
                {"file_path": doc.file_path, "document_id": doc.file_path}
            )
        
        return state.update(
            documents=documents,
            status="documents_loaded"
        )
    except Exception as e:
        print(f"Error loading documents: {str(e)}")
        return state.update(
            error=f"Error loading documents: {str(e)}",
            status="error"
        )

# Create execution plan
def create_plan(state: AgentState, llm) -> AgentState:
    """Create a plan for executing the task based on requirements and available documents."""
    try:
        # Check if task_requirements exists
        if state.task_requirements is None:
            return state.update(
                error="Cannot create plan: task requirements are missing",
                status="error"
            )
            
        # Check if documents are loaded
        if not state.documents:
            return state.update(
                error="Cannot create plan: no documents available",
                status="error"
            )
            
        # Create an execution plan
        try:
            execution_plan = create_execution_plan(
                llm, 
                state.task_requirements, 
                state.documents
            )
            print('Created execution plan...')
            print(f"Execution plan steps: {execution_plan.steps}")
            
            # Validate that the execution plan has steps
            if not execution_plan.steps or len(execution_plan.steps) == 0:
                # Create a fallback execution plan with basic steps
                fallback_steps = [
                    PlanStep(
                        step_id=0,
                        description="Extract relevant information from the document",
                        tool="document_analyzer",
                        input_parameters={"document_id": 0}
                    ),
                    PlanStep(
                        step_id=1,
                        description=f"Generate {state.task_requirements.output_format} output based on extracted information",
                        tool="content_generator",
                        input_parameters={"format": state.task_requirements.output_format}
                    )
                ]
                execution_plan = ExecutionPlan(steps=fallback_steps)
                print("Created fallback execution plan due to missing steps")
            
            return state.update(
                execution_plan=execution_plan,
                status="plan_created"
            )
        except Exception as plan_error:
            print(f"Error in create_execution_plan: {str(plan_error)}")
            # Create a fallback execution plan
            fallback_steps = [
                PlanStep(
                    step_id=0,
                    description=f"Analyze document content for {state.task_requirements.task_type}",
                    tool="document_analyzer",
                    input_parameters={"document_id": 0}
                ),
                PlanStep(
                    step_id=1,
                    description=f"Generate {state.task_requirements.output_format} output based on analysis",
                    tool="content_generator",
                    input_parameters={"format": state.task_requirements.output_format}
                )
            ]
            fallback_plan = ExecutionPlan(steps=fallback_steps)
            
            return state.update(
                execution_plan=fallback_plan,
                status="plan_created"
            )
    except Exception as e:
        print(f"Error creating execution plan: {str(e)}")
        return state.update(
            error=f"Error creating execution plan: {str(e)}",
            status="error"
        )

# Execute current step using dynamic capabilities and vector store
def execute_step(state: AgentState, llm) -> AgentState:
    """
    Execute the current step in the execution plan using dynamic capabilities.
    Now enhanced with vector store retrieval for more relevant context.
    """
    try:
        # Check if execution_plan exists
        if state.execution_plan is None:
            return state.update(
                error="Cannot execute step: execution plan is missing",
                status="error"
            )
            
        # Get the current step
        current_step_index = state.execution_plan.current_step_index
        
        # Check if we've completed all steps
        if current_step_index >= len(state.execution_plan.steps):
            # All steps completed
            return state.update(
                status="plan_completed"
            )
                
        current_step = state.execution_plan.steps[current_step_index]

        print(f"Executing step: {current_step.description}")
        
        # Create a prompt for executing the step dynamically
        prompt = f"""
        You are executing a step in a document processing task. Your task is to complete the following step:
        
        STEP DESCRIPTION: {current_step.description}
        TOOL: {current_step.tool}
        PARAMETERS: {current_step.input_parameters}
        
        Available context:
        - Documents: {[doc.file_path for doc in state.documents]}
        - Previous results: {list(state.working_memory.keys()) if state.working_memory else "None"}
        
        Based on the step description and available context, execute this step and provide the result.
        Be thorough and precise in your execution, following the exact requirements of the step.
        Provide your result in a structured format appropriate for the step type.
        """
        
        # For document analysis steps, use vector store to get relevant chunks
        if current_step.tool == "document_analyzer" or current_step.input_parameters.get("document_id") is not None:
            doc_id_param = current_step.input_parameters.get("document_id")
            document_content = None
            document_path = None
            
            # Handle the case when document_id is a string (file path)
            if isinstance(doc_id_param, str):
                # Find the document with matching file_path
                for doc in state.documents:
                    if doc.file_path == doc_id_param:
                        document_content = doc.content
                        document_path = doc.file_path
                        break
            # Handle the case when document_id is an integer (index)
            elif isinstance(doc_id_param, int) and 0 <= doc_id_param < len(state.documents):
                document_content = state.documents[doc_id_param].content
                document_path = state.documents[doc_id_param].file_path
            
            # If we have a document path, use vector store to get relevant chunks
            if document_path:
                # Create a query from the step description to find relevant chunks
                query = f"{state.task_requirements.task_type} {current_step.description}"
                relevant_chunks = vector_store.search_by_document(query, document_path, k=5)
                
                if relevant_chunks:
                    prompt += "\n\nRelevant document chunks for this step:\n"
                    for i, chunk in enumerate(relevant_chunks):
                        prompt += f"\n--- Chunk {i+1} ---\n{chunk['content']}\n"
                else:
                    # If no chunks found, provide some of the document content directly
                    if document_content:
                        # Limit content length to avoid token limits
                        content_preview = document_content[:5000] + ("..." if len(document_content) > 5000 else "")
                        prompt += f"\n\nDocument content:\n{content_preview}\n"
        
        # For steps that need multiple documents, use vector store for relevant chunks across docs
        elif current_step.tool == "information_extractor" or current_step.input_parameters.get("document_ids") is not None:
            # Create a query from the task and step description
            query = f"{state.task_requirements.task_type} {current_step.description}"
            
            # Search across all documents in the vector store
            relevant_chunks = vector_store.search(query, k=10)
            
            if relevant_chunks:
                prompt += "\n\nRelevant document chunks for this step:\n"
                for i, chunk in enumerate(relevant_chunks):
                    doc_path = chunk['metadata'].get('file_path', 'Unknown document')
                    prompt += f"\n--- Chunk {i+1} from {doc_path} ---\n{chunk['content']}\n"
        
        print(f"Prompt for LLM:\n{prompt}")
        
        # Execute the step using the LLM
        response = llm.invoke(prompt)
        result = response.content
        
        print(f"Step result: {result}")
        
        # Create a new PlanStep with just the essential fields to avoid duplication
        updated_step = PlanStep(
            step_id=current_step.step_id,
            description=current_step.description,
            tool=current_step.tool,
            input_parameters=current_step.input_parameters,
            is_completed=True,
            output=result
        )
        
        # Update the steps list
        updated_steps = state.execution_plan.steps.copy()
        updated_steps[current_step_index] = updated_step
        
        # Create updated working memory
        updated_working_memory = state.working_memory.copy()
        updated_working_memory[f"step_{current_step_index}_result"] = result
        
        # Create updated execution plan
        updated_execution_plan = ExecutionPlan(
            steps=updated_steps,
            current_step_index=current_step_index + 1
        )
        
        # Update the state using the update method
        return state.update(
            execution_plan=updated_execution_plan,
            working_memory=updated_working_memory,
            status="step_executed"
        )
            
    except Exception as e:
        step_index = "unknown"
        try:
            if state.execution_plan is not None:
                step_index = str(state.execution_plan.current_step_index)
        except:
            pass
            
        return state.update(
            error=f"Error executing step {step_index}: {str(e)}",
            status="error"
        )

# Generate final output using vector search for better context
def generate_final_output(state: AgentState, llm) -> Dict[str, Any]:
    """Generate the final output based on the execution results and using vector search for additional context."""
    try:
        # Extract all results from working memory
        results = state.get("working_memory", {})
        
        # Get task requirements 
        task_requirements = state.get("task_requirements", None)
        if task_requirements is None:
            print("WARNING: task_requirements missing, using defaults")
            task_type = "analysis"
            output_format = "text"
        else:
            task_type = task_requirements.task_type
            output_format = task_requirements.output_format
            
        # Use vector search to get the most relevant chunks for the final output generation
        query = f"{state.get('user_input', '')} {task_type} {output_format}"
        
        try:
            relevant_chunks = vector_store.search(query, k=7)
            
            # Format the chunks with source information
            relevant_context = ""
            for i, chunk in enumerate(relevant_chunks):
                doc_path = chunk['metadata'].get('file_path', 'Unknown document')
                relevant_context += f"Chunk {i+1} from {doc_path}:\n{chunk['content']}\n\n"
        except Exception as search_error:
            print(f"Warning: Vector search failed: {str(search_error)}")
            relevant_context = "Vector search failed, proceeding with available context."
        
        # Create a prompt for generating the final output
        prompt = f"""
        Generate a comprehensive final output for the following document processing task:
        
        ORIGINAL REQUEST: {state.get('user_input', 'Analyze the document')}
        TASK TYPE: {task_type}
        OUTPUT FORMAT: {output_format}
        
        Here are the results from executing the plan:
        {results}
        
        Here are the most relevant document chunks for this task:
        {relevant_context}
        
        Create a final output that fulfills the user's request completely.
        Structure the output according to the required format: {output_format}.
        Ensure the output is comprehensive, accurate, and directly addresses the original request.
        
        IMPORTANT INSTRUCTIONS:
        - If the output format is JSON, provide valid, properly formatted JSON without any markdown delimiters or explanation text
        - If the output requires a specific structure, follow it strictly
        - Make the output concise and focused on the requested information only
        - Remove any metadata, notes, or explanations that aren't part of the requested output
        - Include proper attribution to source documents when appropriate
        """
        
        # Generate the final output
        response = llm.invoke(prompt)
        output = response.content
        
        # If the output format is JSON, try to clean it up
        if output_format.lower() == "json":
            import json
            import re
            
            # Try to extract JSON if wrapped in markdown code blocks
            if "```" in output:
                json_block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', output)
                if json_block_match:
                    json_content = json_block_match.group(1).strip()
                    
                    # Validate the JSON by parsing and re-serializing it
                    try:
                        parsed_json = json.loads(json_content)
                        # If we got here, the JSON is valid, so just use the extracted content
                        output = json_content
                    except json.JSONDecodeError:
                        # If parsing fails, keep the original output
                        pass
        
        # For debugging: Print the output to server logs
        print(f"Generated final output: {output[:200]}...")  # Print first 200 chars
        
        # Clear the vector store after completing the task
        vector_store.clear()
        
        # Update the state as a dictionary - this is key for preserving the data
        # Instead of using state.update() which doesn't work with AddableValuesDict
        result_state = dict(state)  # Convert state to dict
        result_state["final_output"] = output
        result_state["status"] = "completed"
        
        return result_state
        
    except Exception as e:
        print(f"Error generating final output: {str(e)}")
        result_state = dict(state)  # Convert state to dict
        result_state["error"] = f"Error generating final output: {str(e)}"
        result_state["status"] = "error"
        return result_state
    
# Decision point after executing a step
def should_continue_execution(state: AgentState) -> Literal["execute_step", "generate_final_output", "error"]:
    """Determine the next step after executing a plan step."""
    print(f"Checking next step with state status: {state.status}")
    
    # Handle error states
    if state.status == "error":
        print("Detected error state, ending workflow")
        return "error"
    
    # Handle plan completion
    if state.status == "plan_completed":
        print("Plan completed, generating final output")
        return "generate_final_output"
    
    # Check if execution_plan exists and has steps
    if state.execution_plan is None:
        print("Error: execution_plan is None")
        return "error"
    
    # Check if we've reached the end of the steps
    if state.execution_plan.current_step_index >= len(state.execution_plan.steps):
        print("Reached end of execution plan steps, generating final output")
        return "generate_final_output"
    
    # Continue executing steps
    print(f"Continuing execution with step {state.execution_plan.current_step_index + 1}")
    return "execute_step"

def create_document_agent(provider: str = "openai", api_key: str = None, model_name: str = "gpt-4o", documents_dir: str = None, file_paths: list = None, temperature: float = 0.2, max_tokens: int = None, return_workflow=False):
    """
    Create and configure the document intelligence agent.
    
    Args:
        provider: The LLM provider ("openai" or "anthropic")
        api_key: API key for the chosen provider
        model_name: The LLM model to use
        documents_dir: Directory containing the documents to process (optional)
        file_paths: List of specific file paths to process (optional)
        return_workflow: Whether to return the workflow or the compiled agent
        
    Returns:
        The configured LangGraph agent
    """
    # Initialize the LLM
    llm = create_llm(provider=provider, api_key=api_key, model_name=model_name, temperature=temperature, max_tokens=max_tokens)
    
    # Create partial functions with the llm already bound
    def parse_requirements_with_llm(state):
        return parse_requirements(state, llm)
    
    def load_process_documents_with_paths(state):
        return load_process_documents(state, llm, documents_dir, file_paths)
    
    def create_plan_with_llm(state):
        return create_plan(state, llm)
    
    def execute_step_with_llm(state):
        return execute_step(state, llm)
    
    def generate_final_output_with_llm(state):
        return generate_final_output(state, llm)
    
    # Add the evaluator functions
    def evaluate_output_with_llm(state):
        return evaluate_output(state, llm)
        
    def revise_output_with_llm(state):
        return revise_output(state, llm)
    
    # Create the LangGraph state graph
    workflow = StateGraph(AgentState)

    # Define workflow nodes
    workflow.add_node("parse_requirements", parse_requirements_with_llm)
    workflow.add_node("load_process_documents", load_process_documents_with_paths)
    workflow.add_node("create_plan", create_plan_with_llm)
    workflow.add_node("execute_step", execute_step_with_llm)
    workflow.add_node("generate_final_output", generate_final_output_with_llm)
    # Add the new evaluator nodes
    workflow.add_node("evaluate_output", evaluate_output_with_llm)
    workflow.add_node("revise_output", revise_output_with_llm)

    # Define the graph structure
    workflow.add_edge(START, "parse_requirements")
    workflow.add_edge("parse_requirements", "load_process_documents")
    workflow.add_edge("load_process_documents", "create_plan")
    workflow.add_edge("create_plan", "execute_step")

    # Add conditional edges from execute_step
    workflow.add_conditional_edges(
        "execute_step",
        should_continue_execution,
        {
            "execute_step": "execute_step",          # Continue executing steps
            "generate_final_output": "generate_final_output",  # All steps completed, generate output
            "error": END                             # End on error
        }
    )

    # After generating final output, go to evaluation instead of ending
    workflow.add_edge("generate_final_output", "evaluate_output")
    
    # Add conditional edges from evaluate_output
    workflow.add_conditional_edges(
        "evaluate_output",
        should_revise_or_complete,
        {
            "revise_output": "revise_output",  # Output needs revision
            "complete": END                     # Output meets requirements, end workflow
        }
    )
    
    # After revising output, re-evaluate it
    workflow.add_edge("revise_output", "evaluate_output")

    if return_workflow:
        return workflow
    else:
        # Create the runnable
        agent_runnable = workflow.compile()
        return agent_runnable