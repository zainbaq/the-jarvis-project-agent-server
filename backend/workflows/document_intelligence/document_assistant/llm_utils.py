from typing import Dict, List, Any, Optional
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from backend.tools.llm import get_llm
from .models import TaskRequirement, ExecutionPlan, PlanStep, DocumentInfo

def create_llm(provider: str = "openai", api_key: str = None, model_name: str = "gpt-4o", temperature: float = 0.2, max_tokens: int = None):
    """Create and return a configured LLM instance."""
    return get_llm(provider, api_key, model_name, temperature, max_tokens)

def create_structured_llm(output_class, provider: str = "openai", api_key: str = None, model_name: str = "gpt-4o", temperature: float = 0.2, max_tokens: int = None):
    """Create an LLM with structured output."""
    llm = get_llm(provider, api_key, model_name, temperature, max_tokens)
    return llm.with_structured_output(output_class, method='function_calling')

def analyze_user_requirements(llm, user_input: str) -> TaskRequirement:
    """
    Analyze the user input to determine task requirements.
    
    Args:
        llm: The language model to use
        user_input: The user's input text
        
    Returns:
        A TaskRequirement object with the parsed requirements
    """
    prompt = f"""
    Analyze the following user request and determine the type of document processing task required:
    
    USER REQUEST: {user_input}
    
    Classify the request into one of the following task types:
    - summarization
    - extraction
    - question_answering
    - comparison
    - analysis
    
    Also determine the required output format (e.g., text, bullet points, JSON, table, etc.).
    
    Provide your analysis as a JSON with the following structure:
    {{
        "task_type": "one of the task types listed above",
        "output_format": "determined output format",
        "specific_requirements": {{
            "key_points": ["list of specific information to focus on"],
            "other_relevant_keys": "other relevant values"
        }}
    }}
    
    Return only the JSON and nothing else. Do not wrap the JSON in markdown code blocks.
    """
    
    # Use the LLM to analyze the requirements
    response = llm.invoke(prompt)
    
    try:
        # Try to parse the response
        import json
        import re
        
        response_text = response.content.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```") and response_text.endswith("```"):
            # Extract JSON from code block
            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
            if match:
                response_text = match.group(1).strip()
        
        # Handle cases where there might be extra text
        json_pattern = r'({[\s\S]*})'
        match = re.search(json_pattern, response_text)
        if match:
            response_text = match.group(1)
            
        # Parse the JSON
        analysis = json.loads(response_text)
        
        # Ensure specific_requirements is a dictionary, not a string
        if isinstance(analysis.get("specific_requirements"), str):
            analysis["specific_requirements"] = {"description": analysis["specific_requirements"]}
        elif analysis.get("specific_requirements") is None:
            analysis["specific_requirements"] = {}
            
        # Create and return the TaskRequirement object
        return TaskRequirement(**analysis)
    except Exception as e:
        # If JSON parsing fails, create a basic TaskRequirement with default values
        print(f"Error parsing LLM response: {str(e)}")
        print(f"Raw response: {response.content}")
        
        # Create a fallback TaskRequirement
        task_type = "analysis"  # default to analysis
        output_format = "text"  # default to text
        
        # Try to extract task_type and output_format if possible
        try:
            if "summarization" in response.content.lower():
                task_type = "summarization"
            elif "extraction" in response.content.lower():
                task_type = "extraction"
            elif "question" in response.content.lower():
                task_type = "question_answering"
            elif "comparison" in response.content.lower():
                task_type = "comparison"
                
            if "json" in response.content.lower():
                output_format = "json"
            elif "table" in response.content.lower():
                output_format = "table"
            elif "bullet" in response.content.lower():
                output_format = "bullet_points"
        except:
            pass
            
        return TaskRequirement(
            task_type=task_type,
            output_format=output_format,
            specific_requirements={}  # Empty dictionary as fallback
        )
    
def summarize_document(llm, document_text: str, max_length: int = 1000) -> str:
    """
    Summarize a document to extract key information.
    
    Args:
        llm: The LLM instance
        document_text: The text content of the document
        max_length: Maximum length of summary in characters
        
    Returns:
        A summary of the document
    """
    # For very long documents, chunk and summarize in parts
    if len(document_text) > 20000:
        return summarize_long_document(llm, document_text, max_length)
    
    prompt = f"""
    Summarize the following document content:
    
    {document_text}
    
    Create a comprehensive summary that captures the key information, definitions, facts, and statistics.
    This summary will be used as context for later processing, so retain important details.
    """
    
    response = llm.invoke(prompt)
    return response.content

def summarize_long_document(llm, document_text: str, max_length: int = 1000) -> str:
    """Summarize a long document by chunking and hierarchical summarization."""
    # Split into manageable chunks (approximately 10k characters each)
    chunk_size = 10000
    chunks = [document_text[i:i+chunk_size] for i in range(0, len(document_text), chunk_size)]
    
    # Summarize each chunk
    chunk_summaries = []
    for i, chunk in enumerate(chunks):
        prompt = f"""
        Summarize the following section (part {i+1} of {len(chunks)}) of a document:
        
        {chunk}
        
        Provide a concise summary that captures the key information and important details.
        """
        response = llm.invoke(prompt)
        chunk_summaries.append(response.content)
    
    # Combine the chunk summaries and create a final summary
    combined_summaries = "\n\n".join(chunk_summaries)
    final_prompt = f"""
    Create a comprehensive final summary from these section summaries of a document:
    
    {combined_summaries}
    
    Create a coherent summary that captures the key information, definitions, facts, and statistics 
    from across the entire document. This will be used as context for later processing.
    """
    
    response = llm.invoke(final_prompt)
    return response.content

def create_execution_plan(llm, task_requirements: TaskRequirement, documents: List[DocumentInfo]) -> ExecutionPlan:
    """
    Create an execution plan for the document processing task.
    
    Args:
        llm: The language model to use
        task_requirements: The task requirements
        documents: The available documents
        
    Returns:
        An ExecutionPlan object with the steps to execute
    """
    # Create a document summary for the prompt
    doc_summaries = []
    for i, doc in enumerate(documents):
        summary = f"Document {i}: {doc.file_path} ({len(doc.content)} chars)"
        doc_summaries.append(summary)
    
    doc_summary_text = "\n".join(doc_summaries)
    
    prompt = f"""
    Create a detailed execution plan for the following document processing task:
    
    TASK TYPE: {task_requirements.task_type}
    OUTPUT FORMAT: {task_requirements.output_format}
    SPECIFIC REQUIREMENTS: {task_requirements.specific_requirements}
    
    AVAILABLE DOCUMENTS:
    {doc_summary_text}
    
    Create a step-by-step execution plan that will accomplish this task effectively.
    Each step should include:
    1. A clear description of the action to perform
    2. The tool to use (choose from: document_analyzer, information_extractor, content_generator, comparison_tool)
    3. The input parameters required
    
    IMPORTANT: For document_id parameters, use NUMERIC indices (0, 1, 2, etc.) that correspond to the document numbers above, NOT the file paths.
    
    Format your response as a JSON array of steps, where each step has the following structure:
    {{
        "step_id": 0,
        "description": "detailed description of the step",
        "tool": "one of the tools mentioned above",
        "input_parameters": {{
            "param1": "value1",
            "param2": "value2"
        }}
    }}
    
    Return only the JSON array and nothing else.
    """
    
    try:
        # Use the LLM to create the execution plan
        response = llm.invoke(prompt)
        
        # Parse the response
        import json
        import re
        
        # Try to extract JSON from the response if it's not cleanly formatted
        response_text = response.content.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```") and response_text.endswith("```"):
            # Extract JSON from code block
            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
            if match:
                response_text = match.group(1).strip()
                
        # Look for an array pattern
        json_match = re.search(r'\[\s*\{.*\}\s*\]', response_text, re.DOTALL)
        
        if json_match:
            json_text = json_match.group(0)
        else:
            json_text = response_text
            
        try:
            # Try to parse the JSON
            steps_data = json.loads(json_text)
            
            # Validate and convert each step
            validated_steps = []
            for i, step_data in enumerate(steps_data):
                # Ensure step_id is an integer
                if "step_id" not in step_data or not isinstance(step_data["step_id"], int):
                    step_data["step_id"] = i
                
                # Ensure all required fields are present
                if "description" not in step_data:
                    step_data["description"] = f"Step {i}"
                
                if "tool" not in step_data:
                    # Assign a default tool based on step position
                    if i == 0:
                        step_data["tool"] = "document_analyzer"
                    elif i == len(steps_data) - 1:
                        step_data["tool"] = "content_generator"
                    else:
                        step_data["tool"] = "information_extractor"
                
                if "input_parameters" not in step_data or not isinstance(step_data["input_parameters"], dict):
                    step_data["input_parameters"] = {"document_id": 0}
                
                # Fix document_id parameters - ensure they are integers, not file paths
                if "document_id" in step_data["input_parameters"]:
                    doc_id = step_data["input_parameters"]["document_id"]
                    
                    # If it's a string that could be an integer, convert it
                    if isinstance(doc_id, str) and doc_id.isdigit():
                        step_data["input_parameters"]["document_id"] = int(doc_id)
                    # If it's a file path, try to find its index
                    elif isinstance(doc_id, str):
                        # Look for a document with matching file_path
                        found = False
                        for j, doc in enumerate(documents):
                            if doc.file_path == doc_id or doc_id in doc.file_path:
                                step_data["input_parameters"]["document_id"] = j
                                found = True
                                break
                        
                        # If not found, default to first document
                        if not found:
                            step_data["input_parameters"]["document_id"] = 0
                
                # Handle document_ids array similarly
                if "document_ids" in step_data["input_parameters"]:
                    doc_ids = step_data["input_parameters"]["document_ids"]
                    fixed_ids = []
                    
                    for doc_id in doc_ids:
                        # If it's a string that could be an integer, convert it
                        if isinstance(doc_id, str) and doc_id.isdigit():
                            fixed_ids.append(int(doc_id))
                        # If it's a file path, try to find its index
                        elif isinstance(doc_id, str):
                            # Look for a document with matching file_path
                            found = False
                            for j, doc in enumerate(documents):
                                if doc.file_path == doc_id or doc_id in doc.file_path:
                                    fixed_ids.append(j)
                                    found = True
                                    break
                            
                            # If not found, skip this ID
                            if not found:
                                print(f"Warning: Document with ID '{doc_id}' not found")
                        else:
                            fixed_ids.append(doc_id)  # Keep as is if already an int
                    
                    step_data["input_parameters"]["document_ids"] = fixed_ids
                
                # Create a PlanStep object
                validated_step = PlanStep(
                    step_id=step_data["step_id"],
                    description=step_data["description"],
                    tool=step_data["tool"],
                    input_parameters=step_data["input_parameters"]
                )
                
                validated_steps.append(validated_step)
            
            # Create and return the ExecutionPlan
            return ExecutionPlan(steps=validated_steps)
            
        except json.JSONDecodeError as json_error:
            print(f"Error parsing execution plan JSON: {str(json_error)}")
            print(f"Raw JSON text: {json_text}")
            
            # Create a fallback plan
            fallback_steps = [
                PlanStep(
                    step_id=0,
                    description=f"Analyze document content for {task_requirements.task_type}",
                    tool="document_analyzer",
                    input_parameters={"document_id": 0}
                ),
                PlanStep(
                    step_id=1,
                    description=f"Generate {task_requirements.output_format} output based on analysis",
                    tool="content_generator",
                    input_parameters={"format": task_requirements.output_format}
                )
            ]
            
            return ExecutionPlan(steps=fallback_steps)
    
    except Exception as e:
        print(f"Error creating execution plan: {str(e)}")
        
        # Create a fallback plan on any error
        fallback_steps = [
            PlanStep(
                step_id=0,
                description=f"Analyze document content",
                tool="document_analyzer",
                input_parameters={"document_id": 0}
            ),
            PlanStep(
                step_id=1,
                description=f"Generate output based on analysis",
                tool="content_generator",
                input_parameters={"format": task_requirements.output_format}
            )
        ]
        
        return ExecutionPlan(steps=fallback_steps)

def execute_analysis_step(llm, step: PlanStep, context: Dict[str, Any]) -> Any:
    """
    Execute a document analysis step using the LLM.
    
    Args:
        llm: The LLM instance
        step: The current step to execute
        context: The current context including documents and working memory
        
    Returns:
        The result of executing the step
    """
    # Extract documents and other context needed for the step
    documents = context.get("documents", [])
    working_memory = context.get("working_memory", {})
    
    # Construct a prompt based on the step type and parameters
    prompt = f"""
    Execute the following document analysis step:
    
    STEP: {step.description}
    TOOL: {step.tool}
    PARAMETERS: {step.input_parameters}
    
    Document context available:
    """
    
    # Add relevant document content based on the parameters
    doc_ids = step.input_parameters.get("document_ids", [])
    if doc_ids:
        for doc_id in doc_ids:
            if doc_id < len(documents):
                doc = documents[doc_id]
                prompt += f"\n--- Document: {doc.file_path} ---\n{doc.content[:5000]}...\n"
    
    # Add any relevant working memory
    prompt += "\nCurrent working context:\n"
    for key, value in working_memory.items():
        prompt += f"- {key}: {value}\n"
    
    # Add specific instructions based on the tool
    if step.tool == "compare_documents":
        prompt += "\nCompare these documents focusing on their similarities and differences. Provide a structured analysis."
    elif step.tool == "extract_information":
        entities = step.input_parameters.get("entities", [])
        prompt += f"\nExtract the following information: {', '.join(entities)}"
    elif step.tool == "summarize_documents":
        prompt += "\nCreate a comprehensive summary that combines information from all documents."
    elif step.tool == "analyze_document":
        aspects = step.input_parameters.get("aspects", [])
        prompt += f"\nAnalyze the document focusing on these aspects: {', '.join(aspects)}"
    
    # Execute the prompt
    response = llm.invoke(prompt)
    return response.content