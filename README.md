# ShelfSense

A desktop-focused Library Book Recommendation Assistant built with Next.js/TypeScript and Python/FastAPI. It includes a curated 40-title catalog, real cover artwork, local Sentence Transformer search, recommendation explanations and refinement, private shelves, reading notes, learning paths, and library catalog/inventory tools.

## Run locally on Windows

From the project root, run `./start.ps1`. It starts the backend on **http://127.0.0.1:8000** and the website on **http://127.0.0.1:3000**, with logs in `logs/`. Run `./stop.ps1` to stop the processes started by that script. It does not stop unrelated programs.

First installation on a new computer:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-semantic.txt
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
Set-Location frontend
npm.cmd ci
Set-Location ..
.\start.ps1
```

Leave `EMBEDDING_MODEL` empty for lightweight TF-IDF search, or set it to `sentence-transformers/all-MiniLM-L6-v2` in `backend/.env` for local embedding retrieval. The first download requires internet and can take time; once cached, semantic search needs no API key. This English model does not establish reliable Hindi/Hinglish support.

Manual terminal alternative:

```powershell
# Terminal 1, from project root
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
# Terminal 2
Set-Location frontend
npm.cmd run dev
```

## API keys and configuration

**Provide an OpenAI API key to activate the four specialist roles.** Local accounts, catalog search, shelves, inventory, and the local librarian work without cloud credentials.

| Value | Where | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | `backend/.env` | Server-only key for OpenAI specialist agents |
| `OPENAI_MODEL` | `backend/.env` | Responses-compatible model supporting function calling and structured output; default `gpt-5.6-terra` |
| `SUPABASE_URL` | `backend/.env` | Optional Supabase Auth user verification |
| `SUPABASE_PUBLISHABLE_KEY` | `backend/.env` | Optional Supabase publishable key for user verification |
| `NEXT_PUBLIC_SUPABASE_URL` | `frontend/.env.local` | Same optional Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `frontend/.env.local` | Same publishable key; never a secret/service-role key |
| `DATABASE_URL` | `backend/.env` | Optional PostgreSQL connection URI (including database password); otherwise local SQLite |
| `GATEWAY_SECRET` | Both environment files | Same locally generated random secret, required before production mode |
| `STAFF_USER_IDS` | `backend/.env` | Comma-separated local account UUIDs or verified Supabase user IDs allowed to manage the library |
| `DEMO_MODE` | `backend/.env` | `true` for locally open demonstration staff tools; `false` before public deployment |
| `APP_ORIGIN` | `frontend/.env.local` | Exact public origin when deployed behind a proxy; local default uses request host |

Create a key in [OpenAI API keys](https://platform.openai.com/api-keys), enable API billing, and set `OPENAI_API_KEY` in `backend/.env`. Model access depends on your API account; change `OPENAI_MODEL` if needed. Set secrets directly in the local environment files, which are git-ignored. **Do not paste secret keys into chat.** Restart the backend after changing backend configuration; restart/rebuild Next.js after changing public frontend variables.

Local accounts work immediately at `/signup`, `/login`, and `/forgot-password`. Passwords use salted scrypt hashes. Session tokens are hashed in the database and stored in HTTP-only cookies. Save the one-time recovery code shown after signup. Local accounts do not send emails or verify email ownership; recovery requires your saved code, rotates it, and revokes older sessions. Signing in transfers your guest shelf, preferences, and conversations into the account. For Supabase, include `/reset-password` in allowed redirect URLs.

Optional Supabase accounts: configure the same Supabase project on both sides, enable email/password sign-in, and configure allowed auth URLs. Logging in claims the browser's shelf and preferences into the verified account. The backend revalidates bearer tokens with Supabase's user endpoint; it never accepts a client-supplied user ID.

No Google Books, image-generation, or Hugging Face key is required for the delivered assets/catalog. The original image was made with Codex's built-in image generator and saved under `frontend/public/images/reading-room.webp`.

## What is implemented

- Editorial home and cover-led Discover, keyword/embedding catalog search, genre/mood/level/length/language/branch/availability filters.
- Work/edition/copy separation; verified fresh availability is tied to an eligible edition.
- OpenAI coordinator, discovery, learning-path, and critic roles with catalog function calls, streamed activity, bounded work, and a local fallback.
- Local account creation, sign-in, recovery codes, sign-out, and a personal reading dashboard.
- Staff overview dashboard, persistent navigation, catalog, inventory, imports, insights, and agent workspace.
- Pinned attributes, session revisions, refinements, undo, already-read exclusions, comparisons, evidence panels.
- Persistent private browser shelf or authenticated shelf; statuses, ratings, progress, notes, export, reading-data deletion.
- Three explicitly curated learning paths with prerequisites.
- Inventory status edits, validated CSV preview/commit, catalog editing/addition, aggregate insights, staff restrictions in production mode.
- Reproducible small evaluation with actual measured results and explicit limits.

## Honest scope

This is a functional student-project release, not every future feature in `PRD.md`. It has 40 titles, fictional sample inventory, and project-curated attributes. The catalog can be extended through staff tools. Real college inventory integration, Koha, reservations, social features, constellation maps, broad multilingual validation, a larger independent benchmark, and production backup/retention operations remain extensions.

The agent workflow is a bounded sequential orchestration using one configurable OpenAI model in separate specialist contexts. Discovery chooses authorized catalog tools; learning runs for learning goals. It is not an independently running or self-learning network. OpenAI requests use `store=False`. Requests, explicit preferences, and candidate metadata are sent to OpenAI; journal notes and credentials are excluded. Live provider output needs your key for verification. Explanations come from catalog fields and scoring factors. Negative content preferences rely on curated tags; missing tags do not certify absence. There is no fabricated match probability.

SQLite is the tested local store. PostgreSQL can be selected through SQLAlchemy's connection URI; Supabase account flows and PostgreSQL require your credentials for live verification. The first release computes cached embedding similarity in Python. A future pgvector index can replace that step for larger catalogs; the current implementation does not claim a deployed pgvector service.

## Verification

```powershell
# Backend
.\.venv\Scripts\python.exe -m pytest backend\tests -q
# Measured recommendation experiment
.\.venv\Scripts\python.exe data\evaluation\run.py
# Frontend
Set-Location frontend
npm.cmd run typecheck
npm.cmd run build
```

Tests cover edition constraints, stale inventory, private/idempotent shelves, session ownership and versioning, feedback resets, evidence, and inventory imports. Evaluation labels are project-authored: 12 queries against a 40-title catalog, not an independent user study. Read the on-site report or `data/evaluation/results.json`.

Browser checks use the running desktop UI. See `docs/VERIFICATION.md` for recorded checks and limitations.

## Repository

`frontend/src/features/` holds domain screens; `components/` holds shared controls, cards, shell, and provider; `app/` holds routes and the same-origin API gateway. `backend/app/` holds validation, identity checks, persistence, ranking, and catalog services. `data/` holds asset and evaluation scripts. Database files live under ignored `backend/storage/`.

## Images and sources

Real cover artwork is cached from Open Library's ISBN cover endpoint; source identifiers are in `docs/assets.json`. Photography sources and asset treatment are documented in `docs/ASSETS.md`. The generated reading room is atmospheric illustration, not an actual campus photograph. Fallback cover layouts are explicitly labeled. Fonts are self-hosted Google Fonts families under SIL Open Font License; do not assume cover artwork is public domain.

## Public deployment

Deploy Next.js on a compatible host and FastAPI on a Python/container host with enough memory for the model. Provide persistent storage or PostgreSQL. Set `DEMO_MODE=false`, a strong shared gateway secret, exact `APP_ORIGIN`, and staff IDs. Local accounts are supported; use verified email identity if required for your deployment. Database access belongs behind the backend. PostgreSQL startup enables RLS on the application tables without granting public data-API policies; use a privileged server-only database role for the backend and review policies before deployment. Keep the backend reachable only by the gateway where your hosting permits it. Public deployment has not been performed.
