"""
LangGraph workflow agent wrapper
"""
import logging
import importlib
import time
from typing import Dict, Any, Optional, Callable
from pathlib import Path

from backend.agents.base import WorkflowAgent, AgentCapability

logger = logging.getLogger(__name__)


class LangGraphAgent(WorkflowAgent):
    """
    Agent that wraps a LangGraph workflow
    
    This allows LangGraph workflows to be used through the unified agent interface
    """
    
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        """
        Initialize LangGraph agent
        
        Required config:
            - workflow_module: Python module path (e.g., "workflows.developer.tasks")
            - workflow_function: Function name to call (e.g., "perform_task")
            
        Optional config:
            - recursion_limit: LangGraph recursion limit (default: 100)
            - provider: LLM provider (e.g., "openai")
            - api_key: API key for LLM provider
            - model_name: Model name to use
            - temperature: Temperature for LLM calls
            - max_tokens: Max tokens for LLM calls
        """
        super().__init__(agent_id, config)
        
        # Required config
        self.workflow_module_path = config.get("workflow_module")
        self.workflow_function_name = config.get("workflow_function")
        
        if not self.workflow_module_path or not self.workflow_function_name:
            raise ValueError(
                f"LangGraph agent {agent_id} requires 'workflow_module' and 'workflow_function'"
            )
        
        # Optional config
        self.recursion_limit = config.get("recursion_limit", 100)
        self.provider = config.get("provider", "openai")
        self.api_key = config.get("api_key")
        self.model_name = config.get("model_name")
        self.temperature = config.get("temperature", 0.0)
        self.max_tokens = config.get("max_tokens")
        
        # Workflow function (loaded in initialize())
        self.workflow_function: Optional[Callable] = None
        
        # Capabilities
        self.add_capability(AgentCapability.CODE_GENERATION)
    
    async def initialize(self) -> bool:
        """Initialize the workflow by importing the module and function"""
        try:
            # Import the workflow module
            module = importlib.import_module(self.workflow_module_path)
            
            # Get the workflow function
            if not hasattr(module, self.workflow_function_name):
                raise AttributeError(
                    f"Module {self.workflow_module_path} has no function {self.workflow_function_name}"
                )
            
            self.workflow_function = getattr(module, self.workflow_function_name)
            
            self._initialized = True
            logger.info(f"✅ Initialized LangGraph agent '{self.agent_id}' "
                       f"({self.workflow_module_path}.{self.workflow_function_name})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize LangGraph agent '{self.agent_id}': {e}")
            return False
    
    async def query(self, message: str, conversation_id: Optional[str] = None,
                   parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Query maps to execute_workflow for LangGraph agents
        
        This allows using the workflow through the standard query interface
        """
        result = await self.execute_workflow(message, parameters)
        
        # Convert workflow result to query response format
        if result["status"] == "completed":
            return {
                "response": self._format_workflow_response(result["result"]),
                "conversation_id": conversation_id or "workflow_execution",
                "metadata": {
                    "execution_time": result.get("execution_time"),
                    "status": result["status"]
                }
            }
        else:
            raise RuntimeError(f"Workflow execution failed: {result.get('error')}")
    
    async def execute_workflow(self, task: str, 
                              parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute the LangGraph workflow
        
        Args:
            task: Task description (passed as input to workflow)
            parameters: Optional parameters to override config
            
        Returns:
            Dict with:
                - status: str (completed/failed)
                - result: Any (workflow output)
                - error: Optional[str]
                - execution_time: float
        """
        if not self._initialized or not self.workflow_function:
            raise RuntimeError(f"Agent {self.agent_id} not initialized")
        
        # Merge parameters with config
        params = {
            "provider": self.provider,
            "api_key": self.api_key,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "recursion_limit": self.recursion_limit
        }
        
        if parameters:
            params.update(parameters)
        
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        
        logger.info(f"🔄 Executing LangGraph workflow '{self.agent_id}' with task: {task[:100]}...")
        
        start_time = time.time()
        
        try:
            # Execute the workflow
            # The perform_task function signature is: perform_task(task, provider, api_key, ...)
            # Check if function is async or sync and handle appropriately
            import asyncio
            import inspect

            if inspect.iscoroutinefunction(self.workflow_function):
                result = await self.workflow_function(task, **params)
            else:
                # Run synchronous workflow in thread pool to avoid blocking
                result = await asyncio.to_thread(self.workflow_function, task, **params)

            execution_time = time.time() - start_time
            
            # Check for errors in result
            if isinstance(result, dict) and result.get("error"):
                logger.error(f"❌ Workflow '{self.agent_id}' failed: {result['error']}")
                return {
                    "status": "failed",
                    "result": None,
                    "error": result["error"],
                    "execution_time": execution_time
                }
            
            logger.info(f"✅ Workflow '{self.agent_id}' completed in {execution_time:.2f}s")
            
            return {
                "status": "completed",
                "result": result,
                "error": None,
                "execution_time": execution_time
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"❌ Error executing workflow '{self.agent_id}': {e}")
            
            return {
                "status": "failed",
                "result": None,
                "error": str(e),
                "execution_time": execution_time
            }
    
    def _format_workflow_response(self, result: Dict[str, Any]) -> str:
        """Format workflow result as a text response"""
        if not isinstance(result, dict):
            return str(result)
        
        # For the developer workflow specifically
        if "codebase" in result:
            files = list(result.get("codebase", {}).keys())
            file_count = len(files)
            
            response_parts = [
                f"✅ Workflow completed successfully!",
                f"Generated {file_count} files: {', '.join(files[:5])}"
            ]
            
            if file_count > 5:
                response_parts.append(f"... and {file_count - 5} more")
            
            if result.get("documentation"):
                response_parts.append(f"Documentation: {len(result['documentation'])} files")
            
            return "\n".join(response_parts)
        
        # Generic formatting
        return f"Workflow completed. Result keys: {', '.join(result.keys())}"
    
    async def cleanup(self):
        """Cleanup resources"""
        self.workflow_function = None
        self._initialized = False
        logger.info(f"🧹 Cleaned up LangGraph agent '{self.agent_id}'")
    
    def get_type(self) -> str:
        """Get agent type"""
        return "langgraph"
    
    def _get_public_config(self) -> Dict[str, Any]:
        """Get public configuration"""
        return {
            **super()._get_public_config(),
            "workflow_module": self.workflow_module_path,
            "workflow_function": self.workflow_function_name,
            "provider": self.provider,
            "model_name": self.model_name,
            "recursion_limit": self.recursion_limit
        }