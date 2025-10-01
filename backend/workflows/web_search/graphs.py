from langgraph.graph import StateGraph, END, START
from .states import Researcher
from .steps import (
    create_research_plan,
    gather_research,
    plan_sections,
    generate_section,
    combine_sections,
    evaluate_and_refine,
    should_continue_generating
)

def build_research_workflow_graph():
    # Create the graph
    workflow = StateGraph(Researcher)
    
    # Add nodes
    workflow.add_node("create_research_plan", create_research_plan)
    workflow.add_node("gather_research", gather_research)
    workflow.add_node("plan_sections", plan_sections)
    workflow.add_node("generate_section", generate_section)
    workflow.add_node("combine_sections", combine_sections)
    workflow.add_node("evaluate_and_refine", evaluate_and_refine)  # Add the new node
    
    # Add START edge
    workflow.add_edge(START, "create_research_plan")
    
    # Define the rest of the edges
    workflow.add_edge("create_research_plan", "gather_research")
    workflow.add_edge("gather_research", "plan_sections")
    workflow.add_edge("plan_sections", "generate_section")
    
    # Conditional edge for section generation
    workflow.add_conditional_edges(
        "generate_section",
        should_continue_generating,
        {
            "continue_generation": "generate_section",
            "done_generation": "combine_sections"
        }
    )
    
    # Add the new edge to evaluation
    workflow.add_edge("combine_sections", "evaluate_and_refine")
    workflow.add_edge("evaluate_and_refine", END)
    
    return workflow