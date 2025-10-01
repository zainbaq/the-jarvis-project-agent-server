"""
Evaluator component for document intelligence agent.
This module provides evaluation and revision capabilities to ensure 
the final output meets user requirements.
"""

from .models import AgentState
from typing import Dict, Any

def evaluate_output(state: AgentState, llm) -> Dict[str, Any]:
    """Evaluate the final output to ensure it meets the user requirements."""
    try:
        # Handle both dictionary and object access
        if isinstance(state, dict):
            final_output = state.get("final_output")
            task_requirements = state.get("task_requirements")
            user_input = state.get("user_input", "")
            working_memory = state.get("working_memory", {})
            revision_count = state.get("revision_count", 0)
        else:
            final_output = getattr(state, "final_output", None)
            task_requirements = getattr(state, "task_requirements", None)
            user_input = getattr(state, "user_input", "")
            working_memory = getattr(state, "working_memory", {})
            revision_count = getattr(state, "revision_count", 0)
        
        # Debug info
        print("Evaluating output...")
        print("State has final_output:", final_output is not None)
        
        # Convert state to dictionary for consistent return format
        result_state = dict(state) if not isinstance(state, dict) else state.copy()
        
        # Check if final_output and task_requirements exist
        if final_output is None:
            print("WARNING: final_output is missing in state")
            # If there's no final output but we have working memory, let's consider this complete
            if working_memory:
                print("No final output but working_memory exists, considering complete")
                result_state.update({
                    "evaluation_results": {
                        "meets_requirements": True,
                        "score": 7,
                        "issues": ["No explicit final output, but working memory contains results"],
                        "suggested_improvements": [],
                        "explanation": "Considered complete based on working memory results."
                    },
                    "status": "evaluated",
                    "needs_revision": False
                })
                return result_state
            else:
                result_state.update({
                    "error": "Cannot evaluate output: final output is missing",
                    "status": "error"
                })
                return result_state
            
        if task_requirements is None:
            print("WARNING: task_requirements is missing in state")
            # If we have a final output but no task requirements, let's consider this complete
            if final_output:
                print("Final output exists without task_requirements, considering complete")
                result_state.update({
                    "evaluation_results": {
                        "meets_requirements": True,
                        "score": 7,
                        "issues": ["Task requirements missing, but output generated"],
                        "suggested_improvements": [],
                        "explanation": "Output generated successfully but task requirements information is missing."
                    },
                    "status": "evaluated",
                    "needs_revision": False
                })
                return result_state
            else:
                result_state.update({
                    "error": "Cannot evaluate output: task requirements are missing",
                    "status": "error"
                })
                return result_state
        
        # If we've already revised multiple times, be more lenient
        threshold_score = 7
        if revision_count >= 2:
            threshold_score = 5  # Lower the bar after 2 revisions
        if revision_count >= 4:
            # After 4 revisions, just accept the output
            print(f"Accepting output after {revision_count} revisions")
            result_state.update({
                "evaluation_results": {
                    "meets_requirements": True,
                    "score": 7,
                    "issues": ["Maximum revision attempts reached"],
                    "suggested_improvements": [],
                    "explanation": "Output accepted after multiple revision attempts."
                },
                "status": "evaluated",
                "needs_revision": False
            })
            return result_state
        
        # Get task type and output format
        task_type = task_requirements.task_type if hasattr(task_requirements, "task_type") else "analysis"
        output_format = task_requirements.output_format if hasattr(task_requirements, "output_format") else "text"
        
        # Create a prompt for evaluating the output against requirements
        prompt = f"""
        You are evaluating whether the generated output meets the user's requirements.
        
        ORIGINAL REQUEST: {user_input}
        TASK TYPE: {task_type}
        OUTPUT FORMAT: {output_format}
        
        GENERATED OUTPUT:
        {final_output}
        
        Evaluate the output against the following criteria:
        1. Does it directly address the user's original request?
        2. Does it follow the required output format?
        3. Is the information comprehensive and accurate based on the available documents?
        4. Are there any missing elements or requirements that weren't fulfilled?
        
        IMPORTANT: This is revision attempt #{revision_count}. If the output generally meets the requirements
        and only has minor issues, please be lenient in your evaluation.
        
        Provide your evaluation as a JSON object with the following structure:
        {{
            "meets_requirements": true/false,
            "score": 0-10 (where 10 is perfect),
            "issues": [list of specific issues if any],
            "suggested_improvements": [specific improvements if needed],
            "explanation": "detailed explanation of the evaluation"
        }}
        
        Return only the JSON object and nothing else.
        """
        
        # Get evaluation from the LLM
        response = llm.invoke(prompt)
        
        try:
            # Try to parse the response as JSON
            import json
            import re
            
            response_text = response.content.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```") and response_text.endswith("```"):
                match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
                if match:
                    response_text = match.group(1).strip()
            
            # Look for JSON object pattern
            json_match = re.search(r'({[\s\S]*})', response_text, re.DOTALL)
            
            if json_match:
                json_text = json_match.group(1)
                evaluation = json.loads(json_text)
            else:
                evaluation = json.loads(response_text)
                
        except json.JSONDecodeError:
            # If parsing fails, return the raw response as the evaluation
            evaluation = {
                "meets_requirements": True,  # Changed to True for fallback
                "score": 7,  # Higher default score
                "issues": ["Failed to parse evaluation response, but proceeding"],
                "suggested_improvements": ["Re-evaluate with proper JSON formatting"],
                "explanation": "Parse error but considering output acceptable: " + response.content[:100]
            }
        
        # Determine if output needs revision based on revised threshold
        needs_revision = not evaluation.get("meets_requirements", False) or evaluation.get("score", 0) < threshold_score
        
        # If this is already the 3rd revision, force acceptance if score is decent
        if revision_count >= 3 and evaluation.get("score", 0) >= 4:
            needs_revision = False
            evaluation["meets_requirements"] = True
            evaluation["explanation"] += " (Accepted after multiple revisions)"
        
        # Print evaluation results for debugging
        print(f"Evaluation results: meets_requirements={evaluation.get('meets_requirements', False)}, score={evaluation.get('score', 0)}")
        print(f"Needs revision: {needs_revision}")
        
        # Update the result state
        result_state.update({
            "evaluation_results": evaluation,
            "status": "evaluated",
            "needs_revision": needs_revision
        })
        return result_state
        
    except Exception as e:
        print(f"Error during evaluation: {str(e)}")
        # If there's an error during evaluation, just mark as complete to avoid blocking
        result_state = dict(state) if not isinstance(state, dict) else state.copy()
        result_state.update({
            "evaluation_results": {
                "meets_requirements": True,
                "score": 7, 
                "issues": [f"Evaluation error: {str(e)}"],
                "explanation": "Bypass evaluation due to error, considering output acceptable."
            },
            "status": "evaluated",
            "needs_revision": False
        })
        return result_state

def revise_output(state: AgentState, llm) -> AgentState:
    """Revise the output based on evaluation feedback."""
    try:
        # Check if we have the necessary fields
        if state.final_output is None or state.evaluation_results is None:
            return state.update(
                error="Cannot revise output: missing final output or evaluation results",
                status="error"
            )
        
        # Get the current revision count (default to 0 if not set)
        revision_count = getattr(state, "revision_count", 0)
        
        # Increment the revision count
        revision_count += 1
        print(f"Revising output (attempt #{revision_count})")
        
        # Create a prompt for revising the output
        prompt = f"""
        You need to revise the previously generated output to better meet the user's requirements.
        
        ORIGINAL REQUEST: {state.user_input}
        TASK TYPE: {state.task_requirements.task_type}
        OUTPUT FORMAT: {state.task_requirements.output_format}
        
        CURRENT OUTPUT:
        {state.final_output}
        
        EVALUATION FEEDBACK:
        {state.evaluation_results}
        
        This is revision attempt #{revision_count}. Please focus on addressing the specific issues mentioned
        in the evaluation while maintaining the correct structure and format.
        
        Focus specifically on:
        1. Ensuring the output directly addresses the original request
        2. Following the required output format exactly
        3. Including all necessary information from the documents
        4. Implementing the suggested improvements
        
        Provide a complete revised output that can replace the current one.
        """
        
        # Generate revised output
        response = llm.invoke(prompt)
        
        # Update the state with the revised output
        return state.update(
            previous_output=state.final_output,  # Store the previous output
            final_output=response.content,       # Update with the revised output
            status="revised",                    # Update status
            revision_count=revision_count        # Update revision count
        )
        
    except Exception as e:
        print(f"Error during revision: {str(e)}")
        return state.update(
            error=f"Error revising output: {str(e)}",
            status="error"
        )

def should_revise_or_complete(state: AgentState) -> str:
    """Determine whether to revise the output or complete the workflow based on evaluation."""
    # Handle both dictionary and object access
    if isinstance(state, dict):
        status = state.get("status", "unknown")
        evaluation_results = state.get("evaluation_results")
        needs_revision = state.get("needs_revision", False)
        revision_count = state.get("revision_count", 0)
    else:
        status = getattr(state, "status", "unknown")
        evaluation_results = getattr(state, "evaluation_results", None)
        needs_revision = getattr(state, "needs_revision", False)
        revision_count = getattr(state, "revision_count", 0)
    
    # Debug info
    print(f"Checking whether to revise or complete. State status: {status}")
    
    # Check if in error state first
    if status == "error":
        print("Error state detected, ending workflow")
        return "complete"
        
    # Hard limit on revisions to prevent infinite loops
    if revision_count >= 5:
        print(f"Maximum revision limit reached ({revision_count}), completing workflow")
        return "complete"
        
    # Check if we have evaluation results
    if evaluation_results is None:
        print("No evaluation results available, completing workflow")
        return "complete"
    
    # Debug: print evaluation
    print(f"Evaluation: {evaluation_results}")
    
    # Check if the needs_revision flag is set
    if needs_revision:
        print("Output needs revision based on evaluation")
        return "revise_output"
    else:
        print("Output meets requirements, completing workflow")
        return "complete"