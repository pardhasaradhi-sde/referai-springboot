# ReferAI AI Service

Production-grade Python AI microservice powering intelligent matching, coaching, and outreach for the ReferAI platform.

## Architecture

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐
│   Next.js    │────▶│  Java Spring Boot    │────▶│  Python AI   │
│   Frontend   │     │  Backend (port 8080) │     │  Service     │
│  (Vercel)    │     │                      │     │  (port 8010) │
└──────────────┘     │  ┌────────────────┐  │     │              │
                     │  │ PythonAiService│──┼────▶│  /api/match  │
                     │  │ (RestTemplate) │  │     │  /api/coach  │
                     │  └────────────────┘  │     │  /api/index  │
                     └──────────┬───────────┘     │  /api/msg    │
                                │                 │  /api/outcome│
                     ┌──────────▼───────────┐     └──────┬───────┘
                     │    PostgreSQL        │◀───────────┘
                     │  (Neon / pgvector)   │  shared DB
                     └──────────┬───────────┘
                     ┌──────────▼───────────┐
                     │    Redis (Upstash)   │  coach state
                     └─────────────────────-┘
```

**Key**: The frontend never calls this service directly. All requests flow through the Java backend via internal HTTP with `X-Internal-Key` authentication.

## Features

| # | Feature | Endpoint | Tech |
|---|---------|----------|------|
| 1 | **Intelligent Matching Pipeline** | `POST /api/match` | LangGraph 4-step pipeline, pgvector, Gemini |
| 2 | **Referral Coach Agent** | `POST /api/coach/suggest` | LangGraph 5-node agent, SSE streaming |
| 3 | **Outreach Message Generation** | `POST /api/generate-message` | Gemini with rich profile context |
| 4 | **Referrer Profile Indexing** | `POST /api/index-referrer` | Gemini embeddings (768d), pgvector |
| 5 | **Outcome Feedback Loop** | `POST /api/outcomes/record` | Context snapshots, pattern analysis |

Plus existing: `POST /api/extract-resume` (PDF/DOCX), `POST /api/scrape-jd` (job boards), `GET /health`

## Quick Start

### 1. Prerequisites
- Python 3.11+
- PostgreSQL with pgvector extension
- Redis
- Gemini API key

### 2. Setup
```bash
cd referai-ai-service
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# Linux/Mac
source .venv/bin/activate

pip install -e .
```

### 3. Configure
```bash
cp .env.example .env
# Edit .env with your values:
#   GEMINI_API_KEY=your-key
#   POSTGRES_URL=postgresql://...
#   REDIS_URL=redis://...
#   X_INTERNAL_KEY=your-shared-secret
```

If `.env.example` is missing locally, pull latest changes from the repository root and re-run the copy step.

### 4. Run Migrations (first time only)
Set `RUN_MIGRATIONS=true` in `.env`, then start the service. It will create:
- `profiles.embedding` vector(768) column + IVFFlat index
- `referral_outcomes` table
- `coach_advice_log` table

### 5. Start
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

### 6. Verify
```bash
curl http://localhost:8010/health
# {"service":"ok","db":{"status":"ok",...},"redis":{"status":"ok",...},...}
```

## API Reference

### POST /api/match
Runs the 4-step intelligent matching pipeline.

If Gemini or embedding APIs are temporarily unavailable, the service returns a structured degraded fallback response using lexical retrieval + deterministic reranking so Java backend contracts remain stable.

**Request:**
```json
{
  "jobDescription": "Senior Backend Engineer at Google...",
  "resumeText": "John Doe - 5 years experience in Java, Spring Boot...",
  "seekerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "rank": 1,
      "candidateId": "uuid",
      "fullName": "Sarah Chen",
      "jobTitle": "Staff Engineer",
      "company": "Google",
      "score": 8.7,
      "successLikelihoodPercent": 87,
      "reasoning": "Strong domain alignment in distributed systems...",
      "strongPoints": ["Same tech stack", "Overlapping projects"],
      "redFlags": [],
      "suggestedOpening": "Mention your CRDT experience"
    }
  ],
  "totalCandidatesEvaluated": 20,
  "pipelineTiming": {
    "documentIntelligenceMs": 1200,
    "semanticRetrievalMs": 150,
    "llmRerankingMs": 2500,
    "synthesisMs": 5,
    "totalMs": 3855
  }
}
```

### POST /api/coach/suggest
Streams coaching suggestions via SSE.

**Request:**
```json
{
  "conversationId": "uuid",
  "seekerId": "uuid",
  "referrerId": "uuid",
  "currentMessage": "Hi Sarah, I noticed you work at Google...",
  "currentStage": "first_contact"
}
```

**SSE Response (with `Accept: text/event-stream`):**
```
event: suggestion
data: {"chunk": "Great start! Sarah mentioned "}

event: suggestion
data: {"chunk": "she works on the Sync Engine..."}

event: done
data: {"status": "complete"}
```

### POST /api/generate-message
Generates personalized outreach message.

**Request:**
```json
{
  "seekerId": "uuid",
  "referrerId": "uuid",
  "jobContext": "Senior Backend Engineer at Google Cloud"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Hi Sarah, I came across your profile and was impressed by...",
  "tone": "professional",
  "wordCount": 142
}
```

### POST /api/index-referrer
Indexes a referrer profile for semantic search.

**Request:**
```json
{
  "referrerId": "uuid",
  "bio": "Staff engineer focused on distributed systems...",
  "skills": ["Java", "Kafka", "Kubernetes"],
  "jobTitle": "Staff Engineer",
  "company": "Google",
  "seniority": "Staff",
  "yearsOfExperience": 8
}
```

### POST /api/outcomes/record
Records referral outcome for the feedback loop.

**Request:**
```json
{
  "requestId": "uuid",
  "outcomeType": "GOT_REFERRAL",
  "reporterId": "uuid"
}
```

### GET /health
Public endpoint (no auth required).

## Docker

```bash
# Build and run
docker compose up --build

# Or
docker build -t referai-ai-service .
docker run -p 8010:8010 --env-file .env referai-ai-service
```

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| FastAPI | Async API framework |
| LangGraph | Stateful AI agent graphs |
| Gemini 2.0 Flash | LLM for ranking, coaching, generation |
| Gemini text-embedding-004 | 768-dim vector embeddings |
| pgvector | Vector similarity search in PostgreSQL |
| Redis | Coach agent state persistence |
| SSE (sse-starlette) | Real-time streaming for coach |
| Pydantic | Request/response validation |
| asyncpg | Async PostgreSQL driver |
| structlog | Structured JSON logging |

## Project Structure

```
referai-ai-service/
├── app/
│   ├── agents/
│   │   ├── matching/          # LangGraph matching pipeline
│   │   │   ├── state.py       # TypedDict state definition
│   │   │   ├── nodes.py       # 4 pipeline nodes + conditional edge
│   │   │   └── graph.py       # Compiled StateGraph singleton
│   │   └── coach/             # LangGraph coach agent
│   │       ├── state.py       # Coach state definition
│   │       ├── nodes.py       # 5 agent nodes
│   │       └── graph.py       # Compiled StateGraph singleton
│   ├── api/
│   │   ├── router.py          # Route registration
│   │   └── routes/
│   │       ├── health.py      # GET /health
│   │       ├── document.py    # Resume extraction + JD scraping
│   │       ├── matching.py    # POST /api/match
│   │       ├── coach.py       # POST /api/coach/suggest (SSE)
│   │       ├── outreach.py    # POST /api/generate-message
│   │       ├── indexing.py    # POST /api/index-referrer
│   │       └── outcomes.py    # POST /api/outcomes/record
│   ├── core/
│   │   ├── config.py          # Pydantic settings
│   │   └── logging.py         # Structured logging
│   ├── db/
│   │   ├── postgres.py        # Async pool + migrations
│   │   ├── redis.py           # Async Redis client
│   │   └── migration_runner.py
│   ├── middleware/
│   │   └── internal_auth.py   # X-Internal-Key auth
│   ├── schemas/               # Pydantic request/response models
│   ├── services/
│   │   ├── gemini_client.py   # Async Gemini wrapper
│   │   ├── embedding_service.py
│   │   ├── matching_service.py
│   │   ├── coach_service.py
│   │   ├── outreach_service.py
│   │   ├── indexing_service.py
│   │   ├── outcome_service.py
│   │   ├── document_extractor.py
│   │   └── job_scraper.py
│   └── main.py                # App entrypoint + lifespan
├── migrations/sql/
│   ├── V5__add_embeddings.sql
│   ├── V6__referral_outcomes.sql
│   └── V7__coach_advice_log.sql
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```
