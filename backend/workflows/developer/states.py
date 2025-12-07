from typing import Dict, List, Any, TypedDict, Optional, Union

# Define the state structure
class CodeGenState(TypedDict):
    project_requirements: str
    architecture: List[Dict[str, Any]]
    codebase: Dict[str, str]
    current_file: Optional[str]
    messages: List[Any]
    error: Optional[str]
    code_reviews: Dict[str, str]  # Store code reviews for each file
    test_results: Dict[str, bool]  # Store test results for each file
    documentation: Dict[str, str]  # Store documentation
    _iterations: int  # Add iteration counter to prevent infinite loops
    create_documentation: bool
    completed_files: List[str]  # Track files that have been fully processed (generated, reviewed, improved, tested)