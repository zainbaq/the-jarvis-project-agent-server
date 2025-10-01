"""
Base agent interface - all agents must implement this
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from models.responses import AgentInfo
from enum import Enum


class AgentCapability(str, Enum):
    """Standard agent capabilities"""
    CHAT = "chat"
    WORKFLOW = "workflow"
    CODE_GENERATION = "code_generation"
    FILE_PROCESSING = "file_processing"
    WEB_SEARCH = "web_search"
    STREAMING = "streaming"


class BaseAgent(ABC):
    """
    Base interface for all agent implementations
    
    All agents must implement these methods to be registered and used
    """
    
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        """
        Initialize the agent
        
        Args:
            agent_id: Unique identifier for this agent
            config: Configuration dictionary
        """
        self.agent_id = agent_id
        self.config = config
        self.name = config.get("name", agent_id)
        self.description = config.get("description", "")
        self._capabilities: List[AgentCapability] = []
        self._initialized = False
    
    @abstractmethod
    async def initialize(self) -> bool:
        """
        Initialize the agent (load models, connect to APIs, etc.)
        
        Returns:
            bool: True if initialization successful
        """
        pass
    
    @abstractmethod
    async def query(self, message: str, conversation_id: Optional[str] = None,
                   parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Send a query to the agent
        
        Args:
            message: User message
            conversation_id: Optional conversation ID for context
            parameters: Optional additional parameters
            
        Returns:
            Dict with response data including:
                - response: str (agent response text)
                - metadata: Dict (optional metadata)
        """
        pass
    
    @abstractmethod
    async def cleanup(self):
        """
        Cleanup resources when shutting down
        """
        pass
    
    def get_info(self) -> AgentInfo:
        """
        Get agent information
        
        Returns:
            AgentInfo object
        """
        return AgentInfo(
            agent_id=self.agent_id,
            name=self.name,
            type=self.get_type(),
            description=self.description,
            capabilities=[cap.value for cap in self._capabilities],
            status="active" if self._initialized else "inactive",
            config=self._get_public_config()
        )
    
    @abstractmethod
    def get_type(self) -> str:
        """
        Get agent type identifier
        
        Returns:
            str: Agent type (e.g., "openai", "langgraph")
        """
        pass
    
    def _get_public_config(self) -> Dict[str, Any]:
        """
        Get public configuration (without sensitive data)
        
        Returns:
            Dict with public config parameters
        """
        # Override in subclasses to expose specific config
        return {
            "name": self.name,
            "description": self.description
        }
    
    def has_capability(self, capability: AgentCapability) -> bool:
        """Check if agent has a specific capability"""
        return capability in self._capabilities
    
    def add_capability(self, capability: AgentCapability):
        """Add a capability to this agent"""
        if capability not in self._capabilities:
            self._capabilities.append(capability)


class WorkflowAgent(BaseAgent):
    """
    Extended base for workflow-based agents (LangGraph, etc.)
    
    Workflow agents execute longer-running tasks and return structured results
    """
    
    @abstractmethod
    async def execute_workflow(self, task: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute a workflow task
        
        Args:
            task: Task description
            parameters: Optional workflow parameters
            
        Returns:
            Dict with workflow results including:
                - status: str (completed/failed)
                - result: Any (workflow output)
                - error: Optional[str] (error message if failed)
        """
        pass
    
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        super().__init__(agent_id, config)
        self.add_capability(AgentCapability.WORKFLOW)