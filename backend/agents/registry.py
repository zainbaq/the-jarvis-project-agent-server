"""
Agent registry for managing all available agents - FIXED VERSION
"""
import logging
import json
import os
import re
from typing import Dict, List, Optional
from pathlib import Path

from agents.base import BaseAgent
from agents.openai_agent import OpenAIAgent
from agents.langgraph_agent import LangGraphAgent
from models.responses import AgentInfo, AgentType

logger = logging.getLogger(__name__)


class AgentRegistry:
    """
    Central registry for managing all agents
    
    Handles loading, initialization, and access to agents
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the registry
        
        Args:
            config_path: Path to agents configuration file (JSON)
        """
        self.config_path = config_path or "config/agents.json"
        self.agents: Dict[str, BaseAgent] = {}
        self._initialized = False
    
    def _substitute_env_vars(self, value: any) -> any:
        """
        Recursively substitute environment variables in configuration
        
        Supports ${VAR_NAME} syntax
        """
        if isinstance(value, str):
            # Find all ${VAR_NAME} patterns
            pattern = r'\$\{([^}]+)\}'
            matches = re.finditer(pattern, value)
            
            result = value
            for match in matches:
                var_name = match.group(1)
                env_value = os.getenv(var_name, "")
                
                if not env_value:
                    logger.warning(f"Environment variable {var_name} not found")
                
                # Replace the ${VAR_NAME} with the actual value
                result = result.replace(match.group(0), env_value)
            
            return result
        
        elif isinstance(value, dict):
            return {k: self._substitute_env_vars(v) for k, v in value.items()}
        
        elif isinstance(value, list):
            return [self._substitute_env_vars(item) for item in value]
        
        else:
            return value
    
    async def initialize(self):
        """Load and initialize all agents from configuration"""
        logger.info("🔄 Initializing agent registry...")
        
        # Load agent configurations
        agent_configs = self._load_agent_configs()
        
        if not agent_configs:
            logger.warning("⚠️  No agent configurations found, using defaults")
            agent_configs = self._get_default_configs()
        
        # Substitute environment variables in all configs
        agent_configs = self._substitute_env_vars(agent_configs)
        
        # Initialize each agent
        success_count = 0
        for agent_config in agent_configs:
            try:
                agent = await self._create_agent(agent_config)
                if agent:
                    self.agents[agent.agent_id] = agent
                    success_count += 1
            except Exception as e:
                logger.error(
                    f"Failed to create agent {agent_config.get('agent_id', 'unknown')}: {e}",
                    exc_info=True
                )
        
        self._initialized = True
        logger.info(f"✅ Initialized {success_count}/{len(agent_configs)} agents")
        
        if success_count == 0 and len(agent_configs) > 0:
            logger.error("❌ Failed to initialize any agents!")
    
    def _load_agent_configs(self) -> List[Dict]:
        """Load agent configurations from JSON file"""
        config_file = Path(self.config_path)
        
        if not config_file.exists():
            logger.warning(f"Config file not found: {self.config_path}")
            return []
        
        try:
            with open(config_file, 'r') as f:
                data = json.load(f)
                
            # Support both {"agents": [...]} and direct array format
            if isinstance(data, dict) and "agents" in data:
                return data["agents"]
            elif isinstance(data, list):
                return data
            else:
                logger.error(f"Invalid config format in {self.config_path}")
                return []
                
        except Exception as e:
            logger.error(f"Error loading agent configs: {e}", exc_info=True)
            return []
    
    def _get_default_configs(self) -> List[Dict]:
        """Get default agent configurations"""
        defaults = []
        
        # Add default OpenAI agent if API key is available
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            defaults.append({
                "agent_id": "openai_default",
                "name": "Default OpenAI Agent",
                "type": "openai",
                "description": "Default OpenAI GPT-4 agent",
                "config": {
                    "api_key": openai_key,
                    "model": "gpt-4",
                    "temperature": 0.7
                }
            })
        else:
            logger.warning("No OPENAI_API_KEY found in environment")
        
        return defaults
    
    async def _create_agent(self, agent_config: Dict) -> Optional[BaseAgent]:
        """
        Create an agent from configuration
        
        Args:
            agent_config: Dict with agent_id, type, name, description, config
            
        Returns:
            BaseAgent instance or None if creation failed
        """
        agent_id = agent_config.get("agent_id")
        agent_type = agent_config.get("type")
        config = agent_config.get("config", {})
        
        # Add metadata to config
        config["name"] = agent_config.get("name", agent_id)
        config["description"] = agent_config.get("description", "")
        
        if not agent_id or not agent_type:
            logger.error("Agent config missing agent_id or type")
            return None
        
        # Validate that required fields are present
        if agent_type == "openai" or agent_type == AgentType.OPENAI:
            if not config.get("api_key"):
                logger.error(f"Agent {agent_id}: Missing api_key")
                return None
        
        # Create agent based on type
        agent = None
        
        try:
            if agent_type == "openai" or agent_type == AgentType.OPENAI:
                agent = OpenAIAgent(agent_id, config)
            elif agent_type == "langgraph" or agent_type == AgentType.LANGGRAPH:
                agent = LangGraphAgent(agent_id, config)
            else:
                logger.error(f"Unknown agent type: {agent_type}")
                return None
            
            # Initialize the agent
            success = await agent.initialize()
            
            if not success:
                logger.error(f"Failed to initialize agent: {agent_id}")
                return None
            
            logger.info(f"✅ Created agent: {agent_id} ({agent_type})")
            return agent
            
        except Exception as e:
            logger.error(f"Error creating agent {agent_id}: {e}", exc_info=True)
            return None
    
    def get_agent(self, agent_id: str) -> Optional[BaseAgent]:
        """Get an agent by ID"""
        return self.agents.get(agent_id)
    
    def list_agents(self) -> List[AgentInfo]:
        """List all available agents"""
        return [agent.get_info() for agent in self.agents.values()]
    
    def get_agents_by_type(self, agent_type: str) -> List[BaseAgent]:
        """Get all agents of a specific type"""
        return [
            agent for agent in self.agents.values()
            if agent.get_type() == agent_type
        ]
    
    def get_agents_by_capability(self, capability: str) -> List[BaseAgent]:
        """Get all agents with a specific capability"""
        from agents.base import AgentCapability
        
        try:
            cap = AgentCapability(capability)
            return [
                agent for agent in self.agents.values()
                if agent.has_capability(cap)
            ]
        except ValueError:
            logger.warning(f"Invalid capability: {capability}")
            return []
    
    async def cleanup(self):
        """Cleanup all agents"""
        logger.info("🧹 Cleaning up agent registry...")
        
        for agent in self.agents.values():
            try:
                await agent.cleanup()
            except Exception as e:
                logger.error(f"Error cleaning up agent {agent.agent_id}: {e}")
        
        self.agents.clear()
        self._initialized = False
        logger.info("✅ Agent registry cleaned up")
    
    def is_initialized(self) -> bool:
        """Check if registry is initialized"""
        return self._initialized
    
    def get_registry_info(self) -> Dict:
        """Get information about the registry"""
        return {
            "initialized": self._initialized,
            "total_agents": len(self.agents),
            "agents_by_type": {
                "openai": len(self.get_agents_by_type("openai")),
                "langgraph": len(self.get_agents_by_type("langgraph")),
            },
            "config_path": self.config_path
        }