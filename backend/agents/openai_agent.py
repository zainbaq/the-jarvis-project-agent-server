"""
OpenAI-based agent implementation
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
        Initialize OpenAI agent
        
        Required config:
            - api_key: OpenAI API key
            - model: Model name (e.g., "gpt-4", "gpt-3.5-turbo")
            
        Optional config:
            - base_url: Custom base URL
            - temperature: Sampling temperature (0-2)
            - max_tokens: Maximum tokens in response
            - timeout: Request timeout in seconds
            - system_message: Default system message
            - max_history_messages: Max conversation history to include
        """
        super().__init__(agent_id, config)
        
        # Required config
        self.api_key = config.get("api_key")
        if not self.api_key:
            raise ValueError(f"api_key required for OpenAI agent {agent_id}")
        
        self.model = config.get("model", "gpt-4")
        
        # Optional config
        self.base_url = config.get("base_url", "https://api.openai.com/v1")
        self.temperature = config.get("temperature", 0.7)
        self.max_tokens = config.get("max_tokens", 2000)
        self.timeout = config.get("timeout", 30)
        self.top_p = config.get("top_p", 1.0)
        self.system_message = config.get("system_message", 
                                        "You are a helpful AI assistant.")
        self.max_history_messages = config.get("max_history_messages", 20)
        
        # Client (initialized in initialize())
        self.client: Optional[AsyncOpenAI] = None
        
        # Conversation history storage (simple in-memory for now)
        self.conversations: Dict[str, List[Dict[str, str]]] = {}
        
        # Capabilities
        self.add_capability(AgentCapability.CHAT)
        self.add_capability(AgentCapability.STREAMING)
        self.add_capability(AgentCapability.WEB_SEARCH)
    
    async def initialize(self) -> bool:
        """Initialize the OpenAI client"""
        try:
            self.client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=self.timeout
            )
            self._initialized = True
            logger.info(f"✅ Initialized OpenAI agent '{self.agent_id}' with model {self.model}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to initialize OpenAI agent '{self.agent_id}': {e}")
            return False
    
    async def query(self, message: str, conversation_id: Optional[str] = None,
                   parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Send a query to the OpenAI model
        
        Args:
            message: User message
            conversation_id: Optional conversation ID for context
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
        temperature = parameters.get("temperature", self.temperature) if parameters else self.temperature
        max_tokens = parameters.get("max_tokens", self.max_tokens) if parameters else self.max_tokens
        top_p = parameters.get("top_p", self.top_p) if parameters else self.top_p
        system_message = parameters.get("system_message") if parameters else None

        # Prepare messages
        messages = self._prepare_messages(message, conversation_history, system_message)

        try:
            # Make API call
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p
            )
            
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
            
            logger.info(f"✅ OpenAI agent '{self.agent_id}' completed query (tokens: {metadata.get('tokens_used')})")
            
            return {
                "response": response_text,
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
            "max_tokens": self.max_tokens,
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