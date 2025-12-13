"""
Endpoint Agent - Supports OpenAI-compatible endpoints (Azure, custom, etc.)

This agent can connect to any OpenAI-compatible API endpoint, including:
- Azure OpenAI Service
- Custom LLM endpoints
- Other OpenAI-compatible services
"""
import logging
from typing import Dict, Any, Optional, List
from openai import AsyncOpenAI
import asyncio

from backend.agents.base import BaseAgent, AgentCapability

logger = logging.getLogger(__name__)


class EndpointAgent(BaseAgent):
    """
    Agent that connects to OpenAI-compatible endpoints
    
    Supports any endpoint that implements the OpenAI API format:
    - Azure OpenAI Service
    - Custom LLM deployments
    - Other OpenAI-compatible APIs
    """
    
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        """
        Initialize endpoint agent
        
        Required config:
            - api_key: API key for authentication
            - base_url or endpoint_url: Base URL of the API
            - model or model_name or deployment_name: Model identifier
            
        Optional config:
            - temperature: Sampling temperature (default: 0.7)
            - max_tokens: Maximum response tokens (default: 2000)
            - top_p: Nucleus sampling parameter (default: 1.0)
            - timeout: Request timeout in seconds (default: 30)
            - system_message: Default system message
            - max_history_messages: Max conversation history (default: 20)
        """
        super().__init__(agent_id, config)
        
        # Required configuration
        self.api_key = config.get('api_key')
        if not self.api_key:
            raise ValueError(f"api_key required for EndpointAgent {agent_id}")
        
        # Support both base_url and endpoint_url
        self.base_url = config.get('base_url') or config.get('endpoint_url')
        if not self.base_url:
            raise ValueError(f"base_url or endpoint_url required for EndpointAgent {agent_id}")
        
        # Handle trailing slashes for Azure endpoints
        if self.base_url and not self.base_url.endswith('/'):
            if '/openai/v1' not in self.base_url:
                self.base_url = self.base_url.rstrip('/')
            else:
                self.base_url = self.base_url.rstrip('/') + '/'
        
        # Model configuration (support multiple naming conventions)
        self.model_name = (
            config.get('model') or 
            config.get('model_name') or 
            config.get('deployment_name') or
            'gpt-4'
        )
        
        # Optional parameters
        self.temperature = config.get('temperature', 0.7)
        self.max_tokens = config.get('max_tokens', 2000)
        self.top_p = config.get('top_p', 1.0)
        self.timeout = config.get('timeout', 30)
        self.system_message = config.get('system_message', 
            'You are a helpful AI assistant.')
        self.max_history_messages = config.get('max_history_messages', 20)
        
        # Client (initialized in initialize())
        self.client: Optional[AsyncOpenAI] = None
        
        # Conversation storage
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
            logger.info(
                f"✅ Initialized EndpointAgent '{self.agent_id}' "
                f"(endpoint: {self.base_url}, model: {self.model_name})"
            )
            return True
        except Exception as e:
            logger.error(f"❌ Failed to initialize EndpointAgent '{self.agent_id}': {e}")
            return False
    
    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 chars ≈ 1 token)"""
        return len(text) // 4 + 1
    
    def _prepare_messages(
        self,
        current_message: str,
        conversation_history: List[Dict[str, str]],
        system_message: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        Prepare messages for API call with conversation context
        
        Args:
            current_message: Current user message
            conversation_history: Previous messages
            system_message: Optional override for system message
            
        Returns:
            List of messages for OpenAI API
        """
        messages = []
        
        # System message
        sys_msg = system_message or self.system_message
        messages.append({
            "role": "system",
            "content": sys_msg
        })
        
        # Estimate token budget
        tokens_used = self._estimate_tokens(sys_msg) + self._estimate_tokens(current_message)
        max_context_tokens = 8000  # Conservative estimate
        
        # Add conversation history (most recent first, chronologically)
        history_to_include = []
        for msg in reversed(conversation_history):
            if len(history_to_include) >= self.max_history_messages:
                break
            
            msg_tokens = self._estimate_tokens(msg.get("content", ""))
            if tokens_used + msg_tokens > max_context_tokens:
                break
            
            history_to_include.insert(0, msg)
            tokens_used += msg_tokens
        
        messages.extend(history_to_include)
        
        # Add current message
        messages.append({
            "role": "user",
            "content": current_message
        })
        
        logger.debug(
            f"Prepared {len(messages)} messages "
            f"({len(history_to_include)} history, estimated {tokens_used} tokens)"
        )
        
        return messages
    
    async def query(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send a query to the endpoint
        
        Args:
            message: User message
            conversation_id: Optional conversation ID for context
            parameters: Optional parameters to override defaults
                - temperature: Override temperature
                - max_tokens: Override max tokens
                - top_p: Override top_p
                - system_message: Override system message
            
        Returns:
            Dict with:
                - response: str (model response)
                - conversation_id: str (conversation ID used)
                - metadata: Dict (tokens used, model, etc.)
        """
        if not self._initialized or not self.client:
            raise RuntimeError(f"Agent {self.agent_id} not initialized")
        
        if not message or not message.strip():
            raise ValueError("Message cannot be empty")
        
        # Generate conversation ID if not provided
        if not conversation_id:
            import uuid
            conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        
        # Get or create conversation history
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
        conversation_history = self.conversations[conversation_id]
        
        # Override parameters if provided
        temperature = parameters.get('temperature', self.temperature) if parameters else self.temperature
        max_tokens = parameters.get('max_tokens', self.max_tokens) if parameters else self.max_tokens
        top_p = parameters.get('top_p', self.top_p) if parameters else self.top_p
        system_message = parameters.get('system_message') if parameters else None
        
        try:
            # Prepare messages
            messages = self._prepare_messages(
                current_message=message,
                conversation_history=conversation_history,
                system_message=system_message
            )
            
            # Make API call
            completion = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p
            )
            
            # Extract response
            if not completion.choices or len(completion.choices) == 0:
                raise RuntimeError("No choices in API response")
            
            response_text = completion.choices[0].message.content
            if not response_text:
                raise RuntimeError("Empty response from API")
            
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
            
            logger.info(
                f"✅ EndpointAgent '{self.agent_id}' completed query "
                f"(tokens: {metadata.get('tokens_used', '?')})"
            )
            
            return {
                "response": response_text.strip(),
                "conversation_id": conversation_id,
                "metadata": metadata
            }
            
        except asyncio.TimeoutError:
            logger.error(f"❌ Timeout querying EndpointAgent '{self.agent_id}'")
            raise RuntimeError("Request timed out")
        except Exception as e:
            logger.error(f"❌ Error querying EndpointAgent '{self.agent_id}': {e}")
            raise RuntimeError(f"Query failed: {str(e)}")
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.client:
            await self.client.close()
        self.conversations.clear()
        self._initialized = False
        logger.info(f"🧹 Cleaned up EndpointAgent '{self.agent_id}'")
    
    def get_type(self) -> str:
        """Get agent type"""
        return "endpoint"
    
    def _get_public_config(self) -> Dict[str, Any]:
        """Get public configuration"""
        return {
            **super()._get_public_config(),
            "base_url": self.base_url,
            "model": self.model_name,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "max_history_messages": self.max_history_messages
        }
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test the connection to the endpoint"""
        try:
            test_message = "Hello! This is a connection test. Please respond with 'Connection successful'."
            result = await self.query(test_message, conversation_id="test_connection")
            
            response = result["response"]
            
            # Check if response looks valid
            if response and not any(
                phrase in response.lower() 
                for phrase in ["error", "failed", "issue", "timeout"]
            ):
                return {
                    "success": True,
                    "message": "Connection test successful",
                    "response_preview": response[:100],
                    "endpoint_info": {
                        "base_url": self.base_url,
                        "model": self.model_name
                    }
                }
            else:
                return {
                    "success": False,
                    "message": "Connection test failed",
                    "error": response,
                    "endpoint_info": {
                        "base_url": self.base_url,
                        "model": self.model_name
                    }
                }
        
        except Exception as e:
            return {
                "success": False,
                "message": "Connection test failed",
                "error": str(e),
                "endpoint_info": {
                    "base_url": self.base_url,
                    "model": self.model_name
                }
            }