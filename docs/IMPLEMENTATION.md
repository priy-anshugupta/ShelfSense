# Implementation notes - October 2026 upgrade

## Frontend architecture

Next.js App Router route groups separate public pages, authentication, reader tools, and staff tools. Domain screens live in `src/features`, reusable controls in `src/components`, and routes in `src/app`. The provider owns verified account state, reading shelves, toast feedback, and comparisons. `api.ts` establishes one device cookie before parallel calls. The same-origin gateway validates route prefixes, checks mutation origins, forwards identity, and enforces request-size and time limits.

Local session tokens never reach browser JavaScript: the gateway extracts them from authentication responses and sets HTTP-only SameSite cookies. Supabase public variables remain optional. The interface uses a paper/forest editorial theme, self-hosted Inter/Fraunces fonts, original reading-room illustration, and cached real book covers. `upgrades.css` provides desktop auth, personal dashboard, persistent staff navigation, collection overview, imports, and agent activity layouts. Mobile verification is excluded at the user's request.

## Accounts and persistence

FastAPI and SQLAlchemy store works, editions, copies, shelf entries, feedback, conversations, accounts, session hashes, imports, and audit events. SQLite is the working local database; PostgreSQL is configurable. Passwords use salted scrypt. Seven-day session tokens and one-time recovery codes are SHA256 hashes in storage. Recovery changes the password, rotates the recovery code, and revokes older sessions. Local email ownership is not verified; there is no SMTP reset flow. Supabase supports optional email confirmation/recovery and server verification of bearer tokens.

Guest claims transfer shelf, preference, chat, and feedback ownership after verified sign-in. Production staff IDs are allowlisted server-side for local and Supabase accounts. Demo staff access is explicitly labeled. Local throttling is in-process and device-scoped; production internet deployments should add shared abuse prevention, verified identity as appropriate, backups, and operational monitoring.

## OpenAI specialist workflow

`backend/app/agents.py` implements four separately prompted roles through the OpenAI Responses API. The configurable default model is `gpt-5.6-terra`. All calls use `store=False`; journal notes, account credentials, and private identity details are excluded from model inputs. User requests, explicit reading preferences, and candidate catalog metadata are sent to OpenAI.

1. Coordinator: validated structured intent and constraints. Existing restrictions remain active unless explicitly changed.
2. Discovery: model-selected `search_catalog`, `inspect_books`, and `get_reader_preferences` tool calls. Server-side eligibility stays authoritative. Inspection accepts only IDs previously retrieved in this request. Function outputs are returned with preserved Responses output context.
3. Learning specialist: runs for learning goals; orders candidate IDs using curated prerequisite notes. It does not invent prerequisites.
4. Critic: reviews only retrieved candidate IDs. Backend removes unknown IDs, preserves evidence, and retains learning sequence order.

At most two discovery rounds and four tool executions are permitted. Each provider call has a deadline and retries are disabled. Missing keys, refusals, invalid results, or provider failures use the clearly labeled local catalog workflow. Streamed role/tool events represent actual operations; hidden model reasoning is not displayed. Latest run summaries are persisted with revisioned conversations. The agent workspace counts the latest stored run per conversation, not every historical API call.

## Recommendations

Local normalized Sentence Transformer embeddings (`all-MiniLM-L6-v2`) blend cosine similarity, explicit preferences, pins, feedback, and editorial priors. TF-IDF bigrams supply fallback. Finished books and excluded works are removed. Eligibility checks genre, mood, level, language, page count, branch, and fresh available copies of the eligible edition. Explanations remain deterministic and reference catalog fields. Missing tags do not certify absent content.

Chat writes use database compare-and-set revisions. Undo increases the version. Private shelf and chat ownership never comes from a client-supplied account ID. Reviewed CSV imports, staff catalog edits, and inventory changes are audited.

## Verification boundaries

Local accounts and mocked OpenAI orchestration are tested. Live OpenAI and optional Supabase/PostgreSQL need user credentials for end-to-end verification. The 54-title catalog and fictional inventory remain a student-project demonstration. Real-library adapters, reservations, inferred prerequisite graphs, durable vector indexes, broad multilingual evaluation, and public deployment are extensions.

## Loading and academic expansion

Shared work/edition metadata has a 120-second in-process TTL, configurable through CATALOG_CACHE_SECONDS, and is invalidated after application metadata commits. It is partitioned by database engine. Copies and per-reader preferences/feedback/finished books are fetched live; availability freshness is recalculated each request. External SQL edits and other server processes can take up to the TTL to reach this process. Reader context uses one scoped UNION query. Warm catalog requests use two SELECTs; simultaneous identical browser reads are deduplicated without storing completed private responses. Account/copy updates are never shared through a public response cache.

Startup adds missing seed titles in batches while preserving staff edits and reader data. The 14 academic additions have source-linked metadata, subject filters, 12 cached cover images, and two labeled typographic fallbacks. Academic prerequisites remain project-curated. Engineering foundations is the fourth curated learning path.
