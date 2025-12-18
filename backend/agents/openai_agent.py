"""
OpenAI-based agent implementation using Responses API with file search and code interpreter support
"""
import logging
from typing import Dict, Any, Optional, List
from openai import AsyncOpenAI
import asyncio

from backend.agents.base import BaseAgent, AgentCapability

logger = logging.getLogger(__name__)


class OpenAIAgent(BaseAgent):
    """
    Agent that uses OpenAI API for chat completions
    """
    
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        """
        Initialize OpenAI agent with Responses API support

        Required config:
            - api_key: OpenAI API key
            - model: Model name (e.g., "gpt-4o", "gpt-4", "gpt-3.5-turbo")

        Optional config:
            - base_url: Custom base URL
            - temperature: Sampling temperature (0-2)
            - max_tokens: Maximum tokens in response
            - timeout: Request timeout in seconds
            - system_message: Default system message
            - max_history_messages: Max conversation history to include
            - enable_file_search: Enable file search tool (default: False)
            - enable_code_interpreter: Enable code interpreter tool (default: False)
        """
        super().__init__(agent_id, config)

        # Required config
        self.api_key = config.get("api_key")
        if not self.api_key:
            raise ValueError(f"api_key required for OpenAI agent {agent_id}")

        self.model = config.get("model", "gpt-4o")

        # Optional config
        self.base_url = config.get("base_url")
        self.temperature = config.get("temperature", 0.7)
        # self.max_tokens = config.get("max_tokens", 2000)
        self.timeout = config.get("timeout", 30)
        self.top_p = config.get("top_p", 1.0)
        self.system_message = config.get("system_message",
                                        "You are a helpful AI assistant.")
        self.max_history_messages = config.get("max_history_messages", 20)

        # Tool configuration
        self.enable_file_search = config.get("enable_file_search", False)
        self.enable_code_interpreter = config.get("enable_code_interpreter", False)

        # Client (initialized in initialize())
        self.client: Optional[AsyncOpenAI] = None

        # Conversation history storage (simple in-memory for now)
        self.conversations: Dict[str, List[Dict[str, str]]] = {}

        # OpenAI resource tracking for file operations
        self.vector_stores: Dict[str, str] = {}  # conversation_id → vector_store_id
        self.openai_files: Dict[str, List[str]] = {}  # conversation_id → [file_ids]

        # Capabilities
        self.add_capability(AgentCapability.CHAT)
        self.add_capability(AgentCapability.STREAMING)
        self.add_capability(AgentCapability.WEB_SEARCH)

        if self.enable_file_search:
            self.add_capability(AgentCapability.FILE_PROCESSING)
        if self.enable_code_interpreter:
            self.add_capability(AgentCapability.CODE_GENERATION)
    
    async def initialize(self) -> bool:
        """Initialize the OpenAI client"""
        try:
            client_args = {
                "api_key": self.api_key,
                "timeout": self.timeout
            }
            if self.base_url:
                client_args["base_url"] = self.base_url

            self.client = AsyncOpenAI(**client_args)
            self._initialized = True

            tools_enabled = []
            if self.enable_file_search:
                tools_enabled.append("file_search")
            if self.enable_code_interpreter:
                tools_enabled.append("code_interpreter")

            tools_msg = f" with tools: {', '.join(tools_enabled)}" if tools_enabled else ""
            logger.info(f"✅ Initialized OpenAI agent '{self.agent_id}' with model {self.model}{tools_msg}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to initialize OpenAI agent '{self.agent_id}': {e}")
            return False
    
    async def query(self, message: str, conversation_id: Optional[str] = None,
                   system_message: Optional[str] = None,
                   parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Send a query to the OpenAI model with tool support

        Args:
            message: User message
            conversation_id: Optional conversation ID for context
            system_message: Optional system message override
            parameters: Optional parameters to override defaults (temperature, max_tokens, etc.)

        Returns:
            Dict with:
                - response: str (model response)
                - conversation_id: str (conversation ID used)
                - metadata: Dict (tokens used, model, etc.)
        """
        if not self._initialized or not self.client:
            raise RuntimeError(f"Agent {self.agent_id} not initialized")

        # Generate conversation ID if not provided
        if not conversation_id:
            import uuid
            conversation_id = f"conv_{uuid.uuid4().hex[:12]}"

        # Get or create conversation history
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []

        conversation_history = self.conversations[conversation_id]

        # Override parameters if provided
        params = parameters or {}
        temperature = params.get("temperature", self.temperature)
        # max_tokens = params.get("max_tokens", self.max_tokens)
        top_p = params.get("top_p", self.top_p)

        # Prepare messages
        messages = self._prepare_messages(message, conversation_history, system_message)

        # Build request parameters
        request_params = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p
        }

        # Add tools if enabled and resources are available
        tools = []
        if self.enable_file_search and conversation_id in self.vector_stores:
            tools.append({
                "type": "file_search",
                "file_search": {
                    "vector_store_ids": [self.vector_stores[conversation_id]]
                }
            })

        if self.enable_code_interpreter and conversation_id in self.openai_files:
            tools.append({"type": "code_interpreter"})

        if tools:
            request_params["tools"] = tools

            # Add tool resources for code_interpreter
            if self.enable_code_interpreter and conversation_id in self.openai_files:
                request_params["tool_resources"] = {
                    "code_interpreter": {
                        "file_ids": self.openai_files[conversation_id]
                    }
                }

        try:
            # Make API call
            completion = await self.client.chat.completions.create(**request_params)

            # Extract response
            response_text = completion.choices[0].message.content

            # Update conversation history
            conversation_history.append({"role": "user", "content": message})
            conversation_history.append({"role": "assistant", "content": response_text})

            # Trim history if too long
            if len(conversation_history) > self.max_history_messages * 2:
                self.conversations[conversation_id] = conversation_history[-(self.max_history_messages * 2):]

            # Prepare metadata
            metadata = {
                "model": completion.model,
                "tokens_used": completion.usage.total_tokens if completion.usage else None,
                "prompt_tokens": completion.usage.prompt_tokens if completion.usage else None,
                "completion_tokens": completion.usage.completion_tokens if completion.usage else None,
                "finish_reason": completion.choices[0].finish_reason
            }

            logger.info(f"✅ OpenAI agent '{self.agent_id}' completed query (tokens: {metadata.get('tokens_used', '?')})")

            return {
                "response": response_text.strip(),
                "conversation_id": conversation_id,
                "metadata": metadata
            }

        except asyncio.TimeoutError:
            logger.error(f"❌ Timeout querying OpenAI agent '{self.agent_id}'")
            raise RuntimeError("Request timed out")
        except Exception as e:
            logger.error(f"❌ Error querying OpenAI agent '{self.agent_id}': {e}")
            raise RuntimeError(f"Query failed: {str(e)}")
    
    def _prepare_messages(self, current_message: str,
                         conversation_history: List[Dict[str, str]],
                         system_message: Optional[str] = None) -> List[Dict[str, str]]:
        """Prepare messages for API call with conversation context"""
        messages = [{"role": "system", "content": system_message or self.system_message}]

        # Add conversation history (limited)
        history_to_include = conversation_history[-(self.max_history_messages * 2):]
        messages.extend(history_to_include)

        # Add current message
        messages.append({"role": "user", "content": current_message})

        return messages

    async def upload_file(
        self,
        conversation_id: str,
        file_path: str,
        purpose: str = "assistants"
    ) -> str:
        """
        Upload file to OpenAI

        Args:
            conversation_id: Conversation ID for tracking
            file_path: Local file path
            purpose: "assistants" for file_search, "vision" for code_interpreter

        Returns:
            OpenAI file_id
        """
        if not self.client:
            raise RuntimeError("Client not initialized")

        try:
            with open(file_path, "rb") as f:
                file_obj = await self.client.files.create(
                    file=f,
                    purpose=purpose
                )

            # Track file
            if conversation_id not in self.openai_files:
                self.openai_files[conversation_id] = []
            self.openai_files[conversation_id].append(file_obj.id)

            logger.info(f"📤 Uploaded file {file_obj.id} for conversation {conversation_id}")
            return file_obj.id

        except Exception as e:
            logger.error(f"❌ Failed to upload file: {e}")
            raise

    async def get_or_create_vector_store(
        self,
        conversation_id: str,
        file_ids: List[str]
    ) -> str:
        """
        Get existing or create new vector store for file_search

        Vector stores are conversation-scoped

        Args:
            conversation_id: Conversation ID
            file_ids: List of OpenAI file IDs to add to the vector store

        Returns:
            vector_store_id
        """
        if not self.client:
            raise RuntimeError("Client not initialized")

        # Check if exists
        if conversation_id in self.vector_stores:
            logger.info(f"Using existing vector store for conversation {conversation_id}")
            return self.vector_stores[conversation_id]

        # Create new
        try:
            vector_store = await self.client.beta.vector_stores.create(
                name=f"conversation_{conversation_id}",
                file_ids=file_ids
            )

            self.vector_stores[conversation_id] = vector_store.id
            logger.info(f"📚 Created vector store {vector_store.id} for conversation {conversation_id}")
            return vector_store.id

        except Exception as e:
            logger.error(f"❌ Failed to create vector store: {e}")
            raise

    async def query_with_files(
        self,
        message: str,
        conversation_id: str,
        file_metadata_list: List[Any],
        use_file_search: bool = False,
        use_code_interpreter: bool = False,
        system_message: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Query with file attachments using OpenAI native tools

        Args:
            message: User message
            conversation_id: Conversation ID
            file_metadata_list: List of FileMetadata objects with local file paths
            use_file_search: Enable file_search tool
            use_code_interpreter: Enable code_interpreter tool
            system_message: Optional system message override
            parameters: Additional parameters

        Returns:
            Dict with response, metadata, and tool information
        """
        if not self.enable_file_search and not self.enable_code_interpreter:
            logger.warning("File tools not enabled for this agent")

        # Upload files to OpenAI
        file_ids = []
        for file_meta in file_metadata_list:
            purpose = "assistants" if use_file_search else "vision"
            file_id = await self.upload_file(
                conversation_id=conversation_id,
                file_path=file_meta.filepath,
                purpose=purpose
            )
            file_ids.append(file_id)

        # Create vector store if using file_search
        if use_file_search and file_ids:
            vector_store_id = await self.get_or_create_vector_store(
                conversation_id=conversation_id,
                file_ids=file_ids
            )
            logger.info(f"🔍 File search enabled with vector store {vector_store_id}")

        # Now call regular query() which will pick up the tools
        query_result = await self.query(
            message=message,
            conversation_id=conversation_id,
            system_message=system_message,
            parameters=parameters
        )

        # Extract response and merge metadata
        return {
            "response": query_result["response"],
            "conversation_id": query_result["conversation_id"],
            "metadata": {
                **query_result.get("metadata", {}),
                "tool_used": "file_search" if use_file_search else "code_interpreter",
                "files_processed": len(file_ids)
            }
        }

    async def cleanup_conversation(self, conversation_id: str):
        """
        Cleanup OpenAI resources for a conversation

        Deletes:
        - Uploaded files
        - Vector stores
        - Conversation history
        """
        # Delete files from OpenAI if client is available
        if self.client and conversation_id in self.openai_files:
            for file_id in self.openai_files[conversation_id]:
                try:
                    await self.client.files.delete(file_id)
                    logger.debug(f"🗑️  Deleted file {file_id}")
                except Exception as e:
                    logger.warning(f"Failed to delete file {file_id}: {e}")

        # Delete vector store from OpenAI if client is available
        if self.client and conversation_id in self.vector_stores:
            try:
                await self.client.beta.vector_stores.delete(
                    self.vector_stores[conversation_id]
                )
                logger.debug(f"🗑️  Deleted vector store {self.vector_stores[conversation_id]}")
            except Exception as e:
                logger.warning(f"Failed to delete vector store: {e}")

        # Always clean up in-memory tracking (even if client not initialized)
        if conversation_id in self.openai_files:
            del self.openai_files[conversation_id]

        if conversation_id in self.vector_stores:
            del self.vector_stores[conversation_id]

        if conversation_id in self.conversations:
            del self.conversations[conversation_id]

        logger.info(f"🧹 Cleaned up conversation {conversation_id}")

    async def cleanup(self):
        """Cleanup resources"""
        if self.client:
            await self.client.close()
        self._initialized = False
        logger.info(f"🧹 Cleaned up OpenAI agent '{self.agent_id}'")
    
    def get_type(self) -> str:
        """Get agent type"""
        return "openai"
    
    def _get_public_config(self) -> Dict[str, Any]:
        """Get public configuration"""
        return {
            **super()._get_public_config(),
            "model": self.model,
            "temperature": self.temperature,
            # "max_tokens": self.max_tokens,
            "max_history_messages": self.max_history_messages
        }
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test the connection to OpenAI API"""
        try:
            test_message = "Hello! Please respond with 'Connection successful'."
            result = await self.query(test_message, conversation_id="test_connection")
            
            return {
                "success": True,
                "message": "Connection test successful",
                "response_preview": result["response"][:100],
                "model": self.model
            }
        except Exception as e:
            return {
                "success": False,
                "message": "Connection test failed",
                "error": str(e),
                "model": self.model
            }