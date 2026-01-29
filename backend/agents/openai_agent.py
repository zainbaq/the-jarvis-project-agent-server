"""
OpenAI-based agent implementation using Responses API with file search and code interpreter support
"""
import logging
import os
import uuid
import base64
import re
from typing import Dict, Any, Optional, List, AsyncGenerator
from datetime import datetime
from openai import AsyncOpenAI
import asyncio

from backend.agents.base import BaseAgent, AgentCapability
from backend.models.responses import GeneratedFile, CodeExecutionResult

logger = logging.getLogger(__name__)


class OpenAIAgent(BaseAgent):
    """
    Agent that uses OpenAI API for chat completions
    """
    
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        """
        Initialize OpenAI agent with Responses API support

        Required config:
            - api_key: OpenAI API key
            - model: Model name (e.g., "gpt-4o", "gpt-4", "gpt-3.5-turbo")

        Optional config:
            - base_url: Custom base URL
            - temperature: Sampling temperature (0-2)
            - max_tokens: Maximum tokens in response
            - timeout: Request timeout in seconds
            - system_message: Default system message
            - max_history_messages: Max conversation history to include
            - enable_file_search: Enable file search tool (default: False)
            - enable_code_interpreter: Enable code interpreter tool (default: False)
        """
        super().__init__(agent_id, config)

        # Required config
        self.api_key = config.get("api_key")
        if not self.api_key:
            raise ValueError(f"api_key required for OpenAI agent {agent_id}")

        self.model = config.get("model", "gpt-4o")

        # Optional config
        self.base_url = config.get("base_url")
        self.temperature = config.get("temperature", 0.7)
        # self.max_tokens = config.get("max_tokens", 2000)
        self.timeout = config.get("timeout", 30)
        self.top_p = config.get("top_p", 1.0)
        self.system_message = config.get("system_message",
                                        "You are a helpful AI assistant.")
        self.max_history_messages = config.get("max_history_messages", 20)

        # Tool configuration
        self.enable_file_search = config.get("enable_file_search", False)
        self.enable_code_interpreter = config.get("enable_code_interpreter", False)

        # Client (initialized in initialize())
        self.client: Optional[AsyncOpenAI] = None

        # Conversation history storage (simple in-memory for now)
        self.conversations: Dict[str, List[Dict[str, str]]] = {}

        # OpenAI resource tracking for file operations
        self.vector_stores: Dict[str, str] = {}  # conversation_id → vector_store_id
        self.openai_files: Dict[str, List[str]] = {}  # conversation_id → [file_ids]

        # Assistants API tracking for code interpreter
        self.assistants: Dict[str, str] = {}  # conversation_id → assistant_id
        self.threads: Dict[str, str] = {}  # conversation_id → thread_id

        # Generated files storage directory
        self.generated_files_dir = "backend/temp/generated"

        # Capabilities
        self.add_capability(AgentCapability.CHAT)
        self.add_capability(AgentCapability.STREAMING)
        self.add_capability(AgentCapability.WEB_SEARCH)

        if self.enable_file_search:
            self.add_capability(AgentCapability.FILE_PROCESSING)
        if self.enable_code_interpreter:
            self.add_capability(AgentCapability.CODE_GENERATION)
    
    async def initialize(self) -> bool:
        """Initialize the OpenAI client"""
        try:
            client_args = {
                "api_key": self.api_key,
                "timeout": self.timeout
            }
            if self.base_url:
                client_args["base_url"] = self.base_url

            self.client = AsyncOpenAI(**client_args)
            self._initialized = True

            tools_enabled = []
            if self.enable_file_search:
                tools_enabled.append("file_search")
            if self.enable_code_interpreter:
                tools_enabled.append("code_interpreter")

            tools_msg = f" with tools: {', '.join(tools_enabled)}" if tools_enabled else ""
            logger.info(f"✅ Initialized OpenAI agent '{self.agent_id}' with model {self.model}{tools_msg}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to initialize OpenAI agent '{self.agent_id}': {e}")
            return False
    
    async def query(self, message: str, conversation_id: Optional[str] = None,
                   system_message: Optional[str] = None,
                   parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Send a query to the OpenAI model with tool support

        Args:
            message: User message
            conversation_id: Optional conversation ID for context
            system_message: Optional system message override
            parameters: Optional parameters to override defaults (temperature, max_tokens, etc.)

        Returns:
            Dict with:
                - response: str (model response)
                - conversation_id: str (conversation ID used)
                - metadata: Dict (tokens used, model, etc.)
        """
        if not self._initialized or not self.client:
            raise RuntimeError(f"Agent {self.agent_id} not initialized")

        # Generate conversation ID if not provided
        if not conversation_id:
            import uuid
            conversation_id = f"conv_{uuid.uuid4().hex[:12]}"

        # Get or create conversation history
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []

        conversation_history = self.conversations[conversation_id]

        # Override parameters if provided
        params = parameters or {}
        temperature = params.get("temperature", self.temperature)
        # max_tokens = params.get("max_tokens", self.max_tokens)
        top_p = params.get("top_p", self.top_p)

        # Prepare messages
        messages = self._prepare_messages(message, conversation_history, system_message)

        # Build request parameters
        request_params = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p
        }

        # Add tools if enabled and resources are available
        tools = []
        if self.enable_file_search and conversation_id in self.vector_stores:
            tools.append({
                "type": "file_search",
                "file_search": {
                    "vector_store_ids": [self.vector_stores[conversation_id]]
                }
            })

        if self.enable_code_interpreter and conversation_id in self.openai_files:
            tools.append({"type": "code_interpreter"})

        if tools:
            request_params["tools"] = tools

            # Add tool resources for code_interpreter
            if self.enable_code_interpreter and conversation_id in self.openai_files:
                request_params["tool_resources"] = {
                    "code_interpreter": {
                        "file_ids": self.openai_files[conversation_id]
                    }
                }

        try:
            # Make API call
            completion = await self.client.chat.completions.create(**request_params)

            # Extract response
            response_text = completion.choices[0].message.content

            # Update conversation history
            conversation_history.append({"role": "user", "content": message})
            conversation_history.append({"role": "assistant", "content": response_text})

            # Trim history if too long
            if len(conversation_history) > self.max_history_messages * 2:
                self.conversations[conversation_id] = conversation_history[-(self.max_history_messages * 2):]

            # Prepare metadata
            metadata = {
                "model": completion.model,
                "tokens_used": completion.usage.total_tokens if completion.usage else None,
                "prompt_tokens": completion.usage.prompt_tokens if completion.usage else None,
                "completion_tokens": completion.usage.completion_tokens if completion.usage else None,
                "finish_reason": completion.choices[0].finish_reason
            }

            logger.info(f"✅ OpenAI agent '{self.agent_id}' completed query (tokens: {metadata.get('tokens_used', '?')})")

            return {
                "response": response_text.strip(),
                "conversation_id": conversation_id,
                "metadata": metadata
            }

        except asyncio.TimeoutError:
            logger.error(f"❌ Timeout querying OpenAI agent '{self.agent_id}'")
            raise RuntimeError("Request timed out")
        except Exception as e:
            logger.error(f"❌ Error querying OpenAI agent '{self.agent_id}': {e}")
            raise RuntimeError(f"Query failed: {str(e)}")

    async def query_stream(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        system_message: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream response tokens from the OpenAI model

        Args:
            message: User message
            conversation_id: Optional conversation ID for context
            system_message: Optional system message override
            parameters: Optional parameters to override defaults

        Yields:
            Dict with type and data:
                - {"type": "token", "data": "text chunk"}
                - {"type": "done", "data": {"conversation_id": ..., "response": ...}}
        """
        if not self._initialized or not self.client:
            raise RuntimeError(f"Agent {self.agent_id} not initialized")

        # Generate conversation ID if not provided
        if not conversation_id:
            import uuid
            conversation_id = f"conv_{uuid.uuid4().hex[:12]}"

        # Get or create conversation history
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []

        conversation_history = self.conversations[conversation_id]

        # Override parameters if provided
        params = parameters or {}
        temperature = params.get("temperature", self.temperature)
        top_p = params.get("top_p", self.top_p)

        # Prepare messages
        messages = self._prepare_messages(message, conversation_history, system_message)

        # Build request parameters
        request_params = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            "stream": True
        }

        try:
            # Create streaming completion
            stream = await self.client.chat.completions.create(**request_params)

            full_response = ""
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    full_response += token
                    yield {"type": "token", "data": token}

            # Update conversation history
            conversation_history.append({"role": "user", "content": message})
            conversation_history.append({"role": "assistant", "content": full_response})

            # Trim history if too long
            if len(conversation_history) > self.max_history_messages * 2:
                self.conversations[conversation_id] = conversation_history[-(self.max_history_messages * 2):]

            logger.info(f"✅ OpenAI agent '{self.agent_id}' completed streaming query")

            # Yield completion
            yield {
                "type": "done",
                "data": {
                    "conversation_id": conversation_id,
                    "response": full_response.strip()
                }
            }

        except asyncio.TimeoutError:
            logger.error(f"❌ Timeout streaming from OpenAI agent '{self.agent_id}'")
            yield {"type": "error", "data": "Request timed out"}
        except Exception as e:
            logger.error(f"❌ Error streaming from OpenAI agent '{self.agent_id}': {e}")
            yield {"type": "error", "data": str(e)}

    def _prepare_messages(self, current_message: str,
                         conversation_history: List[Dict[str, str]],
                         system_message: Optional[str] = None) -> List[Dict[str, str]]:
        """Prepare messages for API call with conversation context"""
        messages = [{"role": "system", "content": system_message or self.system_message}]

        # Add conversation history (limited)
        history_to_include = conversation_history[-(self.max_history_messages * 2):]
        messages.extend(history_to_include)

        # Add current message
        messages.append({"role": "user", "content": current_message})

        return messages

    async def upload_file(
        self,
        conversation_id: str,
        file_path: str,
        purpose: str = "assistants"
    ) -> str:
        """
        Upload file to OpenAI

        Args:
            conversation_id: Conversation ID for tracking
            file_path: Local file path
            purpose: "assistants" for file_search, "vision" for code_interpreter

        Returns:
            OpenAI file_id
        """
        if not self.client:
            raise RuntimeError("Client not initialized")

        try:
            with open(file_path, "rb") as f:
                file_obj = await self.client.files.create(
                    file=f,
                    purpose=purpose
                )

            # Track file
            if conversation_id not in self.openai_files:
                self.openai_files[conversation_id] = []
            self.openai_files[conversation_id].append(file_obj.id)

            logger.info(f"📤 Uploaded file {file_obj.id} for conversation {conversation_id}")
            return file_obj.id

        except Exception as e:
            logger.error(f"❌ Failed to upload file: {e}")
            raise

    async def get_or_create_vector_store(
        self,
        conversation_id: str,
        file_ids: List[str]
    ) -> str:
        """
        Get existing or create new vector store for file_search

        Vector stores are conversation-scoped

        Args:
            conversation_id: Conversation ID
            file_ids: List of OpenAI file IDs to add to the vector store

        Returns:
            vector_store_id
        """
        if not self.client:
            raise RuntimeError("Client not initialized")

        # Check if exists
        if conversation_id in self.vector_stores:
            logger.info(f"Using existing vector store for conversation {conversation_id}")
            return self.vector_stores[conversation_id]

        # Create new
        try:
            vector_store = await self.client.beta.vector_stores.create(
                name=f"conversation_{conversation_id}",
                file_ids=file_ids
            )

            self.vector_stores[conversation_id] = vector_store.id
            logger.info(f"📚 Created vector store {vector_store.id} for conversation {conversation_id}")
            return vector_store.id

        except Exception as e:
            logger.error(f"❌ Failed to create vector store: {e}")
            raise

    async def query_with_files(
        self,
        message: str,
        conversation_id: str,
        file_metadata_list: List[Any],
        use_file_search: bool = False,
        use_code_interpreter: bool = False,
        system_message: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Query with file attachments using OpenAI native tools

        Args:
            message: User message
            conversation_id: Conversation ID
            file_metadata_list: List of FileMetadata objects with local file paths
            use_file_search: Enable file_search tool
            use_code_interpreter: Enable code_interpreter tool
            system_message: Optional system message override
            parameters: Additional parameters

        Returns:
            Dict with response, metadata, and tool information
        """
        if not self.enable_file_search and not self.enable_code_interpreter:
            logger.warning("File tools not enabled for this agent")

        # Upload files to OpenAI
        file_ids = []
        for file_meta in file_metadata_list:
            purpose = "assistants" if use_file_search else "vision"
            file_id = await self.upload_file(
                conversation_id=conversation_id,
                file_path=file_meta.filepath,
                purpose=purpose
            )
            file_ids.append(file_id)

        # Create vector store if using file_search
        if use_file_search and file_ids:
            vector_store_id = await self.get_or_create_vector_store(
                conversation_id=conversation_id,
                file_ids=file_ids
            )
            logger.info(f"🔍 File search enabled with vector store {vector_store_id}")

        # Now call regular query() which will pick up the tools
        query_result = await self.query(
            message=message,
            conversation_id=conversation_id,
            system_message=system_message,
            parameters=parameters
        )

        # Extract response and merge metadata
        return {
            "response": query_result["response"],
            "conversation_id": query_result["conversation_id"],
            "metadata": {
                **query_result.get("metadata", {}),
                "tool_used": "file_search" if use_file_search else "code_interpreter",
                "files_processed": len(file_ids)
            }
        }

    async def query_with_code_interpreter(
        self,
        message: str,
        conversation_id: str,
        uploaded_files: Optional[List[Any]] = None,
        system_message: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Query using OpenAI Responses API with code_interpreter tool enabled.

        This enables Python code execution, data analysis, chart generation, etc.
        Uses the Responses API (not Assistants API) for broader model support.

        Args:
            message: User message
            conversation_id: Conversation ID for tracking
            uploaded_files: Optional list of file metadata to upload for analysis
            system_message: Optional system message override
            parameters: Additional parameters

        Returns:
            Dict with:
                - response: str (model response)
                - conversation_id: str
                - metadata: Dict
                - generated_files: List[GeneratedFile]
                - code_executions: List[CodeExecutionResult]
        """
        if not self._initialized or not self.client:
            raise RuntimeError(f"Agent {self.agent_id} not initialized")

        if not self.enable_code_interpreter:
            raise RuntimeError(f"Code interpreter not enabled for agent {self.agent_id}")

        try:
            # Build conversation history for context
            history = self.conversations.get(conversation_id, [])

            # Build input messages (exclude system message - use instructions parameter instead)
            input_messages = []

            # Add conversation history
            for msg in history[-(self.max_history_messages * 2):]:
                input_messages.append(msg)

            # Build user message content
            user_content = message

            # If files are uploaded, read and include their content in the message
            if uploaded_files:
                file_descriptions = []
                for file_meta in uploaded_files:
                    try:
                        # Read file content for text-based files
                        with open(file_meta.filepath, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                        file_descriptions.append(f"\n\n--- File: {file_meta.filename} ---\n{content[:10000]}")
                    except Exception as e:
                        logger.warning(f"Could not read file {file_meta.filename}: {e}")

                if file_descriptions:
                    user_content = message + "\n\nAttached files:" + "".join(file_descriptions)

            # Add current message
            input_messages.append({
                "role": "user",
                "content": user_content
            })

            # Get instructions (system message)
            instructions = system_message or self.system_message

            # Call the Responses API with code_interpreter tool
            # The code_interpreter tool requires a container configuration
            code_interpreter_tool = {
                "type": "code_interpreter",
                "container": {
                    "type": "auto",
                    "file_ids": []  # Files are included in message content instead
                }
            }

            logger.info(f"[CODE_INTERP] Calling Responses API with model: {self.model}")
            try:
                response = await self.client.responses.create(
                    model=self.model,
                    instructions=instructions,
                    input=input_messages,
                    tools=[code_interpreter_tool],
                    temperature=self.temperature
                )
                logger.info(f"[CODE_INTERP] Responses API call successful")
            except Exception as api_error:
                logger.error(f"[CODE_INTERP] Responses API call failed for model {self.model}: {api_error}")
                raise

            # Process the response outputs
            generated_files: List[GeneratedFile] = []
            code_executions: List[CodeExecutionResult] = []
            response_text = ""
            downloaded_file_ids: set = set()  # Track downloaded files to avoid duplicates

            # NOTE: Don't use response.output_text directly - it may contain sandbox paths
            # that need to be replaced with actual image data. Process outputs manually.

            logger.info(f"[CODE_INTERP] Response has {len(response.output)} outputs")

            # First pass: extract container_id from code_interpreter_call outputs
            container_id = None
            for output in response.output:
                if output.type == "code_interpreter_call":
                    container_id = getattr(output, 'container_id', None)
                    if container_id:
                        logger.info(f"[CODE_INTERP] Found container_id: {container_id}")
                        break

            for output in response.output:
                logger.info(f"[CODE_INTERP] Processing output type: {output.type}")
                if output.type == "message":
                    # Extract text content from the message
                    for content in output.content:
                        logger.info(f"[CODE_INTERP] Message content type: {content.type}")
                        if content.type == "output_text":
                            text_value = content.text
                            logger.info(f"[CODE_INTERP] Text preview: {text_value[:200] if text_value else 'empty'}...")

                            # Process any file annotations in the text
                            annotation_count = len(content.annotations) if hasattr(content, 'annotations') and content.annotations else 0
                            logger.info(f"[CODE_INTERP] Annotations count: {annotation_count}")
                            if hasattr(content, 'annotations') and content.annotations:
                                for annotation in content.annotations:
                                    logger.info(f"[CODE_INTERP] Annotation type: {annotation.type}")
                                    if annotation.type == "file_path":
                                        logger.info(f"[CODE_INTERP] file_path annotation - file_id: {annotation.file_id}, container_id: {container_id}")
                                        # Download the file from OpenAI container using file_id and container_id
                                        file_data = await self._download_and_store_file(
                                            openai_file_id=annotation.file_id,
                                            conversation_id=conversation_id,
                                            content_type="image",  # Assume image, will be corrected by mime type
                                            container_id=container_id
                                        )
                                        if file_data:
                                            logger.info(f"[CODE_INTERP] Successfully downloaded file: {file_data.filename}")
                                            generated_files.append(file_data)
                                            # Replace file reference in text with inline image or download URL
                                            if file_data.inline_data and file_data.content_type == "image":
                                                # Find and replace any reference to this file in the text
                                                text_value = re.sub(
                                                    rf'\[.*?\]\([^)]*{re.escape(annotation.file_id)}[^)]*\)',
                                                    f"![{file_data.filename}](data:{file_data.mime_type};base64,{file_data.inline_data})",
                                                    text_value
                                                )
                                        else:
                                            logger.error(f"[CODE_INTERP] Failed to download file for annotation")
                                    elif annotation.type == "container_file_citation":
                                        # Container file citation - download from the container
                                        ann_container_id = getattr(annotation, 'container_id', None) or container_id
                                        ann_file_id = getattr(annotation, 'file_id', None)
                                        ann_filename = getattr(annotation, 'filename', None)
                                        logger.info(f"[CODE_INTERP] container_file_citation - container_id: {ann_container_id}, file_id: {ann_file_id}, filename: {ann_filename}")

                                        # Only download one image per response - skip if we already have files
                                        if generated_files:
                                            logger.info(f"[CODE_INTERP] Skipping - already have {len(generated_files)} file(s)")
                                            continue

                                        if ann_file_id and ann_container_id:
                                            file_data = await self._download_and_store_file(
                                                openai_file_id=ann_file_id,
                                                conversation_id=conversation_id,
                                                content_type="image",  # Assume image based on context
                                                container_id=ann_container_id
                                            )
                                            if file_data:
                                                logger.info(f"[CODE_INTERP] Successfully downloaded container file: {file_data.filename}")
                                                generated_files.append(file_data)
                                                # Images will be rendered by frontend via generatedFiles array
                                            else:
                                                logger.error(f"[CODE_INTERP] Failed to download container file")

                            # Clean up sandbox paths and links - images are displayed via generatedFiles
                            # Remove markdown links with sandbox paths: [text](sandbox:/mnt/data/...)
                            text_value = re.sub(
                                r'\[([^\]]*)\]\(sandbox:/mnt/data/[^\)]+\)',
                                '',  # Remove the entire link
                                text_value
                            )
                            # Also remove any standalone sandbox paths
                            text_value = re.sub(
                                r'sandbox:/mnt/data/[^\s\)"\'\]]+',
                                '',
                                text_value
                            )
                            # Clean up extra whitespace/newlines from removals
                            text_value = re.sub(r'\n{3,}', '\n\n', text_value)
                            text_value = text_value.strip()

                            # Accumulate processed text (with file paths replaced)
                            response_text += text_value

                        elif content.type == "refusal":
                            response_text += f"[Refusal: {content.refusal}]"

                elif output.type == "code_interpreter_call":
                    # This is a code execution
                    code_input = output.code or ""
                    exec_files: List[GeneratedFile] = []

                    # Log the code interpreter call details
                    logger.info(f"[CODE_INTERP] Processing code_interpreter_call")
                    logger.info(f"[CODE_INTERP] container_id: {getattr(output, 'container_id', 'N/A')}")
                    logger.info(f"[CODE_INTERP] outputs count: {len(output.outputs) if output.outputs else 0}")

                    # Process outputs from code interpreter (note: 'outputs' not 'results')
                    exec_output = ""
                    exec_error = None

                    if output.outputs:
                        for i, result in enumerate(output.outputs):
                            logger.info(f"[CODE_INTERP] Output {i}: type={result.type}")
                            if result.type == "logs":
                                exec_output += result.logs + "\n"
                            elif result.type == "image":
                                logger.info(f"[CODE_INTERP] Image URL: {result.url[:100] if result.url else 'None'}...")
                                # Image output has a URL, download and store it
                                file_data = await self._download_image_from_url(
                                    image_url=result.url,
                                    conversation_id=conversation_id
                                )
                                if file_data:
                                    logger.info(f"[CODE_INTERP] Successfully downloaded image: {file_data.filename}")
                                    generated_files.append(file_data)
                                    exec_files.append(file_data)
                                    # Add inline image to response text if not already present
                                    if file_data.inline_data:
                                        inline_img = f"\n\n![{file_data.filename}](data:{file_data.mime_type};base64,{file_data.inline_data})\n"
                                        if inline_img not in response_text:
                                            response_text += inline_img
                                else:
                                    logger.error(f"[CODE_INTERP] Failed to download image from URL")
                            else:
                                logger.info(f"[CODE_INTERP] Unknown output type: {result.type}")

                    code_exec = CodeExecutionResult(
                        success=True,
                        code=code_input,
                        output=exec_output.strip() if exec_output else None,
                        error=exec_error,
                        generated_files=exec_files
                    )
                    code_executions.append(code_exec)

            # Update conversation history for consistency
            if conversation_id not in self.conversations:
                self.conversations[conversation_id] = []
            self.conversations[conversation_id].append({"role": "user", "content": message})
            self.conversations[conversation_id].append({"role": "assistant", "content": response_text})

            # Build metadata from response
            metadata = {
                "model": self.model,
                "tokens_used": getattr(response.usage, 'total_tokens', None) if hasattr(response, 'usage') and response.usage else None,
                "prompt_tokens": getattr(response.usage, 'input_tokens', None) if hasattr(response, 'usage') and response.usage else None,
                "completion_tokens": getattr(response.usage, 'output_tokens', None) if hasattr(response, 'usage') and response.usage else None,
            }

            logger.info(f"✅ Code interpreter query completed (files generated: {len(generated_files)})")

            return {
                "response": response_text.strip(),
                "conversation_id": conversation_id,
                "metadata": metadata,
                "generated_files": [gf.model_dump() for gf in generated_files],
                "code_executions": [ce.model_dump() for ce in code_executions]
            }

        except Exception as e:
            logger.error(f"❌ Code interpreter error: {e}")
            raise RuntimeError(f"Code interpreter query failed: {str(e)}")

    async def query_with_code_interpreter_stream(
        self,
        message: str,
        conversation_id: str,
        uploaded_files: Optional[List[Any]] = None,
        system_message: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream response from code interpreter using OpenAI Responses API streaming.

        This enables real-time streaming of code execution results, generated files,
        and text responses as they are produced.

        Args:
            message: User message
            conversation_id: Conversation ID for tracking
            uploaded_files: Optional list of file metadata to upload for analysis
            system_message: Optional system message override
            parameters: Additional parameters

        Yields:
            - {"type": "code_execution", "data": CodeExecutionResult}
            - {"type": "file", "data": GeneratedFile}
            - {"type": "token", "data": "text chunk"}
            - {"type": "done", "data": {...}}
        """
        if not self._initialized or not self.client:
            raise RuntimeError(f"Agent {self.agent_id} not initialized")

        if not self.enable_code_interpreter:
            raise RuntimeError(f"Code interpreter not enabled for agent {self.agent_id}")

        try:
            # Build conversation history for context
            history = self.conversations.get(conversation_id, [])

            # Build input messages
            input_messages = []
            for msg in history[-(self.max_history_messages * 2):]:
                input_messages.append(msg)

            # Build user message content
            user_content = message

            # If files are uploaded, read and include their content in the message
            if uploaded_files:
                file_descriptions = []
                for file_meta in uploaded_files:
                    try:
                        with open(file_meta.filepath, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                        file_descriptions.append(f"\n\n--- File: {file_meta.filename} ---\n{content[:10000]}")
                    except Exception as e:
                        logger.warning(f"Could not read file {file_meta.filename}: {e}")

                if file_descriptions:
                    user_content = message + "\n\nAttached files:" + "".join(file_descriptions)

            input_messages.append({"role": "user", "content": user_content})
            instructions = system_message or self.system_message

            code_interpreter_tool = {
                "type": "code_interpreter",
                "container": {
                    "type": "auto",
                    "file_ids": []
                }
            }

            logger.info(f"[CODE_INTERP_STREAM] Creating streaming Responses API call with model: {self.model}")

            # Create STREAMING response
            stream = await self.client.responses.create(
                model=self.model,
                instructions=instructions,
                input=input_messages,
                tools=[code_interpreter_tool],
                temperature=self.temperature,
                stream=True  # KEY: Enable streaming
            )

            generated_files: List[GeneratedFile] = []
            code_executions: List[CodeExecutionResult] = []
            full_response = ""
            container_id = None
            current_code_input = ""

            async for event in stream:
                event_type = getattr(event, 'type', None)
                logger.debug(f"[CODE_INTERP_STREAM] Event type: {event_type}")

                # Extract container_id when available
                if event_type == "response.output_item.added":
                    item = getattr(event, 'item', None)
                    if item and getattr(item, 'type', None) == "code_interpreter_call":
                        container_id = getattr(item, 'container_id', None)
                        logger.info(f"[CODE_INTERP_STREAM] Container ID: {container_id}")

                # Handle text deltas (incremental text from message outputs)
                elif event_type == "response.output_text.delta":
                    delta = getattr(event, 'delta', '')
                    if delta:
                        full_response += delta
                        yield {"type": "token", "data": delta}

                # Handle content part deltas (for output_text content)
                elif event_type == "response.content_part.delta":
                    delta_obj = getattr(event, 'delta', None)
                    if delta_obj:
                        text = getattr(delta_obj, 'text', '')
                        if text:
                            full_response += text
                            yield {"type": "token", "data": text}

                # Handle completed output items
                elif event_type == "response.output_item.done":
                    item = getattr(event, 'item', None)
                    if item:
                        item_type = getattr(item, 'type', None)
                        logger.info(f"[CODE_INTERP_STREAM] Output item done: {item_type}")

                        if item_type == "code_interpreter_call":
                            # Process code execution
                            code_input = getattr(item, 'code', '')
                            outputs = getattr(item, 'outputs', []) or []
                            exec_output = ""
                            exec_files: List[GeneratedFile] = []

                            for output in outputs:
                                output_type = getattr(output, 'type', None)
                                logger.info(f"[CODE_INTERP_STREAM] Processing output type: {output_type}")

                                if output_type == "logs":
                                    exec_output += getattr(output, 'logs', '') + "\n"
                                elif output_type == "image":
                                    # Download image from URL
                                    image_url = getattr(output, 'url', None)
                                    if image_url:
                                        logger.info(f"[CODE_INTERP_STREAM] Downloading image from URL")
                                        file_data = await self._download_image_from_url(
                                            image_url=image_url,
                                            conversation_id=conversation_id
                                        )
                                        if file_data:
                                            generated_files.append(file_data)
                                            exec_files.append(file_data)
                                            yield {"type": "file", "data": file_data.model_dump()}

                            code_exec = CodeExecutionResult(
                                success=True,
                                code=code_input,
                                output=exec_output.strip() if exec_output else None,
                                error=None,
                                generated_files=exec_files
                            )
                            code_executions.append(code_exec)
                            yield {"type": "code_execution", "data": code_exec.model_dump()}

                        elif item_type == "message":
                            # Process message content for any remaining text/annotations
                            # Skip annotation-based file downloads if we already have images
                            # from code execution outputs (they reference the same files)
                            if generated_files:
                                logger.info(f"[CODE_INTERP_STREAM] Skipping message annotations - already have {len(generated_files)} files from code execution")
                                continue

                            content_list = getattr(item, 'content', []) or []
                            for content in content_list:
                                content_type = getattr(content, 'type', None)
                                if content_type == "output_text":
                                    text = getattr(content, 'text', '')
                                    # Check for file annotations (only if no files from code execution)
                                    annotations = getattr(content, 'annotations', []) or []
                                    for annotation in annotations:
                                        ann_type = getattr(annotation, 'type', None)
                                        if ann_type == "container_file_citation":
                                            ann_file_id = getattr(annotation, 'file_id', None)
                                            ann_container_id = getattr(annotation, 'container_id', None) or container_id
                                            if ann_file_id and ann_container_id:
                                                file_data = await self._download_and_store_file(
                                                    openai_file_id=ann_file_id,
                                                    conversation_id=conversation_id,
                                                    content_type="image",
                                                    container_id=ann_container_id
                                                )
                                                if file_data:
                                                    generated_files.append(file_data)
                                                    yield {"type": "file", "data": file_data.model_dump()}

                # Handle response completion
                elif event_type == "response.completed":
                    logger.info(f"[CODE_INTERP_STREAM] Response completed")
                    break

            # Update conversation history
            if conversation_id not in self.conversations:
                self.conversations[conversation_id] = []
            self.conversations[conversation_id].append({"role": "user", "content": message})
            self.conversations[conversation_id].append({"role": "assistant", "content": full_response})

            # Yield completion
            yield {
                "type": "done",
                "data": {
                    "conversation_id": conversation_id,
                    "response": full_response.strip(),
                    "metadata": {"model": self.model},
                    "generated_files": [gf.model_dump() for gf in generated_files],
                    "code_executions": [ce.model_dump() for ce in code_executions]
                }
            }

            logger.info(f"✅ Code interpreter streaming completed (files: {len(generated_files)}, executions: {len(code_executions)})")

        except Exception as e:
            logger.error(f"❌ Code interpreter streaming error: {e}", exc_info=True)
            yield {"type": "error", "data": str(e)}

    async def _get_or_create_assistant(
        self,
        conversation_id: str,
        system_message: Optional[str] = None
    ) -> str:
        """Get existing or create new assistant for conversation"""
        if conversation_id in self.assistants:
            return self.assistants[conversation_id]

        if not self.client:
            raise RuntimeError("Client not initialized")

        instructions = system_message or self.system_message

        assistant = await self.client.beta.assistants.create(
            name=f"CodeInterpreter_{conversation_id}",
            instructions=instructions,
            model=self.model,
            tools=[{"type": "code_interpreter"}]
        )

        self.assistants[conversation_id] = assistant.id
        logger.info(f"🤖 Created assistant {assistant.id} for conversation {conversation_id}")
        return assistant.id

    async def _get_or_create_thread(self, conversation_id: str) -> str:
        """Get existing or create new thread for conversation"""
        if conversation_id in self.threads:
            return self.threads[conversation_id]

        if not self.client:
            raise RuntimeError("Client not initialized")

        thread = await self.client.beta.threads.create()
        self.threads[conversation_id] = thread.id
        logger.info(f"📝 Created thread {thread.id} for conversation {conversation_id}")
        return thread.id

    async def _process_run_steps(
        self,
        thread_id: str,
        run_id: str,
        conversation_id: str
    ) -> tuple[List[GeneratedFile], List[CodeExecutionResult]]:
        """
        Process run steps to extract code executions and generated files.

        Returns:
            Tuple of (generated_files, code_executions)
        """
        if not self.client:
            raise RuntimeError("Client not initialized")

        generated_files: List[GeneratedFile] = []
        code_executions: List[CodeExecutionResult] = []

        # Get run steps
        steps = await self.client.beta.threads.runs.steps.list(
            thread_id=thread_id,
            run_id=run_id
        )

        for step in steps.data:
            if step.type == "tool_calls" and step.step_details:
                for tool_call in step.step_details.tool_calls:
                    if tool_call.type == "code_interpreter":
                        code_input = tool_call.code_interpreter.input
                        outputs = tool_call.code_interpreter.outputs or []

                        # Process outputs
                        exec_output = ""
                        exec_error = None
                        exec_files: List[GeneratedFile] = []

                        for output in outputs:
                            if output.type == "logs":
                                exec_output += output.logs + "\n"
                            elif output.type == "image":
                                # Download and store image
                                file_data = await self._download_and_store_file(
                                    openai_file_id=output.image.file_id,
                                    conversation_id=conversation_id,
                                    content_type="image"
                                )
                                if file_data:
                                    generated_files.append(file_data)
                                    exec_files.append(file_data)

                        # Create code execution result
                        code_exec = CodeExecutionResult(
                            success=True,
                            code=code_input,
                            output=exec_output.strip() if exec_output else None,
                            error=exec_error,
                            generated_files=exec_files
                        )
                        code_executions.append(code_exec)

        return generated_files, code_executions

    async def _download_and_store_file(
        self,
        openai_file_id: str,
        conversation_id: str,
        content_type: str,
        container_id: Optional[str] = None
    ) -> Optional[GeneratedFile]:
        """
        Download file from OpenAI and store locally.

        Args:
            openai_file_id: OpenAI file ID
            conversation_id: Conversation ID for storage path
            content_type: Type of content (image, data, code, document)
            container_id: Optional container ID for container files (code interpreter)

        Returns:
            GeneratedFile metadata or None if failed
        """
        if not self.client:
            return None

        try:
            logger.info(f"[FILE_DOWNLOAD] Attempting to download file: {openai_file_id}, container_id: {container_id}")

            # Get file content - use containers API if container_id is provided
            if container_id:
                # Container files require containers.files.content.retrieve() API
                file_response = await self.client.containers.files.content.retrieve(
                    file_id=openai_file_id,
                    container_id=container_id
                )
                # Returns HttpxBinaryResponseContent - use .read()
                file_bytes = file_response.read()
            else:
                # Regular OpenAI files use files.content()
                file_content = await self.client.files.content(openai_file_id)
                file_bytes = file_content.read()

            logger.info(f"[FILE_DOWNLOAD] Downloaded {len(file_bytes)} bytes")

            # Try to get file info - use containers API if container_id is provided
            original_filename = f"output_{openai_file_id}"
            try:
                if container_id:
                    file_info = await self.client.containers.files.retrieve(
                        container_id=container_id,
                        file_id=openai_file_id
                    )
                    original_filename = getattr(file_info, 'name', None) or getattr(file_info, 'filename', None) or f"output_{openai_file_id}"
                    logger.info(f"[FILE_DOWNLOAD] Container file info: {file_info}")
                else:
                    file_info = await self.client.files.retrieve(openai_file_id)
                    original_filename = file_info.filename or f"output_{openai_file_id}"
            except Exception as e:
                logger.warning(f"[FILE_DOWNLOAD] Could not retrieve file info: {e}")
                # Try to infer from file content using magic bytes
                if file_bytes[:8] == b'\x89PNG\r\n\x1a\n':
                    original_filename = f"output_{openai_file_id}.png"
                elif file_bytes[:2] == b'\xff\xd8':
                    original_filename = f"output_{openai_file_id}.jpg"
                elif file_bytes[:6] in (b'GIF87a', b'GIF89a'):
                    original_filename = f"output_{openai_file_id}.gif"
                elif file_bytes[:5] == b'%PDF-':
                    original_filename = f"output_{openai_file_id}.pdf"
                elif file_bytes[:4] == b'PK\x03\x04':
                    # ZIP-based format (could be xlsx, docx, etc.)
                    original_filename = f"output_{openai_file_id}.zip"
                elif file_bytes[:1] == b'{' or file_bytes[:1] == b'[':
                    # Likely JSON
                    original_filename = f"output_{openai_file_id}.json"
                else:
                    # Check if it's text content
                    try:
                        file_bytes[:1000].decode('utf-8')
                        # If we can decode as UTF-8, it's likely a text file
                        original_filename = f"output_{openai_file_id}.txt"
                    except UnicodeDecodeError:
                        # Binary file with unknown type
                        original_filename = f"output_{openai_file_id}.bin"

            # Determine file extension from filename
            file_ext = os.path.splitext(original_filename)[1].lstrip('.')

            # If no extension found, detect from file content using magic bytes
            if not file_ext or file_ext == 'bin':
                if file_bytes[:8] == b'\x89PNG\r\n\x1a\n':
                    file_ext = 'png'
                elif file_bytes[:3] == b'\xff\xd8\xff':
                    file_ext = 'jpg'
                elif file_bytes[:6] in (b'GIF87a', b'GIF89a'):
                    file_ext = 'gif'
                elif file_bytes[:5] == b'%PDF-':
                    file_ext = 'pdf'
                elif file_bytes[:4] == b'PK\x03\x04':
                    file_ext = 'zip'
                elif file_bytes[:1] == b'{' or file_bytes[:1] == b'[':
                    file_ext = 'json'
                else:
                    # Check if it's text content
                    try:
                        file_bytes[:1000].decode('utf-8')
                        file_ext = 'txt'
                    except UnicodeDecodeError:
                        file_ext = 'bin'

            mime_type = self._get_mime_type(file_ext)

            # Generate unique local file ID
            local_file_id = str(uuid.uuid4())[:12]
            filename = f"generated_{local_file_id}.{file_ext}"

            # Create storage directory
            storage_dir = os.path.join(self.generated_files_dir, conversation_id)
            os.makedirs(storage_dir, exist_ok=True)

            # Save file locally
            file_path = os.path.join(storage_dir, filename)
            with open(file_path, 'wb') as f:
                f.write(file_bytes)

            # Build download URL (must match the router endpoint)
            download_url = f"/api/agents/generated/{conversation_id}/files/{local_file_id}/download"

            # Determine actual content type from file extension and mime type
            actual_content_type = self._determine_content_type(file_ext, mime_type)

            # For images, include base64 for inline display
            inline_data = None
            if actual_content_type == "image":
                inline_data = base64.b64encode(file_bytes).decode('utf-8')

            generated_file = GeneratedFile(
                file_id=local_file_id,
                filename=filename,
                file_type=file_ext,
                file_size=len(file_bytes),
                mime_type=mime_type,
                content_type=actual_content_type,
                download_url=download_url,
                inline_data=inline_data,
                created_at=datetime.utcnow().isoformat()
            )

            logger.info(f"💾 Stored generated file: {filename} ({len(file_bytes)} bytes)")
            return generated_file

        except Exception as e:
            logger.error(f"❌ Failed to download/store file {openai_file_id}: {e}")
            return None

    def _get_mime_type(self, extension: str) -> str:
        """Get MIME type from file extension"""
        mime_types = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf',
            'csv': 'text/csv',
            'json': 'application/json',
            'txt': 'text/plain',
            'py': 'text/x-python',
            'html': 'text/html',
            'xml': 'application/xml',
            'bin': 'application/octet-stream',
            'zip': 'application/zip',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
        return mime_types.get(extension.lower(), 'application/octet-stream')

    def _determine_content_type(self, extension: str, mime_type: str) -> str:
        """
        Determine high-level content type category from extension and mime type.

        Returns one of: 'image', 'document', 'data', 'code'
        """
        image_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'}
        document_extensions = {'pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'html', 'htm'}
        data_extensions = {'csv', 'json', 'xml', 'xlsx', 'xls', 'yaml', 'yml'}
        code_extensions = {'py', 'js', 'ts', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'sql', 'sh', 'bash'}

        ext = extension.lower().lstrip('.')

        if ext in image_extensions or mime_type.startswith('image/'):
            return 'image'
        elif ext in document_extensions:
            return 'document'
        elif ext in data_extensions:
            return 'data'
        elif ext in code_extensions:
            return 'code'
        else:
            return 'document'  # default fallback

    async def _download_image_from_url(
        self,
        image_url: str,
        conversation_id: str
    ) -> Optional[GeneratedFile]:
        """
        Download image from URL and store locally.

        Args:
            image_url: URL to the image
            conversation_id: Conversation ID for storage path

        Returns:
            GeneratedFile metadata or None if failed
        """
        import aiohttp

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as resp:
                    if resp.status != 200:
                        logger.error(f"Failed to download image: HTTP {resp.status}")
                        return None

                    file_bytes = await resp.read()

                    # Determine file extension from content type or URL
                    content_type = resp.headers.get('Content-Type', 'image/png')
                    ext_map = {
                        'image/png': 'png',
                        'image/jpeg': 'jpg',
                        'image/gif': 'gif',
                        'image/webp': 'webp',
                    }
                    file_ext = ext_map.get(content_type, 'png')
                    mime_type = content_type

            # Generate unique local file ID
            local_file_id = str(uuid.uuid4())[:12]
            filename = f"generated_{local_file_id}.{file_ext}"

            # Create storage directory
            storage_dir = os.path.join(self.generated_files_dir, conversation_id)
            os.makedirs(storage_dir, exist_ok=True)

            # Save file locally
            file_path = os.path.join(storage_dir, filename)
            with open(file_path, 'wb') as f:
                f.write(file_bytes)

            # Build download URL
            download_url = f"/api/agents/generated/{conversation_id}/files/{local_file_id}/download"

            # Include base64 for inline display
            inline_data = base64.b64encode(file_bytes).decode('utf-8')

            generated_file = GeneratedFile(
                file_id=local_file_id,
                filename=filename,
                file_type=file_ext,
                file_size=len(file_bytes),
                mime_type=mime_type,
                content_type="image",
                download_url=download_url,
                inline_data=inline_data,
                created_at=datetime.utcnow().isoformat()
            )

            logger.info(f"💾 Downloaded and stored image: {filename} ({len(file_bytes)} bytes)")
            return generated_file

        except Exception as e:
            logger.error(f"❌ Failed to download image from URL: {e}")
            return None

    async def cleanup_conversation(self, conversation_id: str):
        """
        Cleanup OpenAI resources for a conversation

        Deletes:
        - Uploaded files
        - Vector stores
        - Assistants
        - Threads
        - Conversation history
        - Local generated files
        """
        # Delete files from OpenAI if client is available
        if self.client and conversation_id in self.openai_files:
            for file_id in self.openai_files[conversation_id]:
                try:
                    await self.client.files.delete(file_id)
                    logger.debug(f"🗑️  Deleted file {file_id}")
                except Exception as e:
                    logger.warning(f"Failed to delete file {file_id}: {e}")

        # Delete vector store from OpenAI if client is available
        if self.client and conversation_id in self.vector_stores:
            try:
                await self.client.beta.vector_stores.delete(
                    self.vector_stores[conversation_id]
                )
                logger.debug(f"🗑️  Deleted vector store {self.vector_stores[conversation_id]}")
            except Exception as e:
                logger.warning(f"Failed to delete vector store: {e}")

        # Delete thread from OpenAI
        if self.client and conversation_id in self.threads:
            try:
                await self.client.beta.threads.delete(self.threads[conversation_id])
                logger.debug(f"🗑️  Deleted thread {self.threads[conversation_id]}")
            except Exception as e:
                logger.warning(f"Failed to delete thread: {e}")

        # Delete assistant from OpenAI
        if self.client and conversation_id in self.assistants:
            try:
                await self.client.beta.assistants.delete(self.assistants[conversation_id])
                logger.debug(f"🗑️  Deleted assistant {self.assistants[conversation_id]}")
            except Exception as e:
                logger.warning(f"Failed to delete assistant: {e}")

        # Clean up local generated files
        generated_dir = os.path.join(self.generated_files_dir, conversation_id)
        if os.path.exists(generated_dir):
            import shutil
            try:
                shutil.rmtree(generated_dir)
                logger.debug(f"🗑️  Deleted generated files directory {generated_dir}")
            except Exception as e:
                logger.warning(f"Failed to delete generated files directory: {e}")

        # Always clean up in-memory tracking (even if client not initialized)
        if conversation_id in self.openai_files:
            del self.openai_files[conversation_id]

        if conversation_id in self.vector_stores:
            del self.vector_stores[conversation_id]

        if conversation_id in self.threads:
            del self.threads[conversation_id]

        if conversation_id in self.assistants:
            del self.assistants[conversation_id]

        if conversation_id in self.conversations:
            del self.conversations[conversation_id]

        logger.info(f"🧹 Cleaned up conversation {conversation_id}")

    async def cleanup(self):
        """Cleanup resources"""
        if self.client:
            await self.client.close()
        self._initialized = False
        logger.info(f"🧹 Cleaned up OpenAI agent '{self.agent_id}'")
    
    def get_type(self) -> str:
        """Get agent type"""
        return "openai"
    
    def _get_public_config(self) -> Dict[str, Any]:
        """Get public configuration"""
        return {
            **super()._get_public_config(),
            "model": self.model,
            "temperature": self.temperature,
            # "max_tokens": self.max_tokens,
            "max_history_messages": self.max_history_messages
        }
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test the connection to OpenAI API"""
        try:
            test_message = "Hello! Please respond with 'Connection successful'."
            result = await self.query(test_message, conversation_id="test_connection")
            
            return {
                "success": True,
                "message": "Connection test successful",
                "response_preview": result["response"][:100],
                "model": self.model
            }
        except Exception as e:
            return {
                "success": False,
                "message": "Connection test failed",
                "error": str(e),
                "model": self.model
            }