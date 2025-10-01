"""
logging_config.py - Centralized logging configuration
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from datetime import datetime


class ColoredFormatter(logging.Formatter):
    """
    Custom formatter with colors for console output
    """
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
        'RESET': '\033[0m'        # Reset
    }
    
    def format(self, record):
        # Add color to level name
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{self.COLORS['RESET']}"
        
        # Format the message
        result = super().format(record)
        
        # Reset levelname for other handlers
        record.levelname = levelname
        
        return result


def setup_logging(
    log_level: str = "INFO",
    log_to_file: bool = True,
    log_dir: str = "logs",
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
):
    """
    Set up logging configuration for the application
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_to_file: Whether to log to file
        log_dir: Directory for log files
        max_bytes: Max size of log file before rotation
        backup_count: Number of backup log files to keep
    """
    
    # Convert log level string to logging constant
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Create logs directory if needed
    if log_to_file:
        log_path = Path(log_dir)
        log_path.mkdir(exist_ok=True)
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Remove existing handlers
    root_logger.handlers = []
    
    # Console handler with colors
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_formatter = ColoredFormatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler with rotation
    if log_to_file:
        log_file = log_path / f"app_{datetime.now().strftime('%Y%m%d')}.log"
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count
        )
        file_handler.setLevel(numeric_level)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        root_logger.addHandler(file_handler)
    
    # Set specific loggers to different levels if needed
    # For example, reduce noise from some libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    
    # Log startup message
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured - Level: {log_level}")
    if log_to_file:
        logger.info(f"Logs will be written to: {log_file}")
    
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name
    
    Usage:
        logger = get_logger(__name__)
        logger.info("Message")
    """
    return logging.getLogger(name)


# Utility functions for structured logging

def log_agent_activity(logger: logging.Logger, agent_id: str, action: str, 
                       details: dict = None, level: str = "INFO"):
    """
    Log agent activity in a structured format
    
    Example:
        log_agent_activity(logger, "gpt4_assistant", "chat_completed", 
                          {"tokens": 150, "duration": 2.5})
    """
    message = f"[Agent: {agent_id}] {action}"
    if details:
        detail_str = ", ".join([f"{k}={v}" for k, v in details.items()])
        message += f" - {detail_str}"
    
    log_level = getattr(logging, level.upper(), logging.INFO)
    logger.log(log_level, message)


def log_api_call(logger: logging.Logger, endpoint: str, method: str,
                duration: float, status_code: int, details: dict = None):
    """
    Log API call in a structured format
    
    Example:
        log_api_call(logger, "/api/agents/chat", "POST", 1.23, 200, 
                    {"agent": "gpt4", "tokens": 150})
    """
    message = f"[API] {method} {endpoint} - {status_code} - {duration:.3f}s"
    if details:
        detail_str = ", ".join([f"{k}={v}" for k, v in details.items()])
        message += f" - {detail_str}"
    
    if status_code >= 500:
        logger.error(message)
    elif status_code >= 400:
        logger.warning(message)
    else:
        logger.info(message)


def log_workflow_execution(logger: logging.Logger, workflow_id: str, 
                          task: str, status: str, duration: float = None,
                          details: dict = None):
    """
    Log workflow execution in a structured format
    
    Example:
        log_workflow_execution(logger, "developer_workflow", "create_api", 
                              "completed", 45.2, {"files": 10})
    """
    message = f"[Workflow: {workflow_id}] Task: {task} - Status: {status}"
    
    if duration:
        message += f" - Duration: {duration:.2f}s"
    
    if details:
        detail_str = ", ".join([f"{k}={v}" for k, v in details.items()])
        message += f" - {detail_str}"
    
    if status == "failed":
        logger.error(message)
    elif status == "completed":
        logger.info(message)
    else:
        logger.debug(message)


# Example usage
if __name__ == "__main__":
    # Set up logging
    setup_logging(log_level="DEBUG", log_to_file=True)
    
    # Get logger
    logger = get_logger(__name__)
    
    # Test different log levels
    logger.debug("Debug message")
    logger.info("Info message")
    logger.warning("Warning message")
    logger.error("Error message")
    
    # Test structured logging
    log_agent_activity(logger, "test_agent", "initialized", {"model": "gpt-4"})
    log_api_call(logger, "/api/agents/test/chat", "POST", 1.234, 200, {"tokens": 150})
    log_workflow_execution(logger, "test_workflow", "test_task", "completed", 5.5, {"files": 3})