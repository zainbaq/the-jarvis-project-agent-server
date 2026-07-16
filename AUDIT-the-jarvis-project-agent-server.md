---
app: "the-jarvis-project-agent-server"          # aka "Jarvis Agent Server"; frontend package name is "promethean-ai"
type: "ai"                                       # ai | data | tool | landing
subdomain: "unknown"                             # not in repo; sibling app is knowledge-manager.promethean-labs.co, so likely *.promethean-labs.co — VERIFY with owner
current_instance: "unknown"                      # not in repo — VERIFY (owner / AWS console)
languages:
  - "python@3.8+"                                # declared 3.8+; __pycache__ shows 3.11 and 3.13 build artifacts
  - "node@18+"                                   # required for Next.js build/runtime; Next 14
frameworks:
  - "FastAPI"                                    # backend API
  - "LangGraph + LangChain"                      # workflow agents
  - "Next.js@14 (App Router)"                    # frontend
  - "React@18 + TypeScript@5"
processes:
  - "uvicorn backend.app:app (port 3000, --workers 1)"   # systemd jarvis-backend
  - "next start (port 8000)"                              # systemd jarvis-frontend
  - "nginx (80/443 reverse proxy + TLS)"                 # host-level
listens_on_ports:
  - 3000        # FastAPI backend (deployment) — NOTE: config.py default is 8000; ports differ by launch method
  - 8000        # Next.js frontend (deployment)
build_steps_required: true                       # `next build`; `pip install -r backend/requirements.txt`. No DB migrations.
containerization_difficulty: "moderate"
aws_services:
  - "Cognito (JWT/JWKS auth only, optional, no boto3, no instance IAM role)"
other_external_apis:
  - "OpenAI (chat, embeddings, hosted vector stores, hosted code interpreter)"
  - "Anthropic (declared; used only in developer/app.py standalone script)"
  - "Serper (google search API for web_search tool)"
  - "E2B (remote code-execution sandbox for endpoint agents)"
  - "Knowledge-Manager server (sibling Promethean app, RAG backend)"
databases:
  - "None (no relational DB). ChromaDB embedded SQLite + JSON files on local disk."
vector_store: "ChromaDB (embedded, persistent on local disk) + FAISS (in-memory, ephemeral) + OpenAI hosted vector stores (per-conversation, remote)"
queues_caches:
  - "None (session state is in-process Python dict; no Redis/Celery/broker)"
persistent_state_locations:
  - "vector_stores/chroma.sqlite3 (repo root, ChromaDB)"
  - "backend/vector_stores/ (ChromaDB web_search + file_search stores; gitignored)"
  - "backend/temp/files/{conversation_id}/ (user uploads)"
  - "backend/temp/generated/{conversation_id}/ (code-interpreter output files)"
  - "backend/data/km_connections.json (persistent KM connections, encrypted API keys)"
  - "backend/data/.km_encryption_key (Fernet key — COMMITTED TO REPO)"
state_must_migrate: true
env_vars:
  - OPENAI_API_KEY
  - OPENAI_BASE_URL
  - OPENAI_MODEL
  - ANTHROPIC_API_KEY
  - HOST
  - PORT
  - FRONTEND_PORT
  - DEBUG
  - ENVIRONMENT
  - CORS_ORIGINS
  - LANGGRAPH_RECURSION_LIMIT
  - AGENT_CONFIG_PATH
  - TEMP_DIR
  - FILE_UPLOAD_DIR
  - MAX_FILE_SIZE
  - COGNITO_USER_POOL_ID
  - COGNITO_REGION
  - COGNITO_CLIENT_ID
  - KM_SERVER_URL
  - KM_CONNECTIONS_FILE
  - KM_ENCRYPTION_KEY
  - SERPER_API_KEY
  - E2B_API_KEY
  - VECTOR_STORES_DIR
  - NEXT_PUBLIC_API_URL
  - BACKEND_URL
  - NEXT_PUBLIC_BACKEND_URL
  - NEXT_PUBLIC_COGNITO_USER_POOL_ID
  - NEXT_PUBLIC_COGNITO_CLIENT_ID
  - NEXT_PUBLIC_COGNITO_REGION
  - NEXT_PUBLIC_COGNITO_DOMAIN
  - NODE_ENV
hardcoded_secrets_found: true                    # committed Fernet key backend/data/.km_encryption_key; Cognito pool/client IDs (public identifiers) hardcoded as defaults
has_own_auth: true                               # but delegated to AWS Cognito (external IdP), not a self-managed login/user DB
auth_type: "jwt"                                 # Cognito OAuth2/OIDC; frontend Hosted UI → Bearer JWT → backend JWKS validation
sso_integration_difficulty: "easy"               # already OIDC/Cognito; token-based, stateless
calls_other_apps:
  - "knowledge-manager (Promethean KM server, RAG search)"
executes_untrusted_code: true                    # LLM-generated Python, but ONLY in remote sandboxes (OpenAI hosted + E2B), never on the host
resource_estimate: "~0.5–1 vCPU / 1–2 GB idle; spikes on ChromaDB ONNX embedding + PDF/OCR parsing. I/O and latency dominated by external LLM calls."
health_check_endpoint: "/api/health"
aws_coupling: "soft"                             # only Cognito auth, via public JWKS HTTP endpoint, optional, no SDK/IAM-role dependency
migration_difficulty: "medium"
confidence: "high"                               # high for code-derived facts; medium for live infra (instance type, subdomain, data sizes, running managed services)
---

# Migration-Readiness Audit — the-jarvis-project-agent-server

> Also referred to as the **Jarvis Agent Server**; the frontend package is named `promethean-ai` (`next/package.json:2`). This is one app in the owner's "Promethean" suite. All findings below are grounded in files inspected in this repository (listed at the end). Facts that cannot be determined from the repo are marked **UNKNOWN — needs verification**.

## 1. Identity & purpose

**What it does (from code):** A full-stack "AI agent management platform." The FastAPI backend exposes a unified API to chat with multiple LLM agents and to run multi-step **LangGraph** workflows; a Next.js frontend provides the chat/workflow UI. Agents are declared in `backend/config/agents.json` and loaded at startup by `AgentRegistry` (`backend/app.py:43`). Three agent classes exist: `openai` (OpenAI Responses/Chat API with file search + hosted code interpreter — `backend/agents/openai_agent.py`), `endpoint` (any OpenAI-compatible custom endpoint, optionally with E2B code execution — `backend/agents/endpoint_agent.py`), and `langgraph` (workflow pipelines — `backend/agents/langgraph_agent.py`). Configured workflows (`config/agents.json`): **Developer** (generates a full code project), **Web Search** (research + report), **Document Intelligence** (PDF/image/DOCX Q&A). Agents can be augmented with web search (Serper), semantic file search, and an external Knowledge-Manager RAG backend.

**Surface:** Both a **user-facing UI** (`next/`, chat + workflows + account pages) and a **backend API** (`backend/`, `/api/*`). Not an internal-only tool — it has a public login flow via Cognito Hosted UI.

**Users & multi-tenancy:** End users authenticate via AWS Cognito (`next/lib/auth/`, `backend/auth/`). Every functional backend endpoint requires a valid Cognito JWT (`Depends(get_current_user)` across all routers). However, **per-user data isolation is weak/partial**: state is keyed by `conversation_id` / `session_id` (from an `X-Session-ID` header), *not* by the authenticated Cognito `sub`. Uploaded files live under `backend/temp/files/{conversation_id}/` and generated files under `backend/temp/generated/{conversation_id}/` with no owner check tying a conversation to a user (`backend/routers/agents.py:737` download-by-conversation-id, `backend/routers/files.py`). The persistent KM connections store (`backend/data/km_connections.json`) is **global**, not per-user. Session-scoped KM connections (`backend/services/session_manager.py`) are isolated per session but held in memory only. So: authentication yes, robust per-user authorization/isolation **partial — flag for migration** (see §7, §11).

## 2. Runtime & tech stack

**Languages / versions:**
- **Python** — declared "3.8+" (`README.md:41`, `setup_env.sh`). `__pycache__` artifacts show the app has run under **3.11 and 3.13**. Exact production runtime **UNKNOWN — needs verification** (no `.python-version`, `runtime.txt`, or `pyproject.toml`).
- **Node** — required "18+" (`README.md`); Next.js `^14.2.35`, React `^18.3.1`, TypeScript `^5.4` (`next/package.json`). No `.nvmrc`.

**Frameworks:** FastAPI (`backend/app.py`), LangGraph + LangChain (`backend/requirements.txt`, workflow modules), Next.js 14 App Router + React 18 + Tailwind + Radix/shadcn UI + Zustand + React Query (`next/package.json`).

**Package managers / lockfiles:**
- Backend: **pip** with an **unpinned** `backend/requirements.txt` (no versions except `PyJWT>=2.8.0`). **No lockfile** — not reproducible. Flag.
- Frontend: **npm** with `next/package-lock.json` present (reproducible).

**Frontend/backend split:** Separate builds. Next.js SSR/SSG app (`next build` → `next start`) proxies `/api/*` to FastAPI via `next.config.js` rewrites *and* the browser calls the backend directly for SSE streaming (`next/lib/api/client.ts:35`, `NEXT_PUBLIC_BACKEND_URL`). Frontend and backend are deployed as two independent processes.

**Distinct processes/services (deployment, `deploy/`):**
| Process | Start command | Manager | Port |
|---|---|---|---|
| Backend API | `uvicorn backend.app:app --host 0.0.0.0 --port 3000 --workers 1` | systemd `jarvis-backend.service` | 3000 |
| Frontend | `npm start` (`next start`, `PORT=8000`) | systemd `jarvis-frontend.service` | 8000 |
| Reverse proxy | nginx | host nginx | 80 (repo conf) / 443 (docs) |

There is **no separate worker, scheduler, cron, or dedicated websocket server**. Background work (workflow progress) runs in-process via `asyncio` tasks and an in-memory `ProgressManager` (`backend/progress_manager.py`) polled through `GET /api/agents/progress/{task_id}`. A single in-process `asyncio` session-cleanup loop runs hourly (`backend/services/session_manager.py:95`).

> **Port inconsistency (fragility):** `config.py` defaults `PORT=8000` for the backend, but `start.sh`, the systemd unit, and nginx all run the backend on **3000** and the frontend on **8000**. `next/.env.local` sets `BACKEND_URL=http://127.0.0.1:3000` while `next.config.js` defaults `BACKEND_URL` to `:8000`. These must be pinned explicitly in any container/compose to avoid a boot-time mismatch (see §11).

**Build steps required before running:** `pip install -r backend/requirements.txt` (+ several undeclared packages, see §3); `npm install && npm run build` for the frontend (`deploy/install.sh:57`). **No database migrations** (no relational DB, no Alembic). ChromaDB/FAISS stores are created lazily at runtime.

## 3. Containerization readiness

**Existing container assets:** **None.** No `Dockerfile`, no `docker-compose.yml`, no `.dockerignore`, no `Procfile`. Deployment today is **systemd + nginx on a host** (`deploy/jarvis-backend.service`, `deploy/jarvis-frontend.service`, `deploy/nginx-jarvis.conf`, `deploy/install.sh`). Containerization is greenfield.

**OS-level / native dependencies:**
- **Tesseract OCR** — `pytesseract` is imported in `backend/workflows/document_intelligence/document_assistant/document_utils.py:5` and `.../expenses/steps.py:16`. `pytesseract` requires the **`tesseract` system binary**, which is *not* a pip package. Must be installed at the OS layer (`apt-get install tesseract-ocr`). **Not currently in `requirements.txt` either.**
- **ChromaDB ONNX runtime** — `chromadb` uses an ONNX MiniLM embedding model by default; logs show `onnxruntime` provider selection (`backend_server.log:159`). Pulls a model + `onnxruntime` at runtime; CPU-heavy on first embed.
- **PDF/image parsing** — `pdfplumber`, `Pillow` (`PIL`), `python-docx`, `beautifulsoup4` (native-ish wheels; `pdfplumber` needs no system binary but pulls `pdfminer.six`).
- No headless browser, ffmpeg, poppler, or ODBC drivers found.

**Undeclared Python deps (requirements gap — flag):** imported in code but **absent from `backend/requirements.txt`**: `pdfplumber`, `pytesseract`, `Pillow/PIL`, `faiss` (via `langchain_community.vectorstores.FAISS` — needs `faiss-cpu`), and the optional `e2b_code_interpreter`. `SERPER_API_KEY` is used but Serper is called over HTTP (no SDK). A clean `pip install` from the current requirements file will **not** produce a working document-intelligence or FAISS path.

**Ports:** Backend and frontend ports are **configurable via env** (`HOST`/`PORT`, `FRONTEND_PORT`, `PORT` for Next) but the effective values are **inconsistent across launch paths** (see §2 note). No host-networking assumptions beyond localhost proxying.

**Host assumptions baked in:**
- **Absolute host paths** in systemd units and `install.sh`: `/home/ubuntu/the-jarvis-project-agent-server`, `venv/bin/...`, `User=ubuntu` (`deploy/*.service`). These are rewritten by `install.sh` but assume a Unix home layout.
- **Relative working-directory paths** for state: `backend/temp/files`, `backend/vector_stores`, `backend/data/km_connections.json`, root `vector_stores/`. `get_project_root()` in `web_search.py` computes paths relative to the source tree; running from a different CWD changes where data lands. In a container these must map to mounted volumes.
- Writes **outside the project dir**: the Developer workflow's `save_project_to_disk()` writes to `./generated_project_YYYYMMDD/` relative to CWD (`backend/workflows/developer/tasks.py:76-167`) — though the API path returns JSON rather than calling this saver, it's a latent host-fs write.
- Dev-machine leakage: `backend_server.log` contains absolute macOS paths (`/Users/zainbaq/Documents/Projects/...`) — confirms local dev on macOS; a committed log, not a runtime dependency.

**Assessment: containerization difficulty = MODERATE.** No blockers of the "won't run in a container" kind, but real work: (1) author two images (Python API + Node frontend) or a multi-stage build; (2) install the **tesseract** system package and pin the **undeclared pip deps**; (3) externalize all state to volumes (ChromaDB dirs, `temp/files`, `temp/generated`, `data/`); (4) resolve the port/env inconsistency; (5) move the committed Fernet key and Cognito config to real secrets/env. Nothing requires privileged mode.

## 4. External service & platform dependencies

### AWS services
- **Cognito** — the *only* AWS service in the running app. Used purely for **JWT validation** against the public JWKS endpoint (`backend/auth/cognito.py`: `PyJWKClient(f"https://cognito-idp.{region}.amazonaws.com/{pool}/.well-known/jwks.json")`). The frontend uses **AWS Amplify** (`@aws-amplify/auth`, `next/lib/auth/`) for the Hosted-UI OAuth2 Authorization-Code flow. **No `boto3`/`botocore` anywhere** (grep: no matches). Access is **not** via SDK credentials or an instance IAM role — it's an unauthenticated HTTPS fetch of public keys. Pool/client/region are configured via env with **hardcoded fallbacks** in code (`backend/config.py:45-47` → pool blank, `COGNITO_CLIENT_ID="76dr18kllrvs9rc0bujjc5o7hh"`; `next/lib/auth/config.ts:5-7` → `us-east-2_CyRy6JBhm`).
- **No S3, RDS/Aurora, DynamoDB, SES, SQS/SNS, Secrets Manager/SSM, ECR, Bedrock, CloudFront, EFS, or IAM-role usage** found in code.

> Portability verdict for AWS: **soft coupling.** Cognito is the sole tie and it is reachable from any host (public JWKS). It is also *optional* at the code level — if `COGNITO_USER_POOL_ID`/`COGNITO_CLIENT_ID` are unset the app boots but every protected endpoint returns **503** (`backend/app.py:77-86`, `backend/auth/dependencies.py:46-50`). Swapping Cognito for another OIDC IdP is a config + JWKS-URL change, not a rewrite.

### Other third-party APIs / SaaS
| Provider | Use | Where | Key source |
|---|---|---|---|
| **OpenAI** | Chat/Responses API, embeddings, **hosted vector stores**, **hosted code interpreter** | `backend/agents/openai_agent.py` | `OPENAI_API_KEY` (env), base URL `OPENAI_BASE_URL` default `api.openai.com/v1` |
| **Anthropic** | Declared; only used in a standalone script `backend/workflows/developer/app.py:11` (not the API path) | `requirements.txt`, `langchain-anthropic` | `ANTHROPIC_API_KEY` (env) |
| **Serper** | Google search for the web_search tool/workflow | `backend/tools/web_search.py:44`, `backend/workflows/web_search/steps.py:10` | `SERPER_API_KEY` (env) |
| **E2B** | Remote sandbox for **endpoint-agent** code execution | `backend/tools/e2b_code_interpreter.py` | `E2B_API_KEY` (env) |
| **Knowledge-Manager (sibling app)** | RAG semantic search backend | `backend/tools/km_connector.py`, `KMServerClient` | per-connection `X-API-Key` (runtime login), server URL `KM_SERVER_URL` |
| Azure OpenAI | Mentioned in README only; **no code path found** | `README.md:99-100` | — (referenced, not used) |

All third-party access is **portable** (HTTPS + API keys via env); none is AWS-bound.

### Databases
**No relational/managed database.** Persistence is: embedded **ChromaDB** (SQLite files), **JSON files** on disk, and **in-memory** session state. `backend/workflows/db_search/experiments.ipynb` references Postgres/MySQL connection strings (`PG_*`, `MYSQL_*`), but this is an **experimental notebook**, not wired into the app (the `db_search` workflow is not registered in `config/agents.json`). No engine/version to migrate.

### Vector store / search
- **ChromaDB** — `PersistentClient` on local disk. Two locations: repo-root `vector_stores/chroma.sqlite3` (present, ~160 KB) and `backend/vector_stores/` (gitignored). Used by the persistent web-search tool (`backend/tools/web_search.py:162`) and file-search tool (`backend/tools/file_search.py:162`, `backend/vector_stores/files`). **Self-hosted, embedded, data on the box.**
- **FAISS (in-memory)** — `langchain_community.vectorstores.FAISS.from_texts` in the web_search and document_intelligence workflows (`.../vector_store.py`). **Ephemeral**, rebuilt per request, never persisted (`clear()` on each run). Needs `faiss-cpu` (undeclared).
- **OpenAI hosted vector stores** — created per conversation via `client.beta.vector_stores.create` and deleted on cleanup (`backend/agents/openai_agent.py:401,1377`). **Remote (OpenAI), ephemeral.**

### Queues / caches / brokers
**None.** No Redis, RabbitMQ, Celery, or message broker. Session state is a plain in-process dict guarded by a `threading.Lock` (`backend/services/session_manager.py`). This is why the backend runs `--workers 1`.

## 5. State & persistence (what must survive a migration)

**Everything persisted and where:**
| State | Location | Kind | Migrate? |
|---|---|---|---|
| ChromaDB web-search index | `vector_stores/chroma.sqlite3` (root) + `backend/vector_stores/` | SQLite on disk | Optional — regenerable from re-search; small (~160 KB seen) |
| ChromaDB file-search index | `backend/vector_stores/files/` | SQLite on disk | Optional — regenerable by re-uploading |
| User-uploaded files | `backend/temp/files/{conversation_id}/` | Local disk | **Yes if retained** — user corpus; ~1.4 MB in `backend/temp` currently |
| Code-interpreter output files | `backend/temp/generated/{conversation_id}/` | Local disk | Usually ephemeral (deleted on conversation cleanup, `openai_agent.py:1400`) |
| KM connections (persistent) | `backend/data/km_connections.json` | JSON, **encrypted API keys** | **Yes** — currently empty (`{"connections": []}`), so effectively nothing to move today |
| KM encryption key | `backend/data/.km_encryption_key` | Fernet key (**committed**) | Yes — but must be **rotated**, not copied (see §6/§11) |
| Session state (KM conns, custom endpoints, config overrides) | **RAM only** | in-memory dict | No — ephemeral by design, 24 h TTL |
| Conversation history | Held by agent instances in memory + OpenAI's server-side threads | RAM / OpenAI | Not on disk locally |

**User-uploaded document corpuses:** `backend/temp/files/{conversation_id}/` (see `backend/services/file_storage.py:75`). **Vector indexes/embeddings:** ChromaDB SQLite on disk (persistent) + FAISS in RAM (ephemeral) + OpenAI-hosted (remote). **DB data:** none. **Schema management:** none (no migrations).

**Data-size estimates:** ChromaDB root file ~160 KB; `backend/temp` ~1.4 MB total today. Production sizes on the live box are **UNKNOWN — needs verification** (`du -sh` on the live `backend/vector_stores`, `backend/temp/files`, and `backend/data`).

**Must-preserve vs regenerable:**
- **Must preserve (if any real data exists live):** `backend/temp/files/*` (user uploads), `backend/data/km_connections.json` (currently empty). 
- **Regenerable/ephemeral:** all ChromaDB and FAISS indexes (re-embed), `backend/temp/generated/*`, all in-memory session state.
- **Do not copy, rotate instead:** `backend/data/.km_encryption_key`.

The migration data-movement footprint is **small and low-risk** given what's on disk in the repo — but confirm live volumes with the owner.

## 6. Configuration & secrets

**Backend env vars read** (via `pydantic-settings` `Settings`, `backend/config.py`, plus `os.getenv` sites): `HOST`, `PORT`, `FRONTEND_PORT`, `DEBUG`, `ENVIRONMENT`, `CORS_ORIGINS`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `LANGGRAPH_RECURSION_LIMIT`, `AGENT_CONFIG_PATH`, `TEMP_DIR`, `FILE_UPLOAD_DIR`, `MAX_FILE_SIZE`, `ANTHROPIC_API_KEY`, `COGNITO_USER_POOL_ID`, `COGNITO_REGION`, `COGNITO_CLIENT_ID`, `KM_SERVER_URL`, `KM_CONNECTIONS_FILE`, `KM_ENCRYPTION_KEY`, `SERPER_API_KEY` (`web_search.py:44`), `E2B_API_KEY` (`e2b_code_interpreter.py:27`), `VECTOR_STORES_DIR` (`web_search.py:474`). Agent config also interpolates `${VAR}` from env (`backend/agents/registry.py:103`).

**Frontend env vars:** `NEXT_PUBLIC_API_URL`, `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_REGION`, `NEXT_PUBLIC_COGNITO_DOMAIN`, `PORT`, `NODE_ENV` (`next/next.config.js`, `next/lib/api/client.ts`, `next/lib/auth/config.ts`, `next/.env.local`).

**Config files:**
- `backend/config/agents.json` — agent roster, models, per-agent tool toggles; `${VAR}` interpolation for keys.
- `backend/config.py` — typed settings + dynamic CORS origins.
- `next/next.config.js` — API proxy rewrites, root→/chat redirect, server-action allowed origins.
- `deploy/*.service`, `deploy/nginx-jarvis.conf`, `deploy/install.sh` — host deployment.

**Where secrets come from:** `.env` files (`backend/.env` then `.env`, per `config.py:55`) and process env. There is **no `backend/.env.example`** despite README/install.sh referencing it (`deploy/install.sh:19`), so the required-vars contract is undocumented — flag.

**Security issues found:**
1. **Committed secret:** `backend/data/.km_encryption_key` contains a live **Fernet key** (`Umz2z1HmhvHk-...=`) checked into git. This key encrypts KM API keys in `km_connections.json`. It **must be rotated** and moved to a secret store during migration; do not carry it forward. (`.gitignore` excludes `.env` but not this file.)
2. **Hardcoded identifiers:** Cognito **User Pool ID** and **Client ID** are hardcoded as defaults in both backend (`config.py:45-47`) and frontend (`lib/auth/config.ts:5-7`) and committed in `next/.env.local`. These are *public* OAuth identifiers (not secrets), but they pin the app to one specific Cognito pool and should be env-driven for a clean cutover.
3. No hardcoded API keys (OpenAI/Anthropic/Serper/E2B) were found in source — those come from env. Good.

**Minimum credentials to boot & be useful:**
- **Boot the process:** nothing strictly required (app starts with blanks).
- **Agents functional:** `OPENAI_API_KEY` (registry warns and OpenAI agents fail without it — `registry.py:200`).
- **Protected endpoints usable:** `COGNITO_USER_POOL_ID` + `COGNITO_CLIENT_ID` (else 503 on all functional routes).
- **Feature-complete:** `SERPER_API_KEY` (web search), `E2B_API_KEY` (endpoint code exec), a KM login/API key at runtime (RAG).

## 7. Networking, auth & integration

**Reverse proxy (`deploy/nginx-jarvis.conf`):** nginx `listen 80`, `server_name _`. Routes: `/` → `127.0.0.1:8000` (Next), `/_next/static/` → 8000 with 1-year cache, `/api/` → `127.0.0.1:3000` (FastAPI). For `/api/`: **websocket upgrade headers set**, **`proxy_buffering off`** and **`proxy_read_timeout 86400`** — i.e. tuned for **SSE streaming** and long-lived connections. **No `client_max_body_size` override** in the repo's nginx conf, yet the app accepts uploads up to **256 MB** (`config.py:39`) — nginx's 1 MB default would reject large uploads. **Flag: body-size limit mismatch.**

**TLS:** Repo nginx config terminates on **port 80 only** (no TLS block). `docs/DEPLOYMENT.md` describes nginx doing "SSL termination, Port 443" but no certs/Certbot/443 server block exist in the repo. **How TLS is actually provisioned today is UNKNOWN — needs verification** (likely manual Certbot/ACM on the box; relevant to a Cloudflare-Tunnel target).

**Authentication:** The app **has its own auth flow but delegates identity to AWS Cognito (external IdP)**:
- Frontend: AWS Amplify + Cognito **Hosted UI**, OAuth2 Authorization-Code flow, callback at `/auth/callback` (`next/app/auth/callback/page.tsx`, `docs/COGNITO_AUTH.md`). It does **not** render its own login form — it redirects to Cognito's hosted domain.
- Token transport: browser sends **`Authorization: Bearer <JWT>`** to the backend (`next/lib/api/client.ts:63-65`); also an `X-Session-ID` header for session scoping.
- Backend: validates the JWT signature/exp/issuer/audience against Cognito JWKS (`backend/auth/cognito.py`), via FastAPI `Depends(get_current_user)`. It is **stateless** (no server session cookie for auth; `allow_credentials=True` in CORS is for SSE, not auth cookies). Users are stored **in Cognito**, not in any app DB.

> **SSO integration difficulty: EASY.** The app already speaks OIDC and expects a Bearer JWT validated by JWKS. To move behind a unified external IdP (another Cognito pool, or self-hosted OIDC), you change the issuer/JWKS URL + client/pool IDs (backend `COGNITO_*`, frontend `NEXT_PUBLIC_COGNITO_*`) and repoint Amplify. No login page to rebuild, no password store to migrate. **Caveat:** the code reads Cognito-specific claims (`cognito:username`, `cognito:groups` in `cognito.py:122-124`); a non-Cognito OIDC provider would need claim-mapping tweaks. Also, if fronting with an auth proxy (e.g. Cloudflare Access) that injects an identity header instead of a JWT, the backend's `HTTPBearer` expectation would need an adapter. **Authorization/tenancy caveat:** because resources are keyed by `conversation_id`/`session_id` rather than the JWT `sub` (§1), SSO gives you authentication but not automatically per-user data isolation — that gap is app-level work regardless of IdP.

**CORS:** Explicit allow-list built from localhost dev ports + `CORS_ORIGINS` env, `allow_credentials=True`, all methods/headers, `expose_headers=["*"]` for SSE (`backend/app.py:117-137`). Production origins must be supplied via `CORS_ORIGINS`.

**Websockets / streaming / long-lived connections:** No true WebSocket server, but **Server-Sent Events (SSE)** streaming is core: `POST /api/agents/{id}/chat/stream` returns a `StreamingResponse` (`backend/routers/agents.py:346,455`); the browser hits the backend **directly** (`NEXT_PUBLIC_BACKEND_URL`) to bypass Next proxy buffering. Any reverse proxy/tunnel in the target must disable response buffering and allow long read timeouts (as the repo nginx does).

**Inter-app calls (Promethean suite):** This app calls the **Knowledge-Manager** app. `KM_SERVER_URL` defaults to `http://localhost:11000` (`config.py:50`) but the **systemd unit hardcodes `https://knowledge-manager.promethean-labs.co`** (`deploy/jarvis-backend.service:10`). Calls go through `KMServerClient` (`backend/tools/km_connector.py`) with an `X-API-Key`, invoked from `backend/routers/km_connections.py`, `session_km.py`, and `agents.py` (RAG augmentation at `agents.py:269-406`). The KM URL is **configurable via env** (good), but the production value is baked into the deploy unit (should be env/registry-driven). No other sibling-app calls found.

## 8. Resource footprint & workload shape

**CPU/RAM drivers:** (1) **ChromaDB ONNX embeddings** — first embedding loads an ONNX MiniLM model and runs on CPU (`backend_server.log` ONNX provider warnings); noticeable CPU + a few hundred MB RAM spike. (2) **Document parsing/OCR** — `pdfplumber` + `pytesseract` (Tesseract) are CPU-bound and can spike on large scanned PDFs. (3) **FAISS in-memory** index build per web-search/document run. (4) Everything LLM-facing is **latency/IO-bound**, not CPU-bound — the box mostly waits on OpenAI/Serper/E2B/KM over the network. Idle footprint is modest (FastAPI + loaded agents). **Estimate: ~0.5–1 vCPU / 1–2 GB idle, transient spikes to a couple GB / a full core during embedding or OCR.** Precise live numbers **UNKNOWN — needs verification** (no profiling data; check the instance's CloudWatch/`htop`).

**Background jobs / scheduled tasks:** No cron/systemd timers. In-process only: workflow execution as `asyncio` tasks with progress tracked in memory (`backend/progress_manager.py`), and an hourly session-cleanup loop (`session_manager.py:99`, `asyncio.sleep(3600)`).

**Concurrency model:** async FastAPI, but **`--workers 1`** (systemd) — a single Uvicorn worker. This is effectively **required** because session/progress/agent state lives in that worker's memory; scaling to multiple workers/replicas would break the in-memory session and progress stores without externalizing them. Hardcoded sizes: `MAX_FILE_SIZE=256 MB`, session `TTL=24 h`, `LANGGRAPH_RECURSION_LIMIT=100`. Some parsing uses `ThreadPoolExecutor` (`document_utils.py:11`).

**Noisy-neighbor risk:** OCR and ONNX embedding can briefly saturate a core and allocate memory in bursts; large (up to 256 MB) uploads consume disk and memory. On a shared, right-sized box this app could spike CPU during document/embedding work. Bounded and occasional rather than sustained — but worth CPU/memory **limits** if co-located.

## 9. Untrusted / arbitrary code execution (security-critical)

**Yes — the app runs LLM-generated code, but never on the host.** Two paths, both **remote-sandboxed**:
1. **OpenAI hosted code interpreter** (`backend/agents/openai_agent.py:480+`, `query_with_code_interpreter`) — Python executes inside **OpenAI's** managed sandbox via the Responses API; the app only uploads inputs and downloads output files back to `backend/temp/generated/{conversation_id}/`.
2. **E2B remote sandbox** (`backend/tools/e2b_code_interpreter.py`) — for `endpoint` agents; `Sandbox(api_key=...).run_code(code)` runs in **E2B's** cloud microVM, not locally. Gated on `E2B_API_KEY` and the optional `e2b-code-interpreter` package.

**No local execution primitives:** grep for `subprocess`, `os.system`, `eval(`, `exec(`, `Popen`, `shell=True` → **no matches in application code.** The **Developer workflow generates code but does not run it** — it returns/saves source and *LLM-generated* "test_results," with no test execution (`backend/workflows/developer/tasks.py`, `steps.py`). The `db_search` notebook mentions generated SQL but is **not wired into the app**.

**Filesystem/network access of the executed code:** N/A on-host — it runs in OpenAI/E2B, not with host FS or network. Nothing runs as root in the app itself (systemd `User=ubuntu`).

**Docker-in-Docker / privileged ops:** none.

> **Isolation verdict:** untrusted-code risk is **externalized** to OpenAI and E2B. On a shared host this app does **not** itself execute attacker-controlled code against the local kernel/FS. The residual local risks are ordinary web risks (file uploads, path handling), not sandbox-escape risks. This makes it *safer* to co-locate than an app with a local interpreter — provided uploads and the `temp/`/`vector_stores/` dirs are constrained to a volume.

## 10. Build, deploy & operations (current state)

**Build/deploy:** Manual, script-driven. `deploy/install.sh` sets up the venv, `npm install && npm run build`s the frontend, templates the systemd unit paths/user, installs both services + the nginx site, and reloads nginx. There is **no CI/CD pipeline, no git hooks, no container registry** in the repo. `start.sh`/`stop.sh` are for local dev (they run backend:3000 + `next dev`:8000 and kill by port).

**Updates & restart:** Ship by pulling code on the box and `sudo systemctl restart jarvis-backend jarvis-frontend` (`DEPLOYMENT.md`). `Restart=always, RestartSec=5` on both units.

**Health/readiness:** **Yes** — `GET /api/health` (agent-registry-aware) and `GET /api/status` (detailed) (`backend/routers/health.py`). Good for a container liveness/readiness probe. The frontend has no dedicated health route (probe `/` or `/chat`).

**Logging:** Custom logging to **stdout + rotating files** under `logs/` and `backend/logs/` (`backend/logging_config.py`; committed sample `logs/app_20251001.log`, `backend_server.log`). Under systemd, stdout/stderr also go to the **journal** (`StandardOutput=journal`). In containers this maps cleanly to stdout, but the file-logging paths would need a mounted volume or disabling to avoid writing inside the image.

**Scheduled tasks:** none (see §8).

## 11. Risks, fragility & tech debt

- **Committed encryption key** (`backend/data/.km_encryption_key`, Fernet) — real secret in git history. Rotate + move to a secret store; scrub history. *(High.)*
- **No dependency pinning + missing deps** — `requirements.txt` is unversioned and **omits** `pdfplumber`, `pytesseract`, `Pillow`, `faiss-cpu`, `e2b-code-interpreter`. A fresh build silently lacks document-intelligence/FAISS/OCR. No lockfile → non-reproducible. *(High for migration.)*
- **Tesseract system binary** required but undocumented — OCR paths crash without it. *(Medium.)*
- **Single-worker, in-memory state** — sessions, progress, and agent objects live in one Uvicorn worker. Horizontal scaling or multi-worker requires externalizing session/progress (Redis or similar). A restart drops all in-flight workflow progress and session KM connections. *(Medium — architectural.)*
- **Port/env inconsistency** — backend default 8000 vs deployed 3000; `BACKEND_URL` default mismatch between `.env.local` and `next.config.js`. Easy to boot a broken proxy chain. Pin explicitly. *(Medium.)*
- **nginx body-size vs 256 MB uploads** — no `client_max_body_size` in repo conf; default 1 MB will 413 large uploads through the proxy. *(Medium.)*
- **Partial per-user isolation** — resources keyed by `conversation_id`/`session_id`, not Cognito `sub`; global KM connection store; download-by-conversation-id without owner check (`agents.py:737`, `files.py`). Multi-user/SSO consolidation should add owner scoping. *(Medium — security.)*
- **TLS/subdomain not in repo** — actual cert provisioning and the app's public hostname are external facts. *(Verify.)*
- **KM URL hardcoded in systemd unit** — production dependency (`knowledge-manager.promethean-labs.co`) baked into deploy rather than the app registry. *(Low.)*
- **Committed cruft / dev leakage** — `.DS_Store` files, committed logs with macOS absolute paths, committed `next/tsconfig.tsbuildinfo`. Cosmetic but signals no `.dockerignore` discipline yet. *(Low.)*
- **Missing `backend/.env.example`** referenced by docs/installer — the required-config contract is undocumented. *(Low.)*
- **Licensing:** self-hosted OSS components — ChromaDB (Apache-2.0), FAISS (MIT), FastAPI/Uvicorn (MIT/BSD), Next.js/React (MIT), pdfplumber (MIT), Tesseract (Apache-2.0), AWS Amplify (Apache-2.0). No copyleft/AGPL blockers observed. E2B/OpenAI/Serper are paid SaaS (commercial terms, not bundled). README says the project itself is "private and proprietary." *(Low.)*

## Migration-relevant flags (direct answers)

- **Coupled to AWS? Can it run on any Docker host / non-AWS VPS as-is?** **Soft coupling — yes, it can run anywhere.** The only AWS tie is Cognito, used purely as an OIDC/JWKS token verifier over public HTTPS, with **no boto3, no instance IAM role, no S3/RDS/etc.** It runs on any Docker host today (given the dep/OCR fixes). Cognito can stay (works off-AWS) or be swapped for another OIDC IdP via config.
- **What state must be migrated, and how big/risky?** **Small and low-risk.** Real must-keep state is user uploads (`backend/temp/files/`) and `backend/data/km_connections.json` (currently empty). All vector indexes (ChromaDB/FAISS/OpenAI) are **regenerable**. On-disk data in the repo is tiny (~KB–MB); confirm live volume sizes with the owner. The one hard requirement: **rotate** the committed Fernet key rather than copy it.
- **Does it execute untrusted code, and what isolation on a shared box?** **It executes LLM-generated code, but only in remote sandboxes (OpenAI hosted + E2B) — never on the host.** No local `subprocess`/`eval`/interpreter. On a shared box it needs only ordinary web hardening (constrain upload dirs and `temp/`/`vector_stores/` to a volume, cap upload size); it introduces **no local sandbox-escape risk**.
- **How would it plug into unified external SSO, and how much app change?** **Minimal.** It already does OIDC: frontend Amplify/Cognito Hosted UI → Bearer JWT → backend JWKS validation. Repointing to a unified IdP is a config change (issuer/JWKS/client/pool env vars). Small code work only if the new IdP isn't Cognito (claim mapping for `cognito:username`/`cognito:groups`) or if a header-injecting auth proxy replaces Bearer tokens. Separately, true multi-user isolation needs owner-scoping work (state is conversation-keyed, not user-keyed).
- **Can it be containerized cleanly, and what are the blockers?** **Moderate.** No Dockerfile exists. Blockers are all tractable: install the **tesseract** system package; **pin the undeclared pip deps** (pdfplumber/pytesseract/Pillow/faiss-cpu/e2b); externalize state to **volumes** (ChromaDB dirs, `temp/`, `data/`); resolve the **port/env** inconsistency and nginx **body-size** limit; move the committed key + Cognito config to real secrets/env. Two images (Python API + Node frontend). No privileged mode needed.
- **Any reason it should NOT share a host with other apps?** **No hard blocker; two cautions.** (1) **Resource bursts** — OCR/ONNX-embedding can briefly saturate a core and allocate memory; set CPU/memory limits if co-located. (2) **Single-worker in-memory state** — it can't be load-balanced across replicas without externalizing sessions/progress, so treat it as one pinned instance. It is *not* a kernel-isolation risk (no local code exec).

## Open questions for the owner

1. **Instance & subdomain:** Which EC2 instance/type runs this today, and at what public hostname (e.g. `*.promethean-labs.co`)? Not in the repo.
2. **Live data sizes:** `du -sh backend/vector_stores backend/temp/files backend/data` on the running box — how much real user-upload/vector data must actually move?
3. **TLS today:** How are certs provisioned (Certbot on the box? ACM? Cloudflare)? The repo nginx config is HTTP-only.
4. **Cognito ownership:** Is pool `us-east-2_CyRy6JBhm` shared across the Promethean apps (candidate unified IdP) or app-specific? Any user data to preserve there?
5. **Managed/external services in prod:** Are Serper, E2B, and the Knowledge-Manager server all live and keyed in the production `.env`? Is the KM server itself part of this migration?
6. **Actual `backend/.env`:** The full production env (names + which are set) — there's no `.env.example` to infer the exact required set.
7. **Real Python runtime** in production (3.11? 3.13?) and whether `--workers 1` is intentional (it must stay 1 until session/progress state is externalized).
8. **Traffic/concurrency:** Rough concurrent-user and request volume, to right-size the target container's CPU/RAM.

## Files reviewed

Backend:
`README.md`, `.gitignore`, `start.sh`, `stop.sh`, `setup_env.sh`,
`backend/app.py`, `backend/config.py`, `backend/requirements.txt`, `backend/logging_config.py` (dir listing), `backend/middleware.py` (dir listing), `backend/progress_manager.py` (via refs),
`backend/auth/__init__.py`, `backend/auth/cognito.py`, `backend/auth/dependencies.py`,
`backend/config/agents.json`, `backend/config/agents-example.json` (listing),
`backend/data/km_connections.json`, `backend/data/.km_encryption_key`,
`backend/services/session_manager.py`, `backend/services/file_storage.py` (head), `backend/services/km_connection_storage.py` (head),
`backend/routers/health.py`, `backend/routers/agents.py` (grep/targeted), `backend/routers/files.py` (grep), `backend/routers/km_connections.py` (grep), `backend/routers/session_km.py` (grep), `backend/routers/session_endpoints.py` (grep),
`backend/tools/e2b_code_interpreter.py`, `backend/tools/km_connector.py` (head), `backend/tools/web_search.py` (grep), `backend/tools/file_search.py` (grep),
`backend/agents/openai_agent.py` (targeted), `backend/agents/registry.py` (grep),
`backend/workflows/developer/tasks.py` (head + grep), `backend/workflows/document_intelligence/document_assistant/document_utils.py` (head), `.../vector_store.py` (grep), `backend/workflows/web_search/vector_store.py`/`steps.py` (grep), `backend/workflows/db_search/experiments.ipynb` (grep).

Deploy & docs:
`deploy/nginx-jarvis.conf`, `deploy/jarvis-backend.service`, `deploy/jarvis-frontend.service`, `deploy/install.sh`,
`docs/DEPLOYMENT.md` (head), `docs/COGNITO_AUTH.md` (head), `docs/unified-user-base-implementation-plan.md` (grep).

Frontend:
`next/package.json`, `next/next.config.js`, `next/.env.local`, `next/lib/api/client.ts` (head), `next/lib/auth/config.ts` (grep), `next/app/**` & `next/lib/**` & `next/components/**` (file-tree inventory).

Logs/state (evidence, not deps):
`backend_server.log` (grep), `logs/app_20251001.log` (listing), `vector_stores/chroma.sqlite3` (size), `backend/temp/**` (listing + size).

**Overall confidence: HIGH** for all code-derived facts (stack, dependencies, auth mechanism, AWS coupling, code-execution model, state locations). **MEDIUM** for live-infrastructure facts that are not in the repo (instance type, subdomain, TLS provisioning, production data volumes, exact production env values and Python runtime) — enumerated in *Open questions* above.
