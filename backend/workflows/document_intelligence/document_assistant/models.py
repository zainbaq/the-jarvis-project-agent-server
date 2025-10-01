from typing import Dict, List, Any, Literal, Optional
from pydantic import BaseModel, Field

class DocumentInfo(BaseModel):
    """Information about a processed document."""
    file_path: str
    content: str
    metadata: Optional[Dict[str, Any]] = None

class TaskRequirement(BaseModel):
    """Requirements for a document processing task."""
    task_type: str
    output_format: str
    specific_requirements: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        """Custom validation to handle cases where specific_requirements is a string."""
        if isinstance(obj, dict) and isinstance(obj.get("specific_requirements"), str):
            obj["specific_requirements"] = {"description": obj["specific_requirements"]}
        return super().model_validate(obj, *args, **kwargs)

class PlanStep(BaseModel):
    """A step in the execution plan."""
    step_id: int
    description: str
    tool: str
    input_parameters: Dict[str, Any]
    is_completed: bool = False
    output: Optional[Any] = None

class ExecutionPlan(BaseModel):
    """Plan for executing a document processing task."""
    steps: List[PlanStep]
    current_step_index: int = 0

class EvaluationResult(BaseModel):
    """Results from evaluating the output against requirements."""
    meets_requirements: bool
    score: int
    issues: List[str] = Field(default_factory=list)
    suggested_improvements: List[str] = Field(default_factory=list)
    explanation: str

class AgentState(BaseModel):
    """The state of the document processing agent."""
    user_input: str
    documents: List[DocumentInfo] = Field(default_factory=list)
    task_requirements: Optional[TaskRequirement] = None
    execution_plan: Optional[ExecutionPlan] = None
    working_memory: Dict[str, Any] = Field(default_factory=dict)
    final_output: Optional[str] = None
    previous_output: Optional[str] = None  # Store previous output for comparison
    evaluation_results: Optional[Dict[str, Any]] = None  # Store evaluation results
    needs_revision: bool = False  # Flag to indicate if output needs revision
    revision_count: int = 0  # Counter for number of revisions performed
    status: str = "initialized"
    error: Optional[str] = None

    def update(self, **kwargs):
        """Create a new state with updated values."""
        current_dict = self.model_dump()
        current_dict.update(kwargs)
        return AgentState(**current_dict)