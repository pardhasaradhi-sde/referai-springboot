# ReferAI — AI-Powered Referral Network
> Try the app first: https://referai.vercel.app/
> 
> 70% of jobs are filled through referrals. Most job seekers apply cold anyway.  
> ReferAI closes that gap.

---

## What Is This?

Applying to jobs cold — submitting a resume through a job portal and hoping an ATS doesn't bury it — has one of the lowest conversion rates in the entire hiring process. Candidates who get referred bypass the ATS filter, get a human review instantly, and are 4× more likely to get an interview.

**ReferAI is a platform that makes referrals accessible to anyone, not just people who already have a network.**

Here is what it does:

1. **Understands your resume** — The AI reads your actual experience, not just keywords.
2. **Finds the right employees** — Semantic vector search matches you against employees at your target company based on real skill overlap, not LinkedIn connections.
3. **Writes the outreach for you** — A personalized, first-person message built from both your profile and the referrer's background. Referrers can tell the difference between a template and a real person. This isn't a template.
4. **Coaches you through the conversation** — AI coaching suggestions stream in real-time inside the chat window once a referrer accepts. It reads the conversation history and tells you what to say next.

---

## Who Is It For?

| User Type | What They Get |
|---|---|
| **Job Seekers** | AI-matched referrer discovery, personalized outreach, real-time chat, AI coaching |
| **Employees (Referrers)** | A clean inbox of qualified candidates they opted in to help |

---

## Architecture

ReferAI is a three-tier distributed system. All AI work is isolated in a private Python microservice — the Spring Boot backend never calls external AI APIs directly.

```
┌────────────────────────────────────────────────────────────┐
│                      User Browser                           │
│            Next.js 16 Frontend (App Router + SSR)           │
└────────────────────────┬───────────────────────────────────┘
                         │  HTTPS + JWT Cookie
                         ▼
┌────────────────────────────────────────────────────────────┐
│               Spring Boot Backend  :8080                    │
│   REST API · JWT Auth · WebSocket · Redis Cache · Flyway    │
│   RateLimitingFilter → QuotaService → MatchingService       │
└──────────┬──────────────────────────┬──────────────────────┘
           │  JDBC                    │  HTTP + X-Internal-Key
           ▼                          ▼
    ┌─────────────┐       ┌──────────────────────────────┐
    │ PostgreSQL  │       │  FastAPI AI Service  :8010    │
    │ (pgvector)  │◄──────│  LangGraph · pgvector         │
    └─────────────┘       │  Groq LLM · Gemini Embeddings │
           ▲              └──────────────────────────────┘
           │
    ┌─────────────┐  ┌─────────────┐  ┌────────────────┐
    │    Redis    │  │   Appwrite  │  │ Google Gemini  │
    │  AI Cache   │  │   Storage   │  │  Groq LLM API  │
    └─────────────┘  └─────────────┘  └────────────────┘
```

### Key Design Decisions

| Decision | Why |
|---|---|
| Separate Python AI Service | Keeps the JVM lean; Python has the most mature AI/ML ecosystem |
| `X-Internal-Key` middleware | AI service has no public IP — only the backend can reach it |
| Redis match caching | A 128-bit MD5 hash of the JD+resume caches results for 1hr, avoiding ~$0.005 on identical reruns |
| pgvector for retrieval | 768-D Gemini embeddings enable O(log n) cosine similarity search over referrer profiles |
| LangGraph state machines | Matching and coaching logic is expressed as typed, inspectable, resumable graph pipelines |
| STOMP over SockJS | Industry-standard real-time pub-sub with graceful HTTP fallback |
| Flyway migrations | Both backend and AI service own versioned SQL migration sets |
| Rate limiter before JWT | `RateLimitingFilter` fires before token decoding, protecting expensive endpoints early |

---

## Features

### For Job Seekers
- Upload PDF or DOCX resume — AI extracts skills, seniority, and experience depth
- Paste a job URL or JD text — AI scrapes and cleans the description
- Run AI matching — semantic pipeline returns top 5 referrers ranked by real skill overlap, not keywords
- Generate a personalized referral outreach message in one click
- Chat with referrers in real-time once they accept your request
- Get AI coaching suggestions mid-conversation via SSE stream
- View your full matching history with pipeline telemetry

### For Referrers
- Opt-in profile indexed into pgvector so seekers can discover you
- Review incoming requests with AI match scores and seeker context
- Accept to open a chat; decline or ignore anything that isn't a fit

### Platform Engineering
- JWT auth with custom Spring Security filter chain
- Per-user daily AI quotas enforced in Redis before any LLM call is made
- IP-level sliding-window rate limiting (100 req / 15 min)
- Async email notifications (login OTP, new request, new message) via SMTP
- Outcome reporting with a Redis feedback flywheel that adjusts synthesis weights over time

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 16 | App Router, Turbopack |
| Frontend | React 19 + TypeScript 5 | |
| Frontend | Framer Motion | Micro-animations, AnimatePresence |
| Frontend | `@stomp/stompjs` + `sockjs-client` | Real-time WebSocket chat |
| Backend | Spring Boot 3.3 / Java 21 | |
| Backend | Spring Security | Custom JWT filter + WebSocket security |
| Backend | Spring WebFlux WebClient | Non-blocking HTTP to AI service |
| Backend | Spring Data Redis / Jedis | Quota + cache |
| Backend | Flyway | Versioned SQL migrations |
| AI Service | FastAPI | Python async HTTP framework |
| AI Service | LangGraph | `StateGraph` agent pipelines |
| AI Service | Groq | Llama 3.1 70B inference |
| AI Service | Google Gemini | `text-embedding-004` 768-D embeddings |
| AI Service | pgvector | PostgreSQL vector similarity extension |
| AI Service | `pdfplumber` + `python-docx` | Resume text extraction |
| Database | PostgreSQL 15+ | pgvector extension required |
| Cache | Redis 7+ | AI results, quota counters, flywheel weights |
| Storage | Appwrite | Resume file storage (PDF/DOCX) |

---

## Project Structure

```
referai/
├── backend/                                # Spring Boot API
│   ├── pom.xml
│   └── src/main/java/com/referai/backend/
│       ├── config/                         # Security, WebSocket, Redis, Appwrite, Async
│       ├── controller/                     # Auth, Profile, Matching, Requests, Chat
│       ├── dto/                            # Request/Response DTOs per endpoint
│       ├── entity/                         # User, Profile, ReferralRequest, Conversation, Message
│       ├── exception/                      # GlobalExceptionHandler, QuotaExceededException (429)
│       ├── repository/                     # Spring Data JPA repos with JPQL join fetches
│       ├── security/                       # JwtTokenProvider, JwtAuthFilter, RateLimitingFilter
│       └── service/                        # MatchingService, QuotaService, EmailService...
│
├── frontend/                               # Next.js App Router application
│   ├── app/
│   │   ├── auth/                           # /login, /signup
│   │   ├── dashboard/                      # AI matching UI + matching-history subpage
│   │   ├── dashboard/requests/             # Outgoing/incoming request management
│   │   ├── messages/                       # Conversation list
│   │   ├── messages/[id]/                  # Chat view with real-time AI coaching (SSE)
│   │   ├── profile/                        # Profile view and editing
│   │   ├── profile/setup/                  # Multi-step onboarding (role → details)
│   │   ├── referrers/                      # Referrer browse and detail
│   │   └── request/[id]/                   # Individual referral request view
│   ├── components/
│   │   ├── dashboard/                      # JdInput, NotificationBell
│   │   ├── landing/                        # Footer, HowItWorks, SocialProof,
│   │   │                                   # MatchmakingWorkflow, NetworkDemo,
│   │   │                                   # ReferralAsk, FeaturesGrid, Magnetic
│   │   ├── profile/                        # FileUpload component
│   │   └── ui/                             # Toast, Loading, generic UI
│   ├── lib/
│   │   ├── api/client.ts                   # Unified JWT-bearing fetch wrapper
│   │   ├── api/types.ts                    # TypeScript types matching backend DTOs
│   │   └── websocket.ts                    # STOMP client factory
│   └── proxy.ts                            # Next.js middleware — cookie route protection
│
└── referai-ai-service/                     # FastAPI Python microservice
    ├── app/
    │   ├── agents/
    │   │   ├── matching/                   # LangGraph matching state machine (4 nodes)
    │   │   └── coach/                      # LangGraph coach state machine (4 nodes + SSE)
    │   ├── api/routes/                     # health, document, matching, outreach, coach, indexing, outcomes
    │   ├── core/
    │   │   ├── config.py                   # Pydantic Settings from .env
    │   │   └── vector.py                   # Cosine similarity math utilities
    │   ├── middleware/                      # X-Internal-Key enforcement
    │   ├── schemas/                         # Pydantic request/response models
    │   └── services/                        # matching, coach, outreach, indexing, embedding, outcome
    ├── migrations/sql/                      # Versioned SQL migrations (managed separately from backend)
    └── tests/
        └── test_api_contracts.py            # HTTP contract tests for all routes
```

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 22.x |
| Java | 21 |
| Maven | 3.9+ |
| Python | 3.11+ |
| PostgreSQL | 15+ with `pgvector` extension |
| Redis | 7+ |

### Required External Accounts

- **Google Gemini API key** — `text-embedding-004` for vector generation
- **Groq API key** — Llama 3.1 70B LLM inference
- **Appwrite project** — storage bucket named `referai-resumes` for resume files

---

## Getting Started

### 1. Clone

```bash
git clone https://github.com/pardhasaradhi-sde/referai-springboot.git
cd referai-springboot
```

### 2. Set up the database

```sql
CREATE DATABASE referai;
\c referai
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Install dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && mvn clean compile

# AI Service (Windows)
cd referai-ai-service
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip && pip install -e .

# AI Service (macOS / Linux)
cd referai-ai-service
python -m venv .venv && source .venv/bin/activate
pip install --upgrade pip && pip install -e .
```

### 4. Configure environment variables

See [Environment Variables](#environment-variables). Create:

- `frontend/.env.local`
- `backend/.env` (or set in `application.yml`)
- `referai-ai-service/.env`

### 5. Start services in order

```bash
# 1. Ensure PostgreSQL and Redis are running

# 2. AI Service
cd referai-ai-service
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8010

# 3. Spring Boot Backend
cd backend && mvn spring-boot:run

# 4. Frontend
cd frontend && npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

---

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Required | Example | Description |
|---|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Yes | `http://localhost:8080` | Base URL for the Spring Boot API and WebSocket |

### Backend

| Variable | Required | Example | Description |
|---|---|---|---|
| `SPRING_DATASOURCE_URL` | Yes | `jdbc:postgresql://localhost:5432/referai` | PostgreSQL JDBC connection |
| `SPRING_DATASOURCE_USERNAME` | Yes | `postgres` | PostgreSQL username |
| `SPRING_DATASOURCE_PASSWORD` | Yes | `your_password` | PostgreSQL password |
| `APP_JWT_SECRET` | Yes | `32-plus-char-secret` | JWT signing secret |
| `APP_JWT_EXPIRATION_MS` | Yes | `86400000` | Token TTL in ms (24 hrs) |
| `APPWRITE_PROJECT_ID` | Yes | `your-project-id` | Appwrite project ID |
| `APPWRITE_API_KEY` | Yes | `standard_xxx` | Appwrite API key |
| `PYTHON_SERVICE_URL` | Yes | `http://localhost:8010` | Internal URL of FastAPI AI service |
| `PYTHON_INTERNAL_KEY` | Yes | `referai-internal-secret-2026` | Shared internal auth key |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection URL |
| `MAIL_ENABLED` | No | `true` | Enable SMTP email notifications (default: false) |
| `MAIL_SMTP_HOST` | No | `smtp.gmail.com` | SMTP host |
| `MAIL_SMTP_PORT` | No | `587` | SMTP port |
| `MAIL_USERNAME` | No | `youremail@gmail.com` | SMTP username |
| `MAIL_PASSWORD` | No | `app-password` | SMTP password (Google App Password) |
| `MAIL_FROM_NAME` | No | `ReferAI` | Sender display name in email templates |
| `APP_PUBLIC_FRONTEND_URL` | No | `http://localhost:3001` | Base URL embedded in notification email links |

### AI Service (`referai-ai-service/.env`)

| Variable | Required | Example | Description |
|---|---|---|---|
| `X_INTERNAL_KEY` | Yes | `referai-internal-secret-2026` | Must match `PYTHON_INTERNAL_KEY` in backend |
| `GEMINI_API_KEY` | Yes | `AIza...` | Google Gemini key for embeddings |
| `GROQ_API_KEY` | Yes | `gsk_...` | Groq key for LLM inference |
| `POSTGRES_URL` | Yes | `postgresql://postgres:pass@localhost:5432/referai` | PostgreSQL connection for AI service |
| `REDIS_URL` | Yes | `redis://localhost:6379/0` | Redis for flywheel weight state |
| `APP_HOST` | No | `0.0.0.0` | Uvicorn host binding |
| `APP_PORT` | No | `8010` | Service port |
| `LOG_LEVEL` | No | `INFO` | Log verbosity |
| `RUN_MIGRATIONS` | No | `false` | Run SQL migrations on startup |

### Appwrite Bucket Setup

Create a bucket with:
- **Bucket ID**: `referai-resumes`
- **Size limit**: 5 MB
- **Allowed extensions**: `pdf`, `docx`
- **Permissions**: CRUD for authenticated users

---

## API Reference

**Backend base URL:** `http://localhost:8080`  
**Auth:** `Authorization: Bearer <JWT>` on all protected endpoints  
**WebSocket:** SockJS/STOMP at `ws://localhost:8080/ws`

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register with email + password |
| `POST` | `/api/auth/login` | Public | Login — returns JWT |

### Profiles

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/profiles/me` | Current user profile |
| `PUT` | `/api/profiles/me` | Update profile fields |
| `POST` | `/api/profiles/upload-resume` | Upload PDF/DOCX to Appwrite |
| `GET` | `/api/referrers` | Browse referrers (filter: `company`, `search`) |
| `GET` | `/api/referrers/{id}` | Specific referrer profile |

### Matching & AI — _Quota-Protected_

| Method | Endpoint | Daily Limit | Description |
|---|---|---|---|
| `POST` | `/api/matching/analyze` | 5 / user | Full 4-step LangGraph matching pipeline |
| `POST` | `/api/matching/extract-jd` | 20 / user | Extract JD from URL or plain text |
| `POST` | `/api/matching/generate-message` | — | AI-drafted outreach message |
| `GET` | `/api/matching/history` | — | Past matching run telemetry |
| `POST` | `/api/matching/coach-suggest` | 20 / user | Stream AI coaching via SSE |

### Referral Requests

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/requests` | Send a referral request |
| `GET` | `/api/requests/outgoing` | Requests you sent |
| `GET` | `/api/requests/incoming` | Requests received |
| `POST` | `/api/requests/{id}/accept` | Accept → creates conversation |
| `POST` | `/api/requests/{id}/decline` | Decline |
| `DELETE` | `/api/requests/{id}/connection` | Remove accepted connection |
| `POST` | `/api/requests/{id}/outcome` | Report outcome (referral / interview / offer) |

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/conversations` | All conversations |
| `GET` | `/api/conversations/{id}/messages` | Message history |
| `POST` | `/api/conversations/{id}/messages` | Send message via HTTP |
| `WS` | `/ws` | STOMP — subscribe to `/topic/conversations/{id}` |

### Internal AI Service Routes

Protected by `X-Internal-Key`. Never exposed publicly.

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Checks Postgres, Redis, Groq, Gemini |
| `POST` | `/api/extract-resume` | Extracts text from PDF/DOCX |
| `POST` | `/api/scrape-jd` | Scrapes and cleans JD HTML |
| `POST` | `/api/match` | 4-step LangGraph matching pipeline |
| `POST` | `/api/generate-outreach` | Personalized first message via RAG |
| `POST` | `/api/coach/suggest` | SSE coaching stream |
| `POST` | `/api/index-referrer` | Embeds referrer into pgvector |
| `POST` | `/api/outcomes/record` | Records outcome for flywheel |

---

## AI Pipeline Deep Dive

### Matching (`/api/match`)

A 4-node LangGraph pipeline — each node has a distinct job:

```
document_intelligence → semantic_retrieval → llm_reranking → synthesis
```

| Node | Work | Est. Cost |
|---|---|---|
| `document_intelligence` | LLM extracts target company, must-have skills, seeker strengths and gaps from resume + JD | ~$0.0015 |
| `semantic_retrieval` | Embeds seeker profile to 768-D vector → pgvector cosine search → top 20 candidates at target company | ~$0.00001 |
| `llm_reranking` | Two-pass LLM: (1) deep evaluation of all candidates, (2) comparative re-ranking to final top 5 | ~$0.0037 |
| `synthesis` | Combines LLM score (45%), semantic score (10%), company tier (25%), Redis flywheel weights (20%) | $0 |

> **~$0.005 per run** — this is why a 5-match/day quota exists.

### AI Coach (`/api/coach/suggest`)

Streaming SSE pipeline inside the chat window:

```
load_context → rag_retrieval → analyze_situation → generate_suggestion
```

Reads the last 20 messages and both profiles, classifies the coaching stage, then streams a specific suggestion for what to say next.

> **~$0.0012 per suggestion**

### Outreach Drafter (`/api/generate-outreach`)

RAG-based message generation using both profiles:

1. Fetches seeker + referrer profiles and historical feedback from Redis
2. Runs cosine similarity over both profiles to find the 4 strongest shared talking points
3. Prompts LLM — hard rules: under 200 words, first-person, zero AI buzzwords
4. Self-correction guard: if third-person self-reference is detected, one more LLM pass to fix it

> **~$0.001 per message** (up to $0.002 if self-correction triggers)

---

## Rate Limiting & Quotas

### IP-Level Rate Limiter

`RateLimitingFilter` runs before the JWT filter chain — **100 requests / 15 minutes** per IP. Returns `429 Too Many Requests` with a `Retry-After` header.

### Per-User AI Quotas

Tracked in Redis with `INCR` and 48-hour TTL:

| Feature | Daily Limit |
|---|---|
| AI Matching | 5 runs |
| JD Extraction | 20 requests |
| AI Coach | 20 suggestions |

Quota is checked **before** the AI call and incremented **after** success only. Cached or failed responses never consume quota.

---

## Usage Flows

### Job Seeker

1. Register → complete onboarding → upload resume
2. On `/dashboard`, paste a job URL or JD text
3. Run AI matching — review top-ranked referrers with score explanations
4. Visit a referrer's profile → generate a personalized outreach message
5. Send the referral request
6. Once accepted, continue in chat → use AI coach for real-time suggestions
7. Report the outcome (helps the model improve over time)

### Referrer

1. Register → complete referrer profile (company, skills, seniority)
2. Profile is auto-indexed into pgvector
3. Review incoming requests on `/dashboard/requests`
4. Accept → opens a conversation; decline anything that isn't a fit
5. Chat with the seeker, refer if the fit is strong

---

## Testing

### Backend

```bash
cd backend
mvn test
```

### AI Service

```bash
cd referai-ai-service
.venv\Scripts\python.exe -m pytest   # Windows
python -m pytest                     # macOS/Linux
```

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

### Manual Verification Checklist

- [ ] Register as seeker, complete onboarding and upload a PDF resume
- [ ] Paste a job board URL and a plain JD — verify both extract correctly
- [ ] Run AI matching — verify ranked referrers appear with reasoning
- [ ] Generate an outreach message — verify it reads as first-person and natural
- [ ] Send a referral request; accept from the referrer side
- [ ] Confirm conversation opens and STOMP chat works in real time
- [ ] Click the AI coach button — verify SSE streaming suggestions appear
- [ ] Exceed the daily quota limit — verify 429 is returned cleanly

---

## Deployment

| Service | Recommended Platform |
|---|---|
| **Frontend** | Vercel (native Next.js support) |
| **Spring Boot Backend** | DigitalOcean App Platform / Droplet |
| **FastAPI AI Service** | Same host as backend (private network) |
| **PostgreSQL** | Managed: DO Managed DB, Supabase, or Neon |
| **Redis** | Managed: Upstash or Redis Cloud |
| **Appwrite** | Appwrite Cloud |

> The backend makes synchronous calls to the AI service on every matching request. Keep them co-located to avoid cross-cloud latency and egress costs. The AI service should never have a public IP.

### Production Build Commands

```bash
# Frontend
cd frontend && npm run build && npm run start

# Backend
cd backend && mvn clean package -DskipTests
java -jar target/backend-0.0.1-SNAPSHOT.jar

# AI Service
cd referai-ai-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010 --workers 2
```

### Deployment Checklist

- [ ] PostgreSQL provisioned with `pgvector` extension enabled
- [ ] Redis provisioned and URL configured
- [ ] Appwrite bucket `referai-resumes` created
- [ ] `X_INTERNAL_KEY` / `PYTHON_INTERNAL_KEY` match across services
- [ ] `NEXT_PUBLIC_BACKEND_URL` points to the deployed Spring Boot URL
- [ ] CORS origins updated in Spring Boot `SecurityConfig`
- [ ] WebSocket path accessible (check load balancer headers)
- [ ] Flyway migrations run on first backend startup
- [ ] AI service `RUN_MIGRATIONS=true` on first deploy, then back to `false`
- [ ] `MAIL_ENABLED=true` and SMTP credentials set if email notifications are needed

---

## Author

**Pardha Saradhi** — Built this because I got tired of applying cold and getting ignored by ATS.

- GitHub: [pardhasaradhi-sde](https://github.com/pardhasaradhi-sde)
- LinkedIn: [linkedin.com/in/pardha-saradhi18](https://www.linkedin.com/in/pardha-saradhi18/)
- Twitter / X: [@\_\_pardhu](https://x.com/__pardhu)

---

If this was useful, consider starring the repo ⭐
