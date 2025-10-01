"""
middleware.py - Custom middleware for error handling, logging, and request tracking
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import time
import uuid
from typing import Callable

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging all requests with timing and request IDs
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Log request start
        start_time = time.time()
        logger.info(
            f"Request started: {request.method} {request.url.path} "
            f"[ID: {request_id[:8]}]"
        )
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log request completion
            logger.info(
                f"Request completed: {request.method} {request.url.path} "
                f"[ID: {request_id[:8]}] Status: {response.status_code} "
                f"Duration: {duration:.3f}s"
            )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            # Calculate duration
            duration = time.time() - start_time
            
            # Log error
            logger.error(
                f"Request failed: {request.method} {request.url.path} "
                f"[ID: {request_id[:8]}] Error: {str(e)} "
                f"Duration: {duration:.3f}s"
            )
            
            # Re-raise to let error handlers deal with it
            raise


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for catching and formatting errors consistently
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        try:
            return await call_next(request)
        except Exception as exc:
            # Get request ID if available
            request_id = getattr(request.state, "request_id", "unknown")
            
            # Log the error
            logger.error(
                f"Unhandled exception [ID: {request_id[:8] if request_id != 'unknown' else 'unknown'}]: {exc}",
                exc_info=True
            )
            
            # Return formatted error response
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "Internal server error",
                    "detail": str(exc) if logger.level == logging.DEBUG else "An unexpected error occurred",
                    "request_id": request_id
                }
            )


# Exception handlers for FastAPI

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors from Pydantic models
    """
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.warning(
        f"Validation error [ID: {request_id[:8] if request_id != 'unknown' else 'unknown'}]: {exc.errors()}"
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "detail": exc.errors(),
            "request_id": request_id
        }
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Handle HTTP exceptions
    """
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.warning(
        f"HTTP exception [ID: {request_id[:8] if request_id != 'unknown' else 'unknown'}]: "
        f"{exc.status_code} - {exc.detail}"
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "request_id": request_id
        }
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """
    Handle any other exceptions
    """
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.error(
        f"Unhandled exception [ID: {request_id[:8] if request_id != 'unknown' else 'unknown'}]: {exc}",
        exc_info=True
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "detail": str(exc) if logger.level == logging.DEBUG else "An unexpected error occurred",
            "request_id": request_id
        }
    )


def setup_middleware(app):
    """
    Set up all middleware for the application
    """
    # Add custom middleware
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(ErrorHandlingMiddleware)
    
    # Add exception handlers
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
    
    logger.info("✅ Middleware configured")