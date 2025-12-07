"""
Agent Manager - Orchestration layer for agents and tools

The Agent Manager sits between API requests and agents, handling:
- Tool orchestration (web search, attachments, code interpreter)
- Prompt engineering for non-workflow agents
- Context augmentation with tool results
- Unified interface for all agent types
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from backend.agents.base import BaseAgent, WorkflowAgent
from backend.tools.web_search import WebSearchTool

logger = logging.getLogger(__name__)


class ToolResult:
    """Container for tool execution results"""
    
    def __init__(self, tool_name: str, success: bool, data: Any = None, 
                 error: Optional[str] = None, context: Optional[str] = None):
        self.tool_name = tool_name
        self.success = success
        self.data = data
        self.error = error
        self.context = context  # Formatted text to add to prompt
        self.timestamp = datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for response metadata"""
        return {
            "tool": self.tool_name,
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "timestamp": self.timestamp
        }


class AgentManager:
    """
    Central manager for orchestrating agents and tools
    
    Responsibilities:
    1. Determine which tools to use based on request
    2. Execute tools (web search, attachments, etc.)
    3. Augment prompts with tool results
    4. Route to appropriate agent
    5. Handle agent responses
    """
    
    def __init__(self):
        """Initialize the agent manager"""
        self.web_search_tool = WebSearchTool()
        self.tools_available = {
            "web_search": self.web_search_tool.is_configured()
        }
        
        logger.info(f"AgentManager initialized. Available tools: {self.tools_available}")
    
    def get_available_tools(self) -> Dict[str, bool]:
        """Get status of available tools"""
        return {
            "web_search": self.tools_available.get("web_search", False),
            "attachments": False,  # Future implementation
            "code_interpreter": False  # Future implementation
        }
    
    async def process_query(
        self,
        agent: BaseAgent,
        message: str,
        conversation_id: str,
        enable_web_search: bool = False,
        uploaded_files: Optional[List[Dict]] = None,
        conversation_history: Optional[List[Dict]] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main entry point: process user query with tools and agent
        
        Args:
            agent: The agent to use for generating response
            message: User's message
            conversation_id: Unique conversation identifier
            enable_web_search: Whether to use web search
            uploaded_files: List of uploaded file metadata
            conversation_history: Previous conversation messages
            parameters: Additional parameters for agent
            
        Returns:
            Dict with response, metadata, and tool results
        """
        # Step 1: Execute tools if needed
        tool_results = await self._execute_tools(
            message=message,
            conversation_id=conversation_id,
            enable_web_search=enable_web_search,
            uploaded_files=uploaded_files
        )
        
        # Step 2: Check if this is a workflow agent (different handling)
        is_workflow = isinstance(agent, WorkflowAgent)
        
        if is_workflow:
            # Workflow agents handle their own context and tools
            response = await self._query_workflow_agent(
                agent=agent,
                message=message,
                tool_results=tool_results,
                parameters=parameters
            )
        else:
            # Non-workflow agents need prompt engineering
            response = await self._query_standard_agent(
                agent=agent,
                message=message,
                conversation_id=conversation_id,
                conversation_history=conversation_history,
                tool_results=tool_results,
                parameters=parameters
            )
        
        # Step 3: Add tool metadata to response
        response["tools_used"] = [tr.to_dict() for tr in tool_results]
        response["web_search_enabled"] = enable_web_search
        
        return response
    
    async def _execute_tools(
        self,
        message: str,
        conversation_id: str,
        enable_web_search: bool = False,
        uploaded_files: Optional[List[Dict]] = None
    ) -> List[ToolResult]:
        """
        Execute all requested tools
        
        Returns:
            List of tool results
        """
        tool_results = []
        
        # Web Search Tool
        if enable_web_search and self.tools_available.get("web_search"):
            web_search_result = await self._execute_web_search(
                message=message,
                conversation_id=conversation_id
            )
            tool_results.append(web_search_result)
        
        # Attachments Tool (Future)
        if uploaded_files:
            # TODO: Process attachments
            attachment_result = ToolResult(
                tool_name="attachments",
                success=False,
                error="Attachment processing not yet implemented",
                context=None
            )
            tool_results.append(attachment_result)
        
        return tool_results
    
    async def _execute_web_search(
        self,
        message: str,
        conversation_id: str
    ) -> ToolResult:
        """
        Execute web search and return results
        
        Returns:
            ToolResult with search context
        """
        try:
            logger.info(f"Executing web search for conversation {conversation_id}")
            
            # Perform search and store results
            search_metadata = await self.web_search_tool.search_and_store(
                conversation_id=conversation_id,
                user_query=message,
                num_queries=3,
                results_per_query=3
            )
            
            if not search_metadata.get('success'):
                return ToolResult(
                    tool_name="web_search",
                    success=False,
                    error=search_metadata.get('message', 'Search failed'),
                    data=search_metadata
                )
            
            # Get formatted context for the agent
            search_context = self.web_search_tool.get_search_context(
                conversation_id=conversation_id,
                query=message,
                max_results=5,
                max_length=2000
            )
            
            return ToolResult(
                tool_name="web_search",
                success=True,
                data=search_metadata,
                context=search_context
            )
            
        except Exception as e:
            logger.error(f"Error executing web search: {e}", exc_info=True)
            return ToolResult(
                tool_name="web_search",
                success=False,
                error=str(e)
            )
    
    def _build_enhanced_prompt(
        self,
        message: str,
        tool_results: List[ToolResult],
        conversation_history: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Build enhanced prompt with tool results for non-workflow agents
        
        Returns:
            Dict with enhanced_message and system_instructions
        """
        # Collect all tool contexts
        tool_contexts = []
        tool_summaries = []
        
        for result in tool_results:
            if result.success and result.context:
                tool_contexts.append(result.context)
                tool_summaries.append(
                    f"- {result.tool_name}: Retrieved {result.data.get('results_count', 0)} results"
                )
        
        # Build system instructions
        system_instructions = self._build_system_instructions(
            has_search_context=bool(tool_contexts),
            tool_summaries=tool_summaries
        )
        
        # Build enhanced message
        if tool_contexts:
            enhanced_message = self._format_message_with_context(
                message=message,
                contexts=tool_contexts
            )
        else:
            enhanced_message = message
        
        return {
            "enhanced_message": enhanced_message,
            "system_instructions": system_instructions,
            "has_tool_context": bool(tool_contexts)
        }
    
    def _build_system_instructions(
        self,
        has_search_context: bool,
        tool_summaries: List[str]
    ) -> str:
        """Build system instructions based on available tools"""
        
        base_instructions = """You are a helpful AI assistant. Provide clear, accurate, and helpful responses."""
        
        if has_search_context:
            search_instructions = """

IMPORTANT: You have been provided with web search results to help answer the user's query.

Guidelines for using search results:
1. Use the search results to provide accurate, up-to-date information
2. Cite sources when referencing specific information from search results
3. If search results conflict with your knowledge, prioritize recent search data
4. If search results are insufficient, acknowledge this and use your general knowledge
5. Synthesize information from multiple sources when available
6. Always be transparent about the source of your information

Tools used in this query:
""" + "\n".join(tool_summaries)
            
            return base_instructions + search_instructions
        
        return base_instructions
    
    def _format_message_with_context(
        self,
        message: str,
        contexts: List[str]
    ) -> str:
        """Format user message with tool contexts"""
        
        parts = [
            "=== USER QUERY ===",
            message,
            "",
            "=== ADDITIONAL CONTEXT ===",
            "The following information was retrieved to help answer your query:",
            ""
        ]
        
        for i, context in enumerate(contexts, 1):
            parts.append(f"\n{context}\n")
        
        parts.extend([
            "",
            "=== END ADDITIONAL CONTEXT ===",
            "",
            "Please answer the user's query using the provided context where relevant."
        ])
        
        return "\n".join(parts)
    
    async def _query_standard_agent(
        self,
        agent: BaseAgent,
        message: str,
        conversation_id: str,
        conversation_history: Optional[List[Dict]],
        tool_results: List[ToolResult],
        parameters: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Query a standard (non-workflow) agent with prompt engineering
        
        Standard agents include: OpenAI, Endpoint, Custom agents
        """
        # Build enhanced prompt
        prompt_data = self._build_enhanced_prompt(
            message=message,
            tool_results=tool_results,
            conversation_history=conversation_history
        )
        
        # Prepare parameters with system instructions
        agent_params = parameters.copy() if parameters else {}
        
        # Add system message if agent supports it
        if prompt_data["has_tool_context"]:
            agent_params["system_message"] = prompt_data["system_instructions"]
        
        try:
            # Call the agent
            result = await agent.query(
                message=prompt_data["enhanced_message"],
                conversation_id=conversation_id,
                parameters=agent_params
            )
            
            return {
                "response": result["response"],
                "conversation_id": result["conversation_id"],
                "metadata": result.get("metadata", {}),
                "prompt_engineered": prompt_data["has_tool_context"]
            }
            
        except Exception as e:
            logger.error(f"Error querying standard agent: {e}", exc_info=True)
            raise
    
    async def _query_workflow_agent(
        self,
        agent: WorkflowAgent,
        message: str,
        tool_results: List[ToolResult],
        parameters: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Query a workflow agent
        
        Workflow agents (LangGraph) handle their own tool integration
        """
        # For workflow agents, we pass tool results as metadata
        workflow_params = parameters.copy() if parameters else {}

        # Add tool results to parameters
        if tool_results:
            workflow_params["tool_results"] = [tr.to_dict() for tr in tool_results]

        # Get workflow-specific config from agent and add to parameters
        agent_config = agent.config
        workflow_params.setdefault('provider', agent_config.get('provider', 'openai'))
        workflow_params.setdefault('api_key', agent_config.get('api_key'))
        workflow_params.setdefault('model_name', agent_config.get('model_name'))
        workflow_params.setdefault('temperature', agent_config.get('temperature', 0.0))
        workflow_params.setdefault('max_tokens', agent_config.get('max_tokens'))
        workflow_params.setdefault('recursion_limit', agent_config.get('recursion_limit', 100))

        try:
            # Execute workflow
            result = await agent.execute_workflow(
                task=message,
                parameters=workflow_params
            )
            
            return {
                "response": self._format_workflow_response(result),
                "workflow_status": result.get("status"),
                "workflow_result": result.get("result"),
                "metadata": {
                    "execution_time": result.get("execution_time"),
                    "status": result.get("status")
                }
            }
            
        except Exception as e:
            logger.error(f"Error querying workflow agent: {e}", exc_info=True)
            raise
    
    def _format_workflow_response(self, result: Dict[str, Any]) -> str:
        """Format workflow result as a text response"""
        if not isinstance(result, dict):
            return str(result)
        
        workflow_result = result.get("result", {})
        
        # For the developer workflow specifically
        if isinstance(workflow_result, dict) and "codebase" in workflow_result:
            files = list(workflow_result.get("codebase", {}).keys())
            file_count = len(files)
            
            response_parts = [
                f"✅ Workflow completed successfully!",
                f"Generated {file_count} files: {', '.join(files[:5])}"
            ]
            
            if file_count > 5:
                response_parts.append(f"... and {file_count - 5} more")
            
            if workflow_result.get("documentation"):
                response_parts.append(f"Documentation: {len(workflow_result['documentation'])} files")
            
            return "\n".join(response_parts)
        
        # Generic formatting
        status = result.get("status", "unknown")
        if status == "completed":
            return "Workflow completed successfully. Result available in metadata."
        else:
            return f"Workflow status: {status}"
    
    async def test_tools(self) -> Dict[str, Any]:
        """Test all available tools"""
        results = {
            "web_search": None,
            "attachments": {"available": False, "status": "not_implemented"},
            "code_interpreter": {"available": False, "status": "not_implemented"}
        }
        
        # Test web search
        if self.tools_available.get("web_search"):
            try:
                test_result = await self.web_search_tool.test_connection()
                results["web_search"] = test_result
            except Exception as e:
                results["web_search"] = {
                    "available": False,
                    "error": str(e)
                }
        else:
            results["web_search"] = {
                "available": False,
                "status": "not_configured"
            }
        
        return results


# Global agent manager instance (initialized by app)
_agent_manager: Optional[AgentManager] = None


def get_agent_manager() -> AgentManager:
    """Get the global agent manager instance"""
    global _agent_manager
    if _agent_manager is None:
        _agent_manager = AgentManager()
    return _agent_manager


def reset_agent_manager():
    """Reset the global agent manager (useful for testing)"""
    global _agent_manager
    _agent_manager = None