<div align="center">

# ShelfSense

### A world of books. A little guidance.

A desktop-focused **Library Book Recommendation Assistant** that turns a mood, an interest, or a learning goal into a catalog-backed shortlist—with clear reasons and real edition constraints.

![Next.js](https://img.shields.io/badge/Next.js-16-171717?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![Storage](https://img.shields.io/badge/Storage-SQLite%20%2F%20PostgreSQL-4169E1)
![Agents](https://img.shields.io/badge/Agents-OpenAI%20Responses-315843)

[Features](#features) · [Quick start](#quick-start) · [AI workflow](#ai-workflow) · [Neon setup](#neon-postgresql) · [Verification](#verification) · [Documentation](#documentation)

</div>

![ShelfSense homepage](docs/screenshots/home-upgrade.png)

## The idea

Readers do not always arrive with a title in mind. They might ask for “a hopeful read under 250 pages” or “a beginner path into artificial intelligence.” ShelfSense translates those requests into discovery within a known library catalog, checks the relevant editions and copies, and provides explanations the reader can inspect.

The project combines an editorial reading experience with practical library operations: personal shelves, private journals, learning paths, catalog management, and reviewed inventory imports.

**Run it without cloud credentials.** SQLite, local accounts, catalog search, and deterministic recommendations work out of the box. An OpenAI key activates the specialist workflow; PostgreSQL and Supabase Auth are optional integrations.

> **Release scope:** a functional AI subject project with 40 real titles, project-curated metadata, and fictional sample inventory. Desktop is the target. Live OpenAI, hosted PostgreSQL, and Supabase flows require credentials for end-to-end verification.

## Features

| For readers                                                              | For librarians                                                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Search by title, author, ISBN, interests, or a natural-language request  | Collection overview with category counts and inventory health |
| Filter by genre, mood, level, length, language, branch, and availability | Add works and edit catalog metadata                           |
| Ask the librarian, pin preferences, refine a shortlist, and undo changes | Update copy statuses and review observed timestamps           |
| Inspect catalog evidence and compare up to three books                   | Preview and validate CSV imports before committing            |
| Save books as Up next, Reading, Finished, or Set aside                   | Repeat-safe import commits and audited changes                |
| Keep private ratings, notes, and reading progress                        | Aggregate reader insights                                     |
| Follow three curated learning paths and AI-assisted sequences            | Agent workspace with configured roles and latest-run counts   |
| Create an account, recover access, export data, and manage preferences   | Staff authorization enforced by the backend outside demo mode |

### A reading room of your own

The personal dashboard shows current reads, shelf counts, progress, and suggestions. Guest discovery is supported; signing in transfers the browser's shelf, preferences, feedback, and conversations into the account.

![Personal reading dashboard](docs/screenshots/reader-dashboard-upgrade.png)

### A workspace for the collection

Persistent staff navigation connects the overview, catalog, inventory, imports, insights, and agent workspace. Availability distinguishes fresh eligible records from stale or unknown inventory.

![Library workspace](docs/screenshots/library-dashboard-upgrade.png)

<details>
<summary>More interface previews</summary>

**Account creation**

![Signup screen](docs/screenshots/signup-upgrade.png)

**Agent workspace**

![Agent workspace](docs/screenshots/agent-workspace-upgrade.png)

Screenshots show the local demonstration interface. The personal dashboard uses synthetic preview data; the test account was removed after verification.

</details>

## AI workflow

ShelfSense uses four separately prompted specialist roles through the **OpenAI Responses API**, with one configurable model. The workflow is bounded and sequential; the learning specialist runs for learning goals.

| Role                     | Responsibility                                         | Boundary                                                 |
| ------------------------ | ------------------------------------------------------ | -------------------------------------------------------- |
| Librarian coordinator    | Interpret intent, constraints, and the next step       | Validated structured output                              |
| Discovery specialist     | Choose catalog searches and inspect candidates         | Only authorized read-only tools                          |
| Learning-path specialist | Order relevant books using reviewed prerequisite notes | Only retrieved IDs and curated evidence                  |
| Recommendation critic    | Review candidate suitability                           | Cannot introduce new IDs or rewrite factual explanations |

```mermaid
flowchart LR
    Request[Reader request] --> Coordinator[Coordinator]
    Coordinator --> Discovery[Discovery specialist]
    Discovery --> Tools[Catalog tools]
    Tools --> Candidates[Eligible candidates]
    Candidates --> Learning[Learning specialist when needed]
    Candidates --> Critic[Critic]
    Learning --> Critic
    Critic --> Checks[Server validation]
    Checks --> Shortlist[Evidence-backed shortlist]
```

The discovery toolbox contains `search_catalog`, `inspect_books`, and `get_reader_preferences`. The server enforces the current reader's scope and active filters. Book inspection accepts only IDs retrieved during that request. Discovery has a maximum of two tool rounds and four executions; provider calls have deadlines and retries are disabled.

Role and tool activity is streamed to the interface. It describes actual operations rather than exposing hidden model reasoning. Missing keys, invalid responses, or provider failures lead to a clearly labeled local fallback.

**Data sent to OpenAI:** the reading request, conversation query context, explicit preferences, and candidate catalog metadata. Journal notes and account credentials are excluded from application-generated inputs. Calls use `store=False`; this is a request setting, not a claim of zero provider retention.

### How recommendations are grounded

1. Retrieve candidates with local Sentence Transformer embeddings, or TF-IDF when embeddings are disabled or unavailable.
2. Enforce exclusions, finished-book status, and explicit catalog restrictions.
3. Match page count and language against eligible editions; check fresh copy records for branch and availability.
4. Blend content relevance with preferences, pinned attributes, feedback, and editorial priors.
5. Return real catalog IDs with deterministic reasons and inspectable evidence.

A missing content tag does not certify that a book lacks that content. The app does not present fabricated match probabilities, and model output cannot create inventory records.

## Architecture

```mermaid
flowchart TD
    Browser[Desktop browser] --> Frontend[Next.js App Router]
    Frontend --> Gateway[Same-origin API gateway]
    Gateway --> Backend[FastAPI services]
    Backend --> Database[(SQLite or PostgreSQL)]
    Backend --> Retrieval[Local embeddings / TF-IDF]
    Backend --> OpenAI[Optional OpenAI Responses]
    Backend --> Identity[Local accounts / optional Supabase Auth]
```

| Layer       | Implementation                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| Interface   | Next.js 16, React 19, TypeScript, Tailwind 4, custom editorial CSS                                     |
| Shared UI   | Radix Dialog, Lucide icons, reusable book cards, reader and staff shells                               |
| API         | FastAPI, Pydantic validation, same-origin Next.js gateway                                              |
| Persistence | SQLAlchemy with SQLite locally; PostgreSQL through psycopg                                             |
| Retrieval   | scikit-learn TF-IDF; optional `all-MiniLM-L6-v2` Sentence Transformer                                  |
| Agents      | Official OpenAI Python SDK, Responses function calling and structured outputs                          |
| Identity    | Local scrypt accounts and HTTP-only sessions; optional Supabase Auth                                   |
| Assets      | Cached Open Library covers, sourced photography, original reading-room illustration, self-hosted fonts |

All application data goes through FastAPI. Browser code does not connect directly to the database. Conversation updates use compare-and-set revisions, and Undo increases the version to avoid stale writes.

## Quick start

### Prerequisites

- Git
- Node.js **20.9 or newer**, with npm
- Python **3.13** for the tested environment
- Windows PowerShell for the included launch scripts

The locked frontend and installed Python environment were verified on Windows. Other platforms can use the manual commands with their virtual-environment paths.

### 1. Clone and install

```powershell
git clone https://github.com/priy-anshugupta/ShelfSense.git
Set-Location ShelfSense

python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local

Set-Location frontend
npm.cmd ci
Set-Location ..
```

Copy environment templates only during first setup; retain existing values when updating an installation. The example configuration starts with SQLite and local accounts, without API keys.

### 2. Start the application

```powershell
.\start.ps1
```

| Service           | URL                         |
| ----------------- | --------------------------- |
| Website           | http://127.0.0.1:3000       |
| Backend readiness | http://127.0.0.1:8000/ready |
| API documentation | http://127.0.0.1:8000/docs  |

Logs are written to `logs/`. The launcher starts development mode until a production build exists; afterwards it starts the built frontend. It preserves tracked processes across repeated starts.

```powershell
# Stop the script-managed servers
.\stop.ps1
```

### Development and production builds

For active frontend development, use two terminals instead of the launcher:

```powershell
# Terminal 1 - project root
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

```powershell
# Terminal 2 - frontend directory
Set-Location frontend
npm.cmd run dev
```

To update the local production preview, stop the servers, run `npm.cmd run build` in `frontend`, return to the root, and run `.\start.ps1`.

### Optional semantic search

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-semantic.txt
```

Then set this in `backend/.env` and restart the backend:

```dotenv
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

The first model download requires internet and adds startup time. Cached embeddings run locally without an API key. Leave the variable blank for lightweight TF-IDF retrieval. Hindi edition filtering is supported; this English embedding model does not establish reliable Hindi or Hinglish semantic retrieval.

## Configuration

Secrets belong in the ignored environment files or your hosting platform's secret store. Never commit real `.env` files or expose a database URL or OpenAI key in `NEXT_PUBLIC_*` variables.

| Variable                                                            | Location               | Purpose                                                                        |
| ------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`                                                      | `backend/.env`         | SQLite path or PostgreSQL connection URL                                       |
| `OPENAI_API_KEY`                                                    | `backend/.env`         | Optional server-only key to activate specialist agents                         |
| `OPENAI_MODEL`                                                      | `backend/.env`         | Configurable Responses model; code default is `gpt-5.6-terra`                  |
| `EMBEDDING_MODEL`                                                   | `backend/.env`         | Optional local Sentence Transformer model                                      |
| `INVENTORY_FRESHNESS_HOURS`                                         | `backend/.env`         | Copy observation window; default 24 hours                                      |
| `DEMO_MODE`                                                         | `backend/.env`         | `true` opens demonstration staff tools; use `false` for public deployments     |
| `STAFF_USER_IDS`                                                    | `backend/.env`         | Comma-separated local account UUIDs or verified Supabase user IDs              |
| `GATEWAY_SECRET`                                                    | Both environment files | Shared backend/gateway secret; replace the demo value before public deployment |
| `BACKEND_URL`                                                       | `frontend/.env.local`  | Backend origin; local default `http://127.0.0.1:8000`                          |
| `APP_ORIGIN`                                                        | `frontend/.env.local`  | Exact website origin when deployed behind a proxy                              |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`                         | `backend/.env`         | Optional Supabase identity verification                                        |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `frontend/.env.local`  | Matching optional Supabase project and public key                              |

### Activate OpenAI agents

Create an API key in the [OpenAI dashboard](https://platform.openai.com/api-keys), then configure:

```dotenv
OPENAI_API_KEY=your_private_key
OPENAI_MODEL=gpt-5.6-terra
```

The model must be accessible to your API account and support Responses function calling and structured output. Change `OPENAI_MODEL` if needed. Restart the backend after editing its environment. Key presence means configured; successful live calls are a separate verification step.

No Google Books, image-generation, or Hugging Face key is needed for the bundled catalog and assets.

## Neon PostgreSQL

The backend accepts a standard PostgreSQL URL and switches to the psycopg SQLAlchemy dialect automatically. Neon supplies the database; FastAPI still runs separately.

1. Create a dedicated project in [Neon Console](https://console.neon.tech/).
2. Open **Connect** and select the intended branch, database, and database-owner role for initial schema creation.
3. Copy the pooled PostgreSQL connection URL, including its SSL and other connection parameters.
4. Replace `DATABASE_URL` in `backend/.env`:

   ```dotenv
   DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.neon.tech/neondb?sslmode=require"
   ```

5. Restart the backend. On an empty database, startup creates the application tables and seeds the demonstration catalog.
6. Confirm `/ready`, then verify account creation, a saved shelf, and a persisted conversation.

[Neon connection guide](https://neon.com/docs/get-started/connect-neon)

Switching the URL **does not migrate existing SQLite accounts or reading data**. Preserve the SQLite database and plan a separate migration if those records matter. PostgreSQL initialization enables RLS on application tables without public data-API policies; startup needs a role with table creation and alteration privileges. Review database role permissions before deployment.

## Accounts and access

Local accounts work immediately at `/signup`, `/login`, and `/forgot-password`:

- Passwords use salted scrypt hashes.
- Random seven-day session tokens are stored as hashes in the database and as HTTP-only SameSite cookies in the browser.
- Signup shows a one-time recovery code. Save it privately; local accounts do not send reset emails or verify email ownership.
- Recovery rotates the code and revokes previous sessions.
- Shelves, notes, preferences, feedback, and conversations are scoped to server-verified identity.
- Data export and reading-data deletion are available in Settings. Reading-data deletion keeps the account.

For optional Supabase Auth, configure matching project values on both sides, enable email/password sign-in, and allow the app's authentication redirects, including `/reset-password`. The backend verifies bearer tokens through Supabase's user endpoint.

In demo mode, staff tools are intentionally open for the presentation. With `DEMO_MODE=false`, the backend requires an authenticated account listed in `STAFF_USER_IDS`. A hidden navigation link is not an authorization boundary.

## Verification

Run these from the project root:

```powershell
# Backend - isolated test database and mocked provider responses
.\.venv\Scripts\python.exe -m pytest -q

# Small catalog-ranking experiment; updates data/evaluation/results.json
.\.venv\Scripts\python.exe data\evaluation\run.py

# Frontend
Set-Location frontend
npm.cmd run typecheck
npm.cmd run build
```

**Verified release:** 24 backend tests, TypeScript checking, production build, HTTP gateway checks, and desktop browser flows. Coverage includes account recovery/session revocation, ownership, guest claiming, staff permissions, edition constraints, stale availability, import validation, revisions/undo, catalog evidence, and mocked agent tool boundaries.

Desktop checks cover signup, onboarding, sign-in/out, shelf persistence, reading dashboard updates, streamed local recommendations, and staff screens. Live OpenAI, optional Supabase, and hosted PostgreSQL remain credential-dependent. Read the [verification record](docs/VERIFICATION.md) for the exact scope.

The repository also includes Playwright scenarios. To run them against already-started servers:

```powershell
# From frontend
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

These scenarios assume demonstration inventory is fresh. Refresh the relevant sample copy statuses in the staff workspace if they have passed the observation window. The latest recorded browser verification used the desktop UI; this README does not claim a fresh automated E2E run.

### Measured recommendation experiment

The checked-in experiment uses **12 project-authored queries against 40 titles**:

| Metric      | Sentence Transformer hybrid | TF-IDF baseline |
| ----------- | --------------------------: | --------------: |
| Precision@5 |                       0.433 |           0.417 |
| NDCG@5      |                       0.939 |           0.936 |

These are illustrative catalog-ranking measurements, not an independent benchmark or a live-agent evaluation. The small label set cannot establish general superiority. [Results and per-query records](data/evaluation/results.json)

## Project structure

```text
ShelfSense/
├── backend/
│   ├── app/
│   │   ├── agents.py          # Specialist orchestration and catalog tools
│   │   ├── auth.py            # Local accounts, sessions, and recovery
│   │   ├── catalog.py         # Curated seed catalog
│   │   ├── database.py        # SQLAlchemy schema and initialization
│   │   ├── main.py            # API, identity, inventory, and streaming
│   │   ├── recommendations.py # Retrieval, ranking, and evidence
│   │   └── schemas.py         # Typed recommendation constraints
│   ├── tests/                # Isolated backend and provider-mock tests
│   └── .env.example
├── frontend/
│   ├── src/app/              # Routes, layouts, CSS, and API gateway
│   ├── src/components/       # Shared UI, shells, and state provider
│   ├── src/features/         # Reader, authentication, and staff screens
│   ├── src/lib/              # API client, types, and loading helpers
│   ├── public/               # Covers, images, fonts, and favicon
│   ├── tests/                # Browser scenarios
│   └── .env.example
├── data/                     # Evaluation and asset preparation scripts
├── docs/                     # Architecture, verification, and previews
├── PRD.md
├── start.ps1
└── stop.ps1
```

## Troubleshooting

| Symptom                              | Check                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| “Library service is unavailable”     | Start FastAPI, check `/ready`, and inspect `logs/backend-error.log`                              |
| Startup takes longer with embeddings | Allow the first download/model load; leave `EMBEDDING_MODEL` blank for TF-IDF                    |
| Agent activity says “Local workflow” | Add `OPENAI_API_KEY` and restart the backend                                                     |
| OpenAI falls back despite a key      | Verify API access, model availability, and connectivity; inspect the backend log                 |
| No books show as available           | Inventory older than the freshness window stays unverified; confirm copy statuses in staff tools |
| UI changes do not appear             | A built frontend needs another build and restart; use `npm.cmd run dev` while editing            |
| PostgreSQL startup fails             | Check the complete URL, SSL parameters, and schema permissions                                   |
| Staff access is denied               | With demo mode disabled, sign in with a UUID listed in `STAFF_USER_IDS`                          |
| Local password recovery fails        | Use the saved recovery code; the local flow has no email reset service                           |

## Deployment and current limits

Deploy Next.js and FastAPI on suitable hosts, with persistent storage or PostgreSQL. Before exposing the app publicly, disable demo mode, configure a strong shared gateway secret and exact app origin, assign staff IDs, and review database permissions, backups, abuse prevention, and identity requirements. Keep backend and database credentials server-only. Public deployment is not part of the verified release.

Current boundaries:

- Sample copies are fictional; there is no live college inventory or Koha adapter.
- Learning prerequisites and catalog attributes are curated, not independently inferred or verified at scale.
- Local account email ownership is unverified; throttling is in-process and device-scoped.
- Embedding similarity is computed locally; no deployed pgvector index is claimed.
- Reservations, social features, large-scale recommendation studies, and broader multilingual validation remain extensions.
- Mobile completion and verification are outside the requested scope.

## Documentation

- [Product requirements](PRD.md) — broader product plan and roadmap
- [Implementation](docs/IMPLEMENTATION.md) — current architecture and technical boundaries
- [Upgrade plan](docs/UPGRADE-PLAN.md) — account, agent, and dashboard upgrade scope
- [Verification](docs/VERIFICATION.md) — recorded checks and limitations
- [Asset notes](docs/ASSETS.md) and [manifest](docs/assets.json) — sources and treatments

## Asset credits

Cover artwork is cached from [Open Library](https://openlibrary.org/dev/docs/api/covers). Library photography is sourced from Unsplash; individual sources are recorded in the asset documentation. The reading-room artwork is an original AI-generated editorial illustration, not a photograph of a real campus. Inter and Fraunces are self-hosted fonts; licensing details are in the asset notes. Third-party cover artwork is not assumed to be public domain.

This repository does not currently include a project-wide software license. Third-party assets retain their respective rights and licensing terms.
