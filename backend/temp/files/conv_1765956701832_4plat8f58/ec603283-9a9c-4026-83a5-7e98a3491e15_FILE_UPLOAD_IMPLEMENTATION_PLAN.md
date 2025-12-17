# File Upload and Search System Implementation Plan

## Overview

Implement a comprehensive file upload and search system that enables users to attach files to conversations and have AI agents search over them. The system will leverage:
- **OpenAI Responses API** for native file search and code interpreter (OpenAI agents)
- **Custom file search tool** using ChromaDB for endpoint agents (Azure, custom)
- **E2B Code Interpreter** for safe code execution on endpoint agents
- **Per-conversation file storage** with automatic cleanup

## User Requirements Summary

- ✅ Local file storage, temporary (deleted when conversation ends)
- ✅ Multi-file uploads supported
- ✅ 256 MB file size limit
- ✅ Users can delete individual files
- ✅ OpenAI Responses API integration (future-proof)
- ✅ E2B for code execution
- ✅ Support: Documents (PDF, DOCX, TXT), Code (PY, JS, TS, etc.), Data (CSV, JSON, XML), Images
- ✅ Per-conversation file scope (files don't transfer between agents)
- ✅ Warning when switching agents with uploaded files

---

## Architecture Decision: Unified Approach with API Modernization

### Phase 1 Foundation: Migrate OpenAI Agent to Responses API

**Key Insight**: Instead of creating a separate file service, we'll refactor the existing `OpenAIAgent` to use the new Responses API, which natively supports file search and code interpreter as tools.

**Benefits**:
- ✅ Centralized OpenAI logic (no separate file service needed)
- ✅ Native support for file_search and code_interpreter tools
- ✅ Better cache utilization (40-80% improvement over Chat Completions)
- ✅ Cleaner architecture - files are just additional tools
- ✅ Future-proof (Assistants API deprecated, Responses API is the future)

### Dual-Path Approach

After Phase 1 refactor, the system uses **two different approaches** based on agent type:

**Path 1: OpenAI Agents (Native Responses API)**
```
User uploads file → Local storage → Upload to OpenAI
→ OpenAIAgent.query() with tools=[file_search] or [code_interpreter]
→ Responses API handles everything natively
→ Return response with citations
```

**Path 2: Endpoint Agents (Custom Tools)**
```
User uploads file → Local storage → Parse file content
→ Index in ChromaDB → Semantic search → Inject context into prompt
→ Standard chat completions with augmented context
→ Return response
```

**Key Integration Point**: `AgentManager.process_query()` detects agent type and routes appropriately.

---

## Implementation Sequence

### Step 1: Phase 1 - Refactor OpenAI Agent to Responses API ✨
**CRITICAL: Do this first to establish the foundation**

1. Update `backend/agents/openai_agent.py`
   - Add file upload methods
   - Add vector store management
   - Update `query()` to use Responses API endpoint
   - Add `query_with_files()` method
   - Add `cleanup_conversation()` method
2. Update `backend/config/agents.json`
   - Add `enable_file_search` and `enable_code_interpreter` flags
3. Create `backend/tests/test_responses_api.py`
4. **Test**:
   - Basic queries work with Responses API
   - Conversation history maintained
   - Agent initializes correctly

**Why First**: This modernizes the OpenAI integration and provides the foundation for native file tools. All subsequent file features build on this.

### Step 2: Phase 2 - Core File Upload Infrastructure
1. Create `backend/services/file_storage.py`
2. Create `backend/routers/files.py`
3. Update `backend/models/requests.py`
4. Update `backend/app.py` (lifespan, router registration)
5. Update `backend/config.py`
6. **Test**:
   - File upload endpoint works
   - File validation (size, type)
   - File list and delete endpoints
   - Conversation cleanup removes files

### Step 3: Phase 3 - Custom Tools for Endpoint Agents
1. Create `backend/tools/file_search.py`
2. Create `backend/tools/e2b_code_interpreter.py`
3. Update `backend/agent_manager.py`
   - Add file tools initialization
   - Update `process_query()` to handle files
   - Add routing logic (OpenAI native vs custom tools)
   - Update `_execute_tools()` for file search
4. Update `backend/routers/agents.py` (conversation cleanup)
5. **Test**:
   - File search indexes and searches correctly
   - E2B code execution works
   - Endpoint agents receive file context
   - OpenAI agents use native tools

### Step 4: Phase 4 - Frontend
1. Create `frontend/src/types/files.ts`
2. Update `frontend/src/types/chat.ts`
3. Create `frontend/src/api/files.ts`
4. Create `frontend/src/components/chat/FileUpload.tsx`
5. Update `frontend/src/components/chat/ChatInput.tsx`
6. Update `frontend/src/components/chat/ChatInterface.tsx`
7. Create `frontend/src/components/chat/AgentSwitchWarning.tsx`
8. **Test**:
   - File upload UI works
   - Multi-file uploads
   - Upload progress display
   - File delete functionality
   - Agent switch warning shows

### Step 5: Phase 5 - Integration Testing
1. Test full end-to-end flow: upload → chat → response with file context
2. Test OpenAI agent uses native file_search tool
3. Test endpoint agent uses custom file search with ChromaDB
4. Test conversation deletion clears all resources (local files, OpenAI files, vector stores)
5. Test file size limit enforcement
6. Test unsupported file types rejected
7. Test multi-file uploads
8. Test agent switch warning prevents file loss
9. Test web search + file search context combination
10. Test code interpreter execution (both OpenAI and E2B)

---

## Critical Files Summary

### Files to CREATE (14 new files):

**Backend (6 files)**:
1. `backend/services/file_storage.py` - Core file management
2. `backend/routers/files.py` - File upload endpoints
3. `backend/tools/file_search.py` - Custom file search tool
4. `backend/tools/e2b_code_interpreter.py` - E2B code execution
5. `backend/tests/test_file_upload.py` - File upload tests
6. `backend/tests/test_responses_api.py` - Responses API tests

**Frontend (8 files)**:
7. `frontend/src/types/files.ts` - File type definitions
8. `frontend/src/api/files.ts` - File API client
9. `frontend/src/components/chat/FileUpload.tsx` - File upload UI
10. `frontend/src/components/chat/AgentSwitchWarning.tsx` - Warning modal
11-14. Test files for frontend components

### Files to MODIFY (9 files):

**Backend (6 files)**:
1. `backend/models/requests.py` - Add UploadedFileMetadata model
2. `backend/config.py` - Add file upload settings
3. `backend/app.py` - Initialize file storage service, register router
4. `backend/agents/openai_agent.py` - Refactor to use Responses API + add file handling
5. `backend/agent_manager.py` - Add file tool orchestration
6. `backend/routers/agents.py` - Add file cleanup to conversation deletion

**Frontend (3 files)**:
7. `frontend/src/types/chat.ts` - Update ChatRequest, Message types
8. `frontend/src/components/chat/ChatInput.tsx` - Integrate FileUpload component
9. `frontend/src/components/chat/ChatInterface.tsx` - Pass conversationId to ChatInput

---

## Key Technical Details

For complete implementation details including:
- Full code examples for OpenAI Responses API integration
- File storage service implementation
- Custom file search tool architecture
- E2B code interpreter integration
- Frontend components and UI
- Testing strategies
- Security considerations
- Performance optimization

See the detailed sections in the full plan document.

---

## Dependencies

**Python (add to requirements.txt)**:
```
PyPDF2
python-docx
pdfplumber
pandas
e2b-code-interpreter
```

**Environment Variables (add to backend/.env)**:
```bash
FILE_UPLOAD_DIR=temp/files
MAX_FILE_SIZE=268435456  # 256 MB
E2B_API_KEY=your_e2b_api_key_here
OPENAI_FILE_STORAGE_ENABLED=true
```

---

## Success Criteria

- ✅ Users can upload multiple files via paperclip button
- ✅ Files are validated (type, size) before upload
- ✅ OpenAI agents use native file_search and code_interpreter via Responses API
- ✅ Endpoint agents use custom ChromaDB file search and E2B code execution
- ✅ File context combines seamlessly with web search results
- ✅ All files cleaned up when conversation deleted
- ✅ Agent switch warning prevents accidental file loss
- ✅ System is secure, scalable, and future-proof
