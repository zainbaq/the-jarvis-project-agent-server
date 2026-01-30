"""
FastAPI Authentication Dependencies

Provides dependency injection for route-level authentication.
"""
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging

from backend.auth.cognito import (
    CognitoUser,
    get_token_validator,
    is_auth_configured
)

logger = logging.getLogger(__name__)

# HTTP Bearer token security scheme
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> CognitoUser:
    """
    FastAPI dependency for protected routes requiring authentication.

    Extracts Bearer token from Authorization header, validates it,
    and returns the authenticated user.

    Also stores user in request.state.user for access throughout request lifecycle.

    Usage:
        @router.get("/protected")
        async def protected_route(user: CognitoUser = Depends(get_current_user)):
            return {"user_id": user.sub}

    Raises:
        HTTPException 401: If no token provided or token is invalid
        HTTPException 503: If auth system is not configured
    """
    validator = get_token_validator()
    if validator is None:
        logger.error("Authentication requested but Cognito is not configured")
        raise HTTPException(
            status_code=503,
            detail="Authentication service not configured"
        )

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials

    try:
        user = validator.validate_token(token)
        request.state.user = user
        logger.debug(f"Authenticated user: {user.sub}")
        return user

    except Exception as e:
        logger.warning(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[CognitoUser]:
    """
    FastAPI dependency for routes that work with or without authentication.

    If a valid token is provided, returns the user.
    If no token is provided or token is invalid, returns None.

    Also stores user in request.state.user if authenticated.

    Usage:
        @router.get("/semi-protected")
        async def semi_protected(user: Optional[CognitoUser] = Depends(get_optional_user)):
            if user:
                return {"message": f"Hello, {user.email}"}
            return {"message": "Hello, anonymous user"}
    """
    validator = get_token_validator()
    if validator is None:
        return None

    if credentials is None:
        return None

    token = credentials.credentials

    try:
        user = validator.validate_token(token)
        request.state.user = user
        logger.debug(f"Optionally authenticated user: {user.sub}")
        return user

    except Exception:
        return None


async def require_auth_if_configured(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[CognitoUser]:
    """
    Dependency that requires auth only if Cognito is configured.

    Useful during development/transition period:
    - If Cognito is configured: requires valid token
    - If Cognito is not configured: allows through without auth

    Usage:
        @router.get("/conditional")
        async def conditional_route(
            user: Optional[CognitoUser] = Depends(require_auth_if_configured)
        ):
            if user:
                return {"authenticated": True, "user": user.sub}
            return {"authenticated": False, "message": "Auth not configured"}
    """
    validator = get_token_validator()

    if validator is None:
        logger.debug("Auth not configured, allowing through")
        return None

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials

    try:
        user = validator.validate_token(token)
        request.state.user = user
        return user
    except Exception as e:
        logger.warning(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
