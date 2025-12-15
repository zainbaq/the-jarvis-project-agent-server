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
from backend.agents.openai_agent import OpenAIAgent
from backend.tools.web_search import WebSearchTool
from backend.tools.file_search import FileSearchTool
from backend.tools.e2b_code_interpreter import E2BCodeInterpreterTool
from backend.tools.km_connector import KMConnectorTool

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
    2. Execute tools (web search, attachments, KM search, etc.)
    3. Augment prompts with tool results
    4. Route to appropriate agent
    5. Handle agent responses
    """

    def __init__(self):
        """Initialize the agent manager"""
        self.web_search_tool = WebSearchTool()
        self.file_search_tool = FileSearchTool()
        self.code_interpreter_tool = E2BCodeInterpreterTool()
        self.km_connector_tool: Optional[KMConnectorTool] = None

        self.tools_available = {
            "web_search": self.web_search_tool.is_configured(),
            "file_search": self.file_search_tool.is_configured(),
            "code_interpreter": self.code_interpreter_tool.is_configured(),
            "km_search": False  # Will be updated when KM tool is set
        }

        logger.info(f"AgentManager initialized. Available tools: {self.tools_available}")

    def set_km_connector(self, km_storage, km_server_url: str):
        """
        Set the KM connector tool with storage and server URL

        Args:
            km_storage: KMConnectionStorage instance
            km_server_url: KM server base URL
        """
        self.km_connector_tool = KMConnectorTool(km_storage, km_server_url)
        self.tools_available["km_search"] = self.km_connector_tool.has_connections()
        logger.info(f"KM connector tool configured (server: {km_server_url})")
    
    def get_available_tools(self) -> Dict[str, bool]:
        """Get status of available tools"""
        # Update KM search status (may change as connections are added/removed)
        if self.km_connector_tool:
            self.tools_available["km_search"] = self.km_connector_tool.has_connections()

        return {
            "web_search": self.tools_available.get("web_search", False),
            "file_search": self.tools_available.get("file_search", False),
            "code_interpreter": self.tools_available.get("code_interpreter", False),
            "km_search": self.tools_available.get("km_search", False)
        }
    
    async def process_query(
        self,
        agent: BaseAgent,
        message: str,
        conversation_id: Optional[str] = None,
        enable_web_search: bool = False,
        enable_km_search: bool = False,
        km_connection_ids: Optional[List[str]] = None,
        uploaded_files: Optional[List[Dict]] = None,
        conversation_history: Optional[List[Dict]] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main entry point: process user query with tools and agent

        Args:
            agent: The agent to use for generating response
            message: User's message
            conversation_id: Unique conversation identifier (will be generated if None)
            enable_web_search: Whether to use web search
            enable_km_search: Whether to use knowledge management search
            km_connection_ids: Specific KM connection IDs to use (None = all active)
            uploaded_files: List of uploaded file metadata
            conversation_history: Previous conversation messages
            parameters: Additional parameters for agent

        Returns:
            Dict with response, metadata, and tool results
        """
        # Log incoming request parameters
        logger.info(f"[KM DEBUG] process_query called:")
        logger.info(f"[KM DEBUG]   - enable_km_search: {enable_km_search}")
        logger.info(f"[KM DEBUG]   - km_connection_ids: {km_connection_ids}")
        logger.info(f"[KM DEBUG]   - enable_web_search: {enable_web_search}")
        logger.info(f"[KM DEBUG]   - message preview: {message[:100]}...")

        # Generate conversation ID if not provided
        if not conversation_id:
            import uuid
            conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
            logger.info(f"Generated new conversation ID: {conversation_id}")

        # Step 1: Execute tools if needed
        tool_results = await self._execute_tools(
            agent=agent,
            message=message,
            conversation_id=conversation_id,
            enable_web_search=enable_web_search,
            enable_km_search=enable_km_search,
            km_connection_ids=km_connection_ids,
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
        response["km_search_enabled"] = enable_km_search

        return response
    
    async def _execute_tools(
        self,
        agent: BaseAgent,
        message: str,
        conversation_id: str,
        enable_web_search: bool = False,
        enable_km_search: bool = False,
        km_connection_ids: Optional[List[str]] = None,
        uploaded_files: Optional[List[Dict]] = None
    ) -> List[ToolResult]:
        """
        Execute all requested tools

        Args:
            agent: The agent that will process the query
            message: User message
            conversation_id: Conversation identifier
            enable_web_search: Whether to enable web search
            enable_km_search: Whether to enable KM search
            km_connection_ids: Specific KM connection IDs to use
            uploaded_files: Optional file attachments

        Returns:
            List of tool results
        """
        tool_results = []

        # Web Search Tool - Use Serper for all agents
        if enable_web_search and self.tools_available.get("web_search"):
            logger.info(f"Using Serper web search for {agent.get_type()} agent")
            web_search_result = await self._execute_web_search(
                message=message,
                conversation_id=conversation_id
            )
            tool_results.append(web_search_result)

        # KM Search Tool - Knowledge Management search
        if enable_km_search and self.km_connector_tool:
            logger.info(f"Using KM search for {agent.get_type()} agent")
            km_search_result = await self._execute_km_search(
                message=message,
                conversation_id=conversation_id,
                connection_ids=km_connection_ids
            )
            tool_results.append(km_search_result)

        # File Search Tool - For ALL agents (custom ChromaDB search)
        if uploaded_files:
            if self.tools_available.get("file_search"):
                file_search_result = await self._execute_file_search(
                    message=message,
                    conversation_id=conversation_id,
                    uploaded_files=uploaded_files
                )
                tool_results.append(file_search_result)
            else:
                tool_results.append(ToolResult(
                    tool_name="file_search",
                    success=False,
                    error="File search not available",
                    context=None
                ))

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

    async def _execute_file_search(
        self,
        message: str,
        conversation_id: str,
        uploaded_files: List[Any]
    ) -> ToolResult:
        """
        Execute file search and return results

        Returns:
            ToolResult with file search context
        """
        try:
            logger.info(f"Executing file search for conversation {conversation_id}")

            # Index files
            index_result = await self.file_search_tool.index_files(
                conversation_id=conversation_id,
                files=uploaded_files
            )

            if index_result["indexed_files"] == 0:
                return ToolResult(
                    tool_name="file_search",
                    success=False,
                    error="No files could be indexed",
                    data=index_result
                )

            # Get formatted context for the agent
            file_context = self.file_search_tool.get_file_context(
                conversation_id=conversation_id,
                query=message,
                max_results=5,
                max_length=2000
            )

            return ToolResult(
                tool_name="file_search",
                success=True,
                data=index_result,
                context=file_context
            )

        except Exception as e:
            logger.error(f"Error executing file search: {e}", exc_info=True)
            return ToolResult(
                tool_name="file_search",
                success=False,
                error=str(e)
            )

    async def _execute_km_search(
        self,
        message: str,
        conversation_id: str,
        connection_ids: Optional[List[str]] = None
    ) -> ToolResult:
        """
        Execute KM search and return results

        Args:
            message: User query
            conversation_id: Conversation identifier
            connection_ids: Specific connection IDs to use (None = all active)

        Returns:
            ToolResult with KM search context
        """
        try:
            logger.info(f"[KM DEBUG] _execute_km_search called:")
            logger.info(f"[KM DEBUG]   - conversation_id: {conversation_id}")
            logger.info(f"[KM DEBUG]   - connection_ids: {connection_ids}")
            logger.info(f"[KM DEBUG]   - km_connector_tool available: {self.km_connector_tool is not None}")

            if not self.km_connector_tool:
                logger.warning("[KM DEBUG] KM connector tool not configured!")
                return ToolResult(
                    tool_name="km_search",
                    success=False,
                    error="KM connector not configured"
                )

            # Perform search
            logger.info(f"[KM DEBUG] Calling km_connector_tool.search_and_store...")
            search_result = await self.km_connector_tool.search_and_store(
                conversation_id=conversation_id,
                user_query=message,
                connection_ids=connection_ids
            )
            logger.info(f"[KM DEBUG] KM search result: success={search_result.get('success')}, results_count={search_result.get('results_count', 0)}")

            if not search_result.get('success'):
                logger.warning(f"[KM DEBUG] KM search failed: {search_result.get('message')}")
                return ToolResult(
                    tool_name="km_search",
                    success=False,
                    error=search_result.get('message', 'KM search failed'),
                    data=search_result
                )

            # Get formatted context from results
            km_context = ""
            results_list = search_result.get('results', [])
            logger.info(f"[KM DEBUG] Processing {len(results_list)} result objects from KM search")

            for idx, result in enumerate(results_list):
                logger.info(f"[KM DEBUG] Result #{idx}: connection_name={result.get('connection_name')}, results_count={result.get('results_count')}")
                result_context = result.get('context', '')
                logger.info(f"[KM DEBUG] Result #{idx} context length: {len(result_context) if result_context else 0} chars")
                if result_context:
                    km_context += result_context + "\n\n"
                    logger.info(f"[KM DEBUG] Result #{idx} context preview: {result_context[:300]}...")

            context_length = len(km_context) if km_context else 0
            logger.info(f"[KM DEBUG] KM context built: {context_length} characters")
            if context_length > 0:
                logger.info(f"[KM DEBUG] KM context preview: {km_context[:500]}...")

            # Log the full KM response payload
            logger.info(f"[KM DEBUG] === KM RESPONSE PAYLOAD ===")
            logger.info(f"[KM DEBUG] Full search_result: {search_result}")
            logger.info(f"[KM DEBUG] === END KM RESPONSE PAYLOAD ===")

            return ToolResult(
                tool_name="km_search",
                success=True,
                data={
                    "results_count": search_result.get('results_count', 0),
                    "connections_queried": search_result.get('connections_queried', 0),
                    "partial_failure": search_result.get('partial_failure', False)
                },
                context=km_context.strip() if km_context else None
            )

        except Exception as e:
            logger.error(f"[KM DEBUG] Error executing KM search: {e}", exc_info=True)
            return ToolResult(
                tool_name="km_search",
                success=False,
                error=str(e)
            )

    async def _query_openai_with_files(
        self,
        agent: "OpenAIAgent",
        message: str,
        conversation_id: str,
        uploaded_files: List[Any],
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Query OpenAI agent with file attachments using native file_search tool

        Args:
            agent: OpenAI agent instance
            message: User message
            conversation_id: Conversation ID
            uploaded_files: List of FileMetadata objects
            parameters: Optional parameters

        Returns:
            Response dict with metadata and tool info
        """
        try:
            logger.info(f"Querying OpenAI agent with {len(uploaded_files)} files")

            # Determine which OpenAI tool to use
            # For now, default to file_search (could add logic to detect code execution needs)
            use_file_search = agent.enable_file_search
            use_code_interpreter = False  # Can be enhanced based on message content

            # Call the OpenAI agent's native file handling method
            result = await agent.query_with_files(
                message=message,
                conversation_id=conversation_id,
                file_metadata_list=uploaded_files,
                use_file_search=use_file_search,
                use_code_interpreter=use_code_interpreter,
                parameters=parameters
            )

            # Format response in standard structure
            return {
                "response": result["response"],
                "conversation_id": conversation_id,
                "metadata": result.get("metadata", {}),
                "tools_used": [{
                    "tool": result["metadata"].get("tool_used", "file_search"),
                    "success": True,
                    "data": {"files_processed": result["metadata"].get("files_processed", 0)},
                    "timestamp": ""
                }],
                "web_search_enabled": False
            }

        except Exception as e:
            logger.error(f"Error querying OpenAI with files: {e}", exc_info=True)
            raise

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
        logger.info(f"[KM DEBUG] _build_enhanced_prompt called with {len(tool_results)} tool results")

        # Collect all tool contexts
        tool_contexts = []
        tool_summaries = []

        for result in tool_results:
            logger.info(f"[KM DEBUG] Tool result: {result.tool_name}, success={result.success}, has_context={result.context is not None}")
            if result.success and result.context:
                tool_contexts.append(result.context)
                tool_summaries.append(
                    f"- {result.tool_name}: Retrieved {result.data.get('results_count', 0)} results"
                )
                logger.info(f"[KM DEBUG] Added context from {result.tool_name}: {len(result.context)} chars")

        logger.info(f"[KM DEBUG] Total tool contexts collected: {len(tool_contexts)}")

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
            logger.info(f"[KM DEBUG] Enhanced message length: {len(enhanced_message)} chars")
            logger.info(f"[KM DEBUG] Enhanced message preview: {enhanced_message[:1000]}...")
        else:
            enhanced_message = message
            logger.info(f"[KM DEBUG] No tool contexts, using original message")

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

IMPORTANT: You have been provided with search results from web searches and/or knowledge bases to help answer the user's query.

Guidelines for using search results:
1. Use the search results to provide accurate, up-to-date information
2. Cite sources when referencing specific information from search results
3. If search results conflict with your knowledge, prioritize the search data
4. If search results are insufficient, acknowledge this and use your general knowledge
5. Synthesize information from multiple sources when available
6. Always be transparent about the source of your information
7. Knowledge base results may contain specialized domain knowledge - use them appropriately

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

        Args:
            agent: The agent to query
            message: User message
            conversation_id: Conversation identifier
            conversation_history: Previous messages
            tool_results: Results from tool execution
            parameters: Additional parameters
        """
        # Build enhanced prompt
        prompt_data = self._build_enhanced_prompt(
            message=message,
            tool_results=tool_results,
            conversation_history=conversation_history
        )

        # Prepare parameters with system instructions
        agent_params = parameters.copy() if parameters else {}

        # Add system message if agent supports it (for Serper results)
        if prompt_data["has_tool_context"]:
            agent_params["system_message"] = prompt_data["system_instructions"]

        # Log the full prompt being sent to the agent
        logger.info(f"[KM DEBUG] === PROMPT BEING SENT TO AGENT ===")
        logger.info(f"[KM DEBUG] Agent type: {agent.get_type()}")
        logger.info(f"[KM DEBUG] Has tool context: {prompt_data['has_tool_context']}")
        logger.info(f"[KM DEBUG] System instructions: {prompt_data.get('system_instructions', 'None')[:500] if prompt_data.get('system_instructions') else 'None'}...")
        logger.info(f"[KM DEBUG] Enhanced message length: {len(prompt_data['enhanced_message'])} chars")
        logger.info(f"[KM DEBUG] === FULL ENHANCED MESSAGE START ===")
        logger.info(f"[KM DEBUG] {prompt_data['enhanced_message']}")
        logger.info(f"[KM DEBUG] === FULL ENHANCED MESSAGE END ===")

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
            "file_search": None,
            "code_interpreter": None,
            "km_search": None
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

        # Test file search
        results["file_search"] = {
            "available": self.tools_available.get("file_search", False),
            "configured": self.file_search_tool.is_configured(),
            "status": "ready" if self.file_search_tool.is_configured() else "not_configured"
        }

        # Test code interpreter
        results["code_interpreter"] = self.code_interpreter_tool.get_status()

        # Test KM search
        if self.km_connector_tool:
            results["km_search"] = {
                "available": True,
                "configured": self.km_connector_tool.is_configured(),
                "has_connections": self.km_connector_tool.has_connections(),
                "status": "ready" if self.km_connector_tool.is_configured() else "no_active_selections"
            }
        else:
            results["km_search"] = {
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