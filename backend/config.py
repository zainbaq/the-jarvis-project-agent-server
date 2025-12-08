"""
Configuration management using pydantic-settings
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:5173",  # Vite dev server
        "http://localhost:4173",  # Vite preview server
    ]
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4"
    
    # LangGraph Settings
    LANGGRAPH_RECURSION_LIMIT: int = 100
    
    # Agent Configuration
    AGENT_CONFIG_PATH: str = "config/agents.json"
    
    # Storage
    TEMP_DIR: str = "temp"
    
    # Optional: Anthropic
    ANTHROPIC_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure CORS_ORIGINS is a list
        if isinstance(self.CORS_ORIGINS, str):
            # Parse JSON string if it's a string
            import json
            try:
                self.CORS_ORIGINS = json.loads(self.CORS_ORIGINS)
            except json.JSONDecodeError:
                # Fall back to comma-separated
                self.CORS_ORIGINS = [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


# Create global settings instance
settings = Settings()