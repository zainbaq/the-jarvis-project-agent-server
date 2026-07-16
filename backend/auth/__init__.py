"""
Authentication module for AWS Cognito integration
"""
from backend.auth.cognito import (
    CognitoUser,
    CognitoTokenValidator,
    get_token_validator,
    initialize_token_validator,
    is_auth_configured
)
from backend.auth.dependencies import (
    get_current_user,
    get_optional_user,
    require_auth_if_configured
)

__all__ = [
    "CognitoUser",
    "CognitoTokenValidator",
    "get_token_validator",
    "initialize_token_validator",
    "is_auth_configured",
    "get_current_user",
    "get_optional_user",
    "require_auth_if_configured"
]
