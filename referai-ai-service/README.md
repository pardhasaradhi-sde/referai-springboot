# ReferAI AI Service (Phase 1 Only)

This is intentionally simple and local-first.

## What exists

- FastAPI app bootstrap (`app/` root module)
- Internal API key middleware for `/api/*`
- Async PostgreSQL and Redis connection lifecycle
- Optional startup migration runner (`RUN_MIGRATIONS`, default `false`)
- Public `/health` endpoint with DB/Redis checks

## Run locally (PowerShell)

### 1) Start Redis (Docker)

```powershell
docker run -d --name referai-redis -p 6379:6379 redis:7-alpine
# If container already exists:
# docker start referai-redis
```

### 2) Prepare environment

```powershell
cd D:\portfolioprojects\referai\referai-ai-service
Copy-Item .env.example .env
```

Edit `.env`:

```env
POSTGRES_URL=postgresql://postgres:pardhasaradhi@localhost:5432/referai
REDIS_URL=redis://localhost:6379/0
RUN_MIGRATIONS=false
X_INTERNAL_KEY=referai-internal-secret-2026
```

### 3) Install and run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

### 4) Verify

```powershell
Invoke-RestMethod http://localhost:8010/health | ConvertTo-Json -Depth 5
```

## Notes

- `/health` is public.
- All `/api/*` routes require `X-Internal-Key`.
- In Phase 1 there are no AI endpoints yet.
