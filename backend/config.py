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
    PORT: int = 3000
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:8000",  # Frontend (Vite dev server)
        "http://localhost:3000",  # Backend (for same-origin requests)
        "http://localhost:5173",  # Vite default port
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

    # File Upload Configuration
    FILE_UPLOAD_DIR: str = "backend/temp/files"
    MAX_FILE_SIZE: int = 256 * 1024 * 1024  # 256 MB in bytes

    # Optional: Anthropic
    ANTHROPIC_API_KEY: str = ""

    # Knowledge Management Server Configuration
    KM_SERVER_URL: str = "http://localhost:11000"
    KM_CONNECTIONS_FILE: str = "backend/data/km_connections.json"
    KM_ENCRYPTION_KEY: str = ""  # Auto-generated if not set

    class Config:
        env_file = ["backend/.env", ".env"]  # Look in backend/.env first, then .env
        case_sensitive = True
        extra = "ignore"  # Ignore extra env vars not defined in Settings
    
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