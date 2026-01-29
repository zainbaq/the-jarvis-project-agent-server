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
    PORT: int = 8000  # Default backend port
    FRONTEND_PORT: int = 3000  # Default frontend port
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # CORS - can be overridden via CORS_ORIGINS env var (comma-separated or JSON array)
    # Default allows common development ports; set explicitly in production
    CORS_ORIGINS: List[str] = []  # Will be populated dynamically in __init__
    
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
        import json

        # Ensure CORS_ORIGINS is a list
        if isinstance(self.CORS_ORIGINS, str) and self.CORS_ORIGINS:
            # Parse JSON string if it's a string
            try:
                self.CORS_ORIGINS = json.loads(self.CORS_ORIGINS)
            except json.JSONDecodeError:
                # Fall back to comma-separated
                self.CORS_ORIGINS = [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

        # If CORS_ORIGINS is empty, dynamically generate based on ports
        if not self.CORS_ORIGINS:
            # Allow localhost with various common ports
            self.CORS_ORIGINS = [
                f"http://localhost:{self.FRONTEND_PORT}",
                f"http://127.0.0.1:{self.FRONTEND_PORT}",
                f"http://localhost:{self.PORT}",
                f"http://127.0.0.1:{self.PORT}",
            ]
            # Add common dev ports as fallback
            for port in [3000, 3001, 5173, 4173, 8000, 8080]:
                origin = f"http://localhost:{port}"
                if origin not in self.CORS_ORIGINS:
                    self.CORS_ORIGINS.append(origin)


# Create global settings instance
settings = Settings()