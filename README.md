# ![ReferAI Banner](https://img.shields.io/badge/ReferAI-AI%20Powered%20Referral%20Network-111111?style=for-the-badge)

# ReferAI

> Break the hiring wall with AI-powered referral matchmaking.

ReferAI is a full-stack referral networking platform that helps job seekers find internal advocates at target companies, score the best matches with AI, draft personalized outreach, and continue the conversation in real time.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots / Demo](#screenshots--demo)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started / Installation](#getting-started--installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)
- [Acknowledgements](#acknowledgements)
- [Support](#support)

---

## Overview

ReferAI replaces cold ATS submissions with a warmer, higher-signal workflow: understand the role, match the candidate to the right internal employees, generate a thoughtful referral ask, and move accepted requests into real-time chat.

The project solves a common hiring problem for both sides of the network. Job seekers struggle to reach real people inside companies, while potential referrers need enough context to quickly understand whether they can help. ReferAI bridges that gap with structured profiles, AI-assisted matching, and a referral-specific workflow.

It is built for:

- Job seekers targeting referrals instead of blind applications
- Employees who are open to referring strong candidates
- Developers exploring applied AI in networking, matching, and developer tooling

### Why this project?

Most hiring tools optimize for applications, not introductions. ReferAI is opinionated around the belief that referrals are a stronger path into companies than generic job portals. Instead of being another resume storage app, it is designed as a referral operating system: profile onboarding, matching intelligence, outreach drafting, request lifecycle management, and real-time follow-up in one product.

---

## Features

- Dual-role profiles for seekers, referrers, or users who are both
- AI-powered matching using resume context, job description context, role similarity, and seniority fit
- Resume upload with PDF and DOCX extraction through a dedicated Python microservice
- Job description extraction from job board URLs and generic company career pages
- AI-generated referral outreach messages personalized to the referrer and job context
- JWT-based authentication with protected frontend routes
- Real-time chat using STOMP over SockJS after a referral request is accepted
- Referral request lifecycle with outgoing, incoming, accept, decline, and connection removal flows
- In-memory match result caching to reduce repeated Gemini calls
- Company-aware matching that prioritizes referrers at the target company when available

### What makes it different?

- It is referral-first, not application-first
- It combines a typed Spring Boot API with a separate FastAPI AI service instead of burying AI logic directly in the web app
- It supports both structured extraction and user editability, so AI accelerates the workflow without taking control away from the user
- It handles the full loop from discovery to outreach to chat


## Tech Stack

| Layer | Technologies | Notes |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 3, Framer Motion, Zustand, Zod, Lucide React | App Router UI, auth-aware navigation, typed API clients, animated landing pages |
| Backend | Spring Boot 3.3, Java 21, Spring Security, Spring Data JPA, Spring WebSocket, WebFlux WebClient, JJWT, Flyway, Lombok | REST API, JWT auth, persistence, real-time chat, AI/Appwrite integration |
| AI Service | FastAPI, Uvicorn, Pydantic, Pydantic Settings, httpx, BeautifulSoup4, lxml, PyPDF2, python-docx, Playwright | Resume extraction, JD scraping, internal API authentication |
| Database | PostgreSQL | Users, profiles, referral requests, conversations, messages |
| Cache / Infra | Redis, Appwrite Storage | Redis for AI service infrastructure, Appwrite for resume files |
| AI / External APIs | Google Gemini API, Appwrite Cloud | Structured extraction, message drafting, cloud file storage |
| Testing | JUnit 5, Mockito, pytest, frontend smoke checks | Backend unit tests, AI service health tests, frontend wiring checks |

---

## Project Structure

```text
referai/
|-- backend/                               # Spring Boot API, business logic, persistence, WebSocket chat
|   |-- pom.xml                            # Maven build and Java dependencies
|   `-- src/
|       |-- main/
|       |   |-- java/com/referai/backend/
|       |   |   |-- BackendApplication.java
|       |   |   |-- config/                # Security, Appwrite, WebSocket, shared app config
|       |   |   |-- controller/            # Auth, profile, matching, requests, chat, conversations
|       |   |   |-- dto/                   # Request/response payloads
|       |   |   |-- entity/                # JPA entities and enums
|       |   |   |-- exception/             # Global and external service error handling
|       |   |   |-- mapper/                # Entity <-> DTO mapping
|       |   |   |-- repository/            # Spring Data repositories
|       |   |   |-- security/              # JWT token provider and request filter
|       |   |   `-- service/               # Core product logic, AI integration, storage integration
|       |   `-- resources/
|       |       |-- application.yml        # Spring configuration driven by env vars
|       |       `-- db/migration/          # Flyway SQL migrations
|       `-- test/
|           `-- java/com/referai/backend/service/
|               |-- MatchingServiceTest.java
|               `-- ReferralRequestServiceTest.java
|-- frontend/                              # Next.js application
|   |-- app/                               # App Router pages and route segments
|   |   |-- auth/                          # Login and signup
|   |   |-- dashboard/                     # Match flow and request dashboard
|   |   |-- messages/                      # Conversation list and chat detail
|   |   |-- profile/                       # Profile view and setup flow
|   |   |-- referrers/                     # Referrer browse and detail pages
|   |   |-- request/                       # Referral request composer
|   |   |-- globals.css                    # Global theme and utility styles
|   |   `-- layout.tsx                     # Root layout
|   |-- components/
|   |   |-- dashboard/                     # JD input and dashboard-specific UI
|   |   |-- landing/                       # Marketing page sections
|   |   |-- profile/                       # Resume upload UI
|   |   `-- ui/                            # Toasts, loading states, generic UI pieces
|   |-- lib/
|   |   |-- ai/                            # Runtime schemas
|   |   |-- api/                           # Typed API client and shared types
|   |   |-- utils.ts                       # Helpers like delimited list parsing
|   |   `-- websocket.ts                   # STOMP client wiring
|   |-- tests/
|   |   `-- smoke-check.mjs                # Basic filesystem and route wiring validation
|   |-- middleware.ts                      # Route protection via cookie presence
|   |-- next.config.ts
|   |-- package.json
|   |-- postcss.config.js
|   |-- tailwind.config.ts
|   `-- tsconfig.json
|-- referai-ai-service/                    # FastAPI microservice for extraction and scraping
|   |-- app/
|   |   |-- api/routes/                    # `/health`, `/api/extract-resume`, `/api/scrape-jd`
|   |   |-- core/                          # Settings and structured logging
|   |   |-- db/                            # Postgres/Redis bootstrap and migration runner
|   |   |-- middleware/                    # Internal API key enforcement
|   |   |-- schemas/                       # Pydantic request/response models
|   |   `-- services/                      # Resume extraction and job scraping
|   |-- migrations/sql/                    # AI-service-side SQL migrations and placeholders
|   |-- tests/
|   |   `-- test_health.py
|   |-- pyproject.toml
|   `-- requirements.txt
|-- docs/                                  # Design docs, setup guides, testing docs, implementation notes
|-- .gitignore
`-- README.md
```

---

## Prerequisites

Use the following versions for a smooth local setup:

- Node.js `22.x` recommended
- npm `10.x` recommended
- Java `21`
- Maven `3.9+`
- Python `3.9+` (tested in this workspace with Python `3.13`)
- PostgreSQL `15+`
- Redis `7+` recommended for the AI service infrastructure

### Required Accounts / Secrets

- Google Gemini API key
- Appwrite project with a storage bucket named `referai-resumes`

### OS Compatibility

- Developed and tested on Windows
- Should work on macOS and Linux with equivalent shell commands
- PowerShell examples are included where Windows behavior matters

---

## Getting Started / Installation

### 1. Clone the repository

```bash
git clone https://github.com/pardhasaradhi-sde/referai-springboot.git
cd referai-springboot
```

### 2. Install dependencies

#### Frontend

```bash
cd frontend
npm install
cd ..
```

#### Backend

```bash
cd backend
mvn clean compile
cd ..
```

#### AI Service

```bash
cd referai-ai-service
python -m venv .venv
```

**Windows PowerShell**

```powershell
cd D:\path\to\referai-springboot\referai-ai-service
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e .
```

**macOS / Linux**

```bash
cd referai-ai-service
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e .
```

### 3. Configure environment variables

Use the checked-in example files where available:

- `backend/.env.example`
- `referai-ai-service/.env.example`

Create these runtime files locally:

- `backend/.env`
- `referai-ai-service/.env`
- `frontend/.env.local`

### 4. Run the application

Start the services in this order:

#### Start PostgreSQL and Redis

If you are running them locally, ensure they are available first.

#### Start the AI service

```bash
cd referai-ai-service
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8010
```

#### Start the backend

```bash
cd backend
mvn spring-boot:run
```

#### Start the frontend

```bash
cd frontend
npm run dev
```

Open the app at [http://localhost:3001](http://localhost:3001).

---

## Environment Variables

### Example files

- Backend example: `backend/.env.example`
- AI service example: `referai-ai-service/.env.example`
- Frontend uses `.env.local` and does not currently ship with an example file

### Configuration matrix

| Service | Variable | Required | Example | Description |
| --- | --- | --- | --- | --- |
| Frontend | `NEXT_PUBLIC_BACKEND_URL` | Yes | `http://localhost:8080` | Base URL for the Spring Boot API and WebSocket endpoint |
| Backend | `SPRING_DATASOURCE_URL` | Yes | `jdbc:postgresql://localhost:5432/referai` | PostgreSQL JDBC connection string |
| Backend | `SPRING_DATASOURCE_USERNAME` | Yes | `postgres` | PostgreSQL username |
| Backend | `SPRING_DATASOURCE_PASSWORD` | Yes | `your_db_password` | PostgreSQL password |
| Backend | `APP_JWT_SECRET` | Yes | `replace-with-32-plus-char-secret` | JWT signing secret; must be at least 32 characters |
| Backend | `APP_JWT_EXPIRATION_MS` | Yes | `86400000` | Access token TTL in milliseconds |
| Backend | `GEMINI_API_KEY` | Yes | `AIza...` | Google Gemini API key |
| Backend | `APP_GEMINI_MODEL` | No | `gemini-2.0-flash` | Gemini model override |
| Backend | `APPWRITE_API_KEY` | Yes | `standard_xxx` | Appwrite API key used for resume uploads |
| Backend | `PYTHON_SERVICE_URL` | Yes | `http://localhost:8010` | Base URL for the FastAPI AI service |
| Backend | `PYTHON_INTERNAL_KEY` | Yes | `referai-internal-secret-2026` | Shared internal auth key for backend -> AI service calls |
| AI Service | `APP_NAME` | No | `referai-ai-service` | Application name for logs and metadata |
| AI Service | `APP_ENV` | No | `development` | Environment name |
| AI Service | `APP_HOST` | No | `0.0.0.0` | Host binding |
| AI Service | `APP_PORT` | No | `8010` | Service port |
| AI Service | `LOG_LEVEL` | No | `INFO` | Logging level |
| AI Service | `X_INTERNAL_KEY` | Yes | `referai-internal-secret-2026` | Internal API key accepted by middleware |
| AI Service | `PYTHON_INTERNAL_KEY` | No | `referai-internal-secret-2026` | Alias for the same internal API key |
| AI Service | `POSTGRES_URL` | No | `postgresql://postgres:postgres@localhost:5432/referai` | AI-service-side database connection |
| AI Service | `REDIS_URL` | No | `redis://localhost:6379/0` | Redis connection string |
| AI Service | `RUN_MIGRATIONS` | No | `false` | Run startup migrations on boot |
| AI Service | `MIGRATIONS_PATH` | No | `migrations/sql` | Migration directory path |

### Appwrite bucket requirements

Create a storage bucket with the following settings:

- Bucket ID: `referai-resumes`
- Size limit: `5MB`
- Allowed extensions: `pdf`, `docx`
- Read / Create / Update / Delete permissions for authenticated users

---

## Usage

### Development mode

Run the three services locally:

```bash
# Terminal 1
cd referai-ai-service
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8010
```

```bash
# Terminal 2
cd backend
mvn spring-boot:run
```

```bash
# Terminal 3
cd frontend
npm run dev
```

### Production mode

#### Frontend

```bash
cd frontend
npm run build
npm run start
```

#### Backend

```bash
cd backend
mvn clean package -DskipTests
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

#### AI Service

```bash
cd referai-ai-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010
```

### Typical user workflow

1. Register or log in
2. Complete profile setup
3. Upload a resume and review extracted text
4. Paste a job description or job URL into the dashboard
5. Run AI matching
6. Review suggested referrers
7. Generate and send a referral request
8. Accept the request from the other side and continue in chat

### Example API calls

#### Register

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "StrongPassword123!",
    "fullName": "Alice Doe"
  }'
```

#### Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "StrongPassword123!"
  }'
```

#### Extract a job description from a URL

```bash
curl -X POST http://localhost:8080/api/matching/extract-jd \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "https://careers.example.com/jobs/software-engineer"
  }'
```

#### Run AI matching

```bash
curl -X POST http://localhost:8080/api/matching/analyze \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Senior Backend Engineer role working on Java, Spring Boot, PostgreSQL, and distributed systems.",
    "resumeText": "Experienced backend engineer with Java, Spring Boot, PostgreSQL, and event-driven systems.",
    "targetCompany": "Acme"
  }'
```

### Matching behavior

The backend currently scores matches using:

- `65%` skill overlap
- `20%` role similarity
- `15%` seniority alignment

It returns the top `5` referrers and caches repeated resume + JD analyses in memory to reduce duplicate Gemini calls.

---

## API Reference

**Base URL:** `http://localhost:8080`  
**Auth:** `Authorization: Bearer <JWT>` on protected REST endpoints  
**WebSocket:** SockJS/STOMP at `ws://localhost:8080/ws`

### Authentication

| Method | Endpoint | Auth | Description | Request Body | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register a new user | `{ email, password, fullName }` | `AuthResponse` with token and profile |
| `POST` | `/api/auth/login` | Public | Authenticate an existing user | `{ email, password }` | `AuthResponse` with token and profile |

### Profiles and discovery

| Method | Endpoint | Auth | Description | Request Body | Response |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/profiles/me` | Yes | Fetch the current user's profile | None | `ProfileDto` |
| `PUT` | `/api/profiles/me` | Yes | Create or update role-specific profile fields | `UpdateProfileRequest` | `ProfileDto` |
| `POST` | `/api/profiles/upload-resume` | Yes | Upload a PDF or DOCX resume | `multipart/form-data` with `file` | `UploadResumeResponse` |
| `GET` | `/api/referrers` | Yes | List active referrers, optionally filtered | Query params: `company`, `search` | `ProfileDto[]` |
| `GET` | `/api/referrers/{id}` | Yes | Fetch one referrer profile | None | `ProfileDto` |

### Matching and AI

| Method | Endpoint | Auth | Description | Request Body | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/matching/analyze` | Yes | Extract structured job and profile data, then rank referrers | `{ jobDescription, resumeText, targetCompany? }` | `AnalyzeResponse` |
| `POST` | `/api/matching/generate-message` | Yes | Generate an outreach draft | `GenerateMessageRequest` | `{ message }` |
| `POST` | `/api/matching/extract-jd` | Yes | Extract a JD from a URL or return plain text as-is | `{ input }` | `ExtractJdResponse` |

### Referral requests

| Method | Endpoint | Auth | Description | Request Body | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/requests` | Yes | Send a referral request | `SendReferralRequestDto` | `ReferralRequestDto` |
| `GET` | `/api/requests/outgoing` | Yes | List requests created by the current user | None | `ReferralRequestDto[]` |
| `GET` | `/api/requests/incoming` | Yes | List requests received by the current user | None | `ReferralRequestDto[]` |
| `POST` | `/api/requests/{id}/accept` | Yes | Accept a request and create or reuse a conversation | None | `ConversationDto` |
| `POST` | `/api/requests/{id}/decline` | Yes | Decline a request | None | `{ success: true }` |
| `DELETE` | `/api/requests/{id}/connection` | Yes | Remove an accepted connection | None | `{ success: true }` |

### Conversations and chat

| Method | Endpoint | Auth | Description | Request Body | Response |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/conversations` | Yes | List the current user's conversations | None | `ConversationDto[]` |
| `GET` | `/api/conversations/{id}` | Yes | Fetch a single conversation | None | `ConversationDto` |
| `GET` | `/api/conversations/{id}/messages` | Yes | Fetch message history | None | `MessageDto[]` |
| `POST` | `/api/conversations/{id}/messages` | Yes | Send a message over HTTP | `{ content }` | `MessageDto` |
| `WS` | `/ws` | Yes | Real-time STOMP endpoint | STOMP connect + JWT header | Subscriptions on `/topic/conversations/{id}` |

### Internal AI service endpoints

These are called by the backend and are protected by the shared internal key.

| Method | Endpoint | Auth | Description | Request Body | Response |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/health` | Internal middleware applied, but health remains callable in tests | Service health and dependency status | None | Health JSON |
| `POST` | `/api/extract-resume` | Internal key | Extract text from PDF or DOCX | `{ fileContent, fileName }` | `ExtractResumeResponse` |
| `POST` | `/api/scrape-jd` | Internal key | Scrape job description data from URLs | `{ url }` | `ScrapeJobResponse` |

---

## Testing

[![Coverage](https://img.shields.io/badge/coverage-placeholder-lightgrey)](https://github.com/pardhasaradhi-sde/referai-springboot)

### Run tests

#### Backend

```bash
cd backend
mvn test
```

#### Frontend

```bash
cd frontend
npm run test:smoke
```

#### AI Service

```bash
cd referai-ai-service
pytest
```

### Test types included

- Unit tests for backend service logic
- Frontend smoke checks for route and API wiring
- FastAPI health endpoint tests

### Recommended manual test pass

- Register as a seeker
- Complete profile setup and upload a resume
- Confirm Appwrite upload succeeds and extracted text is editable
- Paste both a job board URL and a generic company career page URL
- Run AI matching and verify ranked referrers appear
- Generate and send a referral request
- Accept the request from the receiver side
- Open the conversation and test both HTTP and WebSocket chat flows

---

## Deployment

ReferAI is structured as a multi-service deployment:

- Frontend: Next.js app
- Backend: Spring Boot API
- AI Service: FastAPI microservice
- Managed services: PostgreSQL, Redis, Appwrite, Gemini API

### Supported deployment approach

- Frontend on Vercel
- Backend on Railway, Render, Fly.io, or an EC2 / VM environment
- AI service on Railway, Render, Fly.io, or a container-friendly Python host
- PostgreSQL on Neon, Supabase, Railway, Render, or self-managed Postgres
- Redis on Upstash, Railway, Redis Cloud, or self-managed Redis

### Deployment steps

1. Provision PostgreSQL and Redis
2. Create the Appwrite bucket `referai-resumes`
3. Deploy the FastAPI AI service and set its internal key
4. Deploy the Spring Boot backend and point it to PostgreSQL, Gemini, Appwrite, and the AI service
5. Deploy the Next.js frontend and set `NEXT_PUBLIC_BACKEND_URL`
6. Verify CORS, WebSocket connectivity, and auth flows

### Backend deployment

```bash
cd backend
mvn clean package -DskipTests
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

### Frontend deployment

```bash
cd frontend
npm run build
npm run start
```

### AI service deployment

```bash
cd referai-ai-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010
```

### Docker / docker-compose

Dockerfiles and `docker-compose.yml` are not currently part of this repository. If containerized local development is important for your workflow, add it as part of the roadmap below.

---

## Roadmap

- [x] JWT authentication and protected frontend routes
- [x] Dual-role profile setup for seekers and referrers
- [x] AI-powered referral matching
- [x] Real-time chat after request acceptance
- [x] Resume file upload with PDF and DOCX extraction
- [x] Job description scraping from job boards and generic career pages
- [x] Appwrite-based resume storage
- [x] Skill-chip input flow in profile setup
- [ ] Redis-backed matching cache in the Java backend
- [ ] Better observability, metrics, and tracing
- [ ] Playwright-first scraping for harder anti-bot sites
- [ ] Dockerized local development
- [ ] Admin moderation and abuse controls
- [ ] Agentic AI coaching and workflow pipeline

---

## Contributing

Contributions are welcome. If you want to improve the product, fix bugs, or build the next layer of the AI pipeline, use the following flow:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests where possible
4. Commit with clear, focused messages
5. Open a pull request with context, screenshots, and test notes

### Suggested workflow

```bash
git checkout -b feature/your-feature-name
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
```

### Code style guidelines

- Keep frontend code typed and component-focused
- Prefer small, testable backend services with explicit DTOs
- Keep AI-service endpoints narrow and predictable
- Preserve existing naming conventions and folder organization
- Add or update docs when behavior changes

**Contribution guide:** [`CONTRIBUTING.md`](./CONTRIBUTING.md) placeholder

---

## License

This repository does not currently include an open-source license file. Until a `LICENSE` file is added, treat the code as all rights reserved by default.

If you plan to make the repository public for reuse, add a `LICENSE` file and update the badge at the top of this README.

---

## Author

**Pardha Saradhi**

- GitHub: [pardhasaradhi-sde](https://github.com/pardhasaradhi-sde)
- LinkedIn: [linkedin.com/in/pardha-saradhi18](https://www.linkedin.com/in/pardha-saradhi18/)
- Portfolio: [pardhu.me](https://pardhu.me)
- Twitter / X: Add your public handle here when ready

---

## Acknowledgements

- [Next.js](https://nextjs.org/) for the frontend framework
- [Spring Boot](https://spring.io/projects/spring-boot) for the backend foundation
- [FastAPI](https://fastapi.tiangolo.com/) for the Python AI service
- [Google Gemini](https://ai.google.dev/) for structured extraction and message generation
- [Appwrite](https://appwrite.io/) for developer-friendly cloud storage
- [PostgreSQL](https://www.postgresql.org/) and [Redis](https://redis.io/) for data and infrastructure
- The open-source tooling ecosystem that makes rapid product prototyping possible

---

## Support

If you found this helpful, please give the repository a star. It helps the project get discovered and makes future improvements easier to share.
