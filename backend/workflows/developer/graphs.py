from .steps import (
    analyze_requirements, 
    prioritize_files, 
    select_next_file, 
    generate_file, 
    review_code, 
    improve_code, 
    generate_tests, 
    generate_documentation, 
    handle_error,
    route_from_select_next_file,
    check_for_error,
)
from langgraph.graph import StateGraph, END
from .states import CodeGenState

# Build a simplified extended graph with fixed components
def build_code_generation_graph():
    workflow = StateGraph(CodeGenState)
    
    # Add nodes
    workflow.add_node("analyze_requirements", analyze_requirements)
    workflow.add_node("prioritize_files", prioritize_files)
    workflow.add_node("select_next_file", select_next_file)  # Use fixed version with iteration tracking
    workflow.add_node("generate_file", generate_file)
    workflow.add_node("review_code", review_code)
    workflow.add_node("improve_code", improve_code)
    workflow.add_node("generate_tests", generate_tests)
    workflow.add_node("generate_documentation", generate_documentation)
    workflow.add_node("handle_error", handle_error)
    
    # Add transitional nodes for conditional edges
    workflow.add_node("generate_file_next", lambda x: x)  # Identity function
    workflow.add_node("review_code_next", lambda x: x) 
    workflow.add_node("improve_code_next", lambda x: x)
    workflow.add_node("generate_tests_next", lambda x: x)
    workflow.add_node("doc_next", lambda x: x)
    workflow.add_node("select_next_file_branch", lambda x: x)
    
    # Basic linear flow
    workflow.add_edge("analyze_requirements", "prioritize_files")
    workflow.add_edge("prioritize_files", "select_next_file")
    
    # After select_next_file
    workflow.add_conditional_edges(
        "select_next_file",
        check_for_error,  # Check for errors
        {
            "error": "handle_error",
            "next": "select_next_file_branch"
        }
    )
    
    # Branch based on remaining files
    workflow.add_conditional_edges(
        "select_next_file_branch",
        route_from_select_next_file,
        {
            "generate_file": "generate_file",
            "generate_documentation": "generate_documentation",
            "error": "handle_error"
        }
    )
    
    # Flow for file processing
    workflow.add_conditional_edges(
        "generate_file",
        check_for_error,
        {
            "error": "handle_error",
            "next": "generate_file_next"
        }
    )
    workflow.add_edge("generate_file_next", "review_code")
    
    workflow.add_conditional_edges(
        "review_code",
        check_for_error,
        {
            "error": "handle_error",
            "next": "review_code_next"
        }
    )
    workflow.add_edge("review_code_next", "improve_code")
    
    workflow.add_conditional_edges(
        "improve_code",
        check_for_error,
        {
            "error": "handle_error",
            "next": "improve_code_next"
        }
    )
    workflow.add_edge("improve_code_next", "generate_tests")
    
    workflow.add_conditional_edges(
        "generate_tests",
        check_for_error,
        {
            "error": "handle_error",
            "next": "generate_tests_next"
        }
    )
    workflow.add_edge("generate_tests_next", "select_next_file")
    
    # Documentation flow
    workflow.add_conditional_edges(
        "generate_documentation",
        check_for_error,
        {
            "error": "handle_error",
            "next": "doc_next"
        }
    )
    workflow.add_edge("doc_next", END)
    
    # End conditions
    workflow.add_edge("handle_error", END)
    
    # Set the entry point
    workflow.set_entry_point("analyze_requirements")
    
    return workflow