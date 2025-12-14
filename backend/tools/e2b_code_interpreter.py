"""
E2B Code Interpreter Tool - Safe code execution for endpoint agents

Provides sandboxed code execution using E2B (https://e2b.dev)
"""
import logging
import os
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class E2BCodeInterpreterTool:
    """
    E2B-based code execution tool for endpoint agents

    Executes Python code in isolated E2B sandboxes
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize E2B code interpreter

        Args:
            api_key: E2B API key (optional, reads from env if not provided)
        """
        self.api_key = api_key or os.getenv("E2B_API_KEY")
        self._e2b_available = False

        # Check if E2B is available
        try:
            import e2b_code_interpreter
            self._e2b_available = True
            logger.info("E2B Code Interpreter initialized")
        except ImportError:
            logger.warning(
                "e2b-code-interpreter not installed. "
                "Install with: pip install e2b-code-interpreter"
            )

    async def execute_code(
        self,
        code: str,
        language: str = "python",
        files: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute code in E2B sandbox

        Args:
            code: Code to execute
            language: Programming language (currently only 'python' supported)
            files: Optional list of FileMetadata objects to upload to sandbox

        Returns:
            Dict with execution results:
                - success: bool
                - output: str (stdout)
                - error: str (stderr)
                - results: List of execution results (charts, etc.)
        """
        if not self._e2b_available:
            return {
                "success": False,
                "output": "",
                "error": "E2B Code Interpreter not available. Install e2b-code-interpreter.",
                "results": []
            }

        if not self.api_key:
            return {
                "success": False,
                "output": "",
                "error": "E2B API key not configured. Set E2B_API_KEY environment variable.",
                "results": []
            }

        if language != "python":
            return {
                "success": False,
                "output": "",
                "error": f"Language '{language}' not supported. Only Python is currently supported.",
                "results": []
            }

        try:
            from e2b_code_interpreter import Sandbox

            # Create sandbox and execute code
            async with Sandbox(api_key=self.api_key) as sandbox:
                # Upload files if provided
                if files:
                    for file_meta in files:
                        try:
                            with open(file_meta.filepath, 'rb') as f:
                                file_content = f.read()
                            sandbox.files.write(file_meta.filename, file_content)
                            logger.info(f"Uploaded {file_meta.filename} to E2B sandbox")
                        except Exception as e:
                            logger.warning(f"Failed to upload {file_meta.filename}: {e}")

                # Execute code
                execution = sandbox.run_code(code)

                # Process results
                output = []
                errors = []
                results = []

                for log in execution.logs.stdout:
                    output.append(log)

                for log in execution.logs.stderr:
                    errors.append(log)

                # Check for execution results (charts, images, etc.)
                if execution.results:
                    for result in execution.results:
                        results.append({
                            "type": result.type if hasattr(result, 'type') else 'unknown',
                            "data": str(result)
                        })

                return {
                    "success": execution.error is None,
                    "output": "\n".join(output),
                    "error": str(execution.error) if execution.error else "\n".join(errors),
                    "results": results
                }

        except Exception as e:
            logger.error(f"E2B code execution failed: {e}")
            return {
                "success": False,
                "output": "",
                "error": f"Execution failed: {str(e)}",
                "results": []
            }

    def format_execution_context(self, execution_result: Dict[str, Any]) -> str:
        """
        Format execution result for prompt injection

        Args:
            execution_result: Result from execute_code()

        Returns:
            Formatted context string
        """
        if not execution_result["success"]:
            return f"""
=== CODE EXECUTION FAILED ===
Error: {execution_result['error']}
=== END CODE EXECUTION ===
"""

        parts = ["=== CODE EXECUTION RESULTS ===\n"]

        if execution_result["output"]:
            parts.append(f"Output:\n{execution_result['output']}\n")

        if execution_result["results"]:
            parts.append("\nGenerated Results:")
            for i, result in enumerate(execution_result["results"], 1):
                parts.append(f"\n  {i}. {result['type']}: {result['data']}")

        parts.append("\n=== END CODE EXECUTION ===")

        return "\n".join(parts)

    def is_configured(self) -> bool:
        """Check if E2B is properly configured"""
        return self._e2b_available and bool(self.api_key)

    def get_status(self) -> Dict[str, Any]:
        """Get tool status"""
        return {
            "available": self._e2b_available,
            "configured": self.is_configured(),
            "api_key_set": bool(self.api_key),
            "supported_languages": ["python"]
        }
