from langgraph.graph import StateGraph, START, END
from states import AgentState
from steps import process_next_file, generate_report, router

def create_expense_reporter_workflow():
    """Create a simplified expense reporter workflow."""
    # Create the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("process_next_file", process_next_file)
    workflow.add_node("generate_report", generate_report)
    
    # Add edges with routing
    workflow.add_edge(START, "process_next_file")
    workflow.add_conditional_edges("process_next_file", router)
    workflow.add_edge("generate_report", END)
    
    return workflow