from steps import list_files, create_expense_table
from graphs import create_expense_reporter_workflow
from states import AgentState

# Main function to run the agent
def process_expense_receipts(directory_path: str, as_df=False):
    """Run the expense receipt processing agent on files in the specified directory."""
    # List files in the directory
    files = list_files(directory_path)
    print(f"Found {len(files)} files to process: {files}")
    
    # Create the workflow
    workflow = create_expense_reporter_workflow()
    app = workflow.compile()
    
    # Initialize the state
    initial_state = AgentState(
        files=files,
        processed_files=[],
        current_file="",
        extracted_expenses=[],  # Changed from extracted_data
        errors=[],
        final_report={},
        directory_path=directory_path,
        processing_complete=False
    )
    
    # Run the graph
    result = app.invoke(initial_state)
    
    if as_df:
        return create_expense_table(result["final_report"]["all_receipts"])
    else:
        # Return the final report
        return result["final_report"]