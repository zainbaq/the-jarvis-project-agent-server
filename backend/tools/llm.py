"""
LLM provider factory for workflow steps
"""
from langchain_openai import ChatOpenAI

from typing import Optional


def get_llm(
    provider: str = "openai",
    api_key: str = None,
    model_name: str = "gpt-4",
    temperature: float = 0.0,
    max_tokens: Optional[int] = None
):
    """
    Factory function to get an LLM instance based on provider
    
    Args:
        provider: LLM provider (openai, anthropic, etc.)
        api_key: API key for the provider
        model_name: Model name to use
        temperature: Temperature for generation
        max_tokens: Maximum tokens for generation
        
    Returns:
        LangChain LLM instance
    """
    provider = (provider or "openai").lower()
    
    if provider == "openai":
        kwargs = {
            "model": model_name,
            "temperature": temperature,
            "api_key": api_key
        }
        if max_tokens:
            kwargs["max_tokens"] = max_tokens
        return ChatOpenAI(**kwargs)
    
    elif provider == "anthropic":
        try:
            from langchain_anthropic import ChatAnthropic
            kwargs = {
                "model": model_name,
                "temperature": temperature,
                "anthropic_api_key": api_key
            }
            if max_tokens:
                kwargs["max_tokens"] = max_tokens
            return ChatAnthropic(**kwargs)
        except ImportError:
            raise ImportError(
                "anthropic package not installed. "
                "Install with: pip install anthropic langchain-anthropic"
            )
    
    else:
        raise ValueError(f"Unsupported provider: {provider}")