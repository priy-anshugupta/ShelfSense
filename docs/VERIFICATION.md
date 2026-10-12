# Upgrade verification - 10 October 2026

- 24 backend tests pass, including seven new account/agent tests: salted password hashing, hashed sessions, local account identity, guest shelf claiming, recovery-code rotation, session revocation, duplicate signup, local staff authorization, real mocked Responses tool execution, unretrieved-ID fallback, learning order preservation, and honest missing-key activity.
- Final Next.js production build passes (homepage, dashboard, authentication/recovery, staff agent routes included). TypeScript checks pass as part of the build.
- Gateway smoke passes: raw session token excluded from browser JSON, HTTP-only SameSite cookie, local identity, stored preferences, sign-out, and cross-origin mutation rejection.
- Desktop browser checks at 1440 x 1000: editorial homepage and signup layout; test account creation and recovery-code acknowledgement; onboarding preferences save; librarian stream returns three real mysteries under 400 pages; activity identifies the local fallback; save to account shelf; mark Reading; personal dashboard count and book update; sign out and sign in restore account data; staff overview, agent workspace, catalog metadata dialog, and imports page render with persistent navigation.
- The browser used a synthetic local test account. Its rows are removed after verification. Screenshots under `docs/screenshots/*-upgrade.png` show the upgraded interface with synthetic preview data.
- Launcher tracking preserves running managed processes across repeated starts and verifies their creation times before stopping them.

Live OpenAI is not verified: no API key is configured. Provider tests simulate Responses results; they do not establish the quality of live recommendations. Optional Supabase and PostgreSQL also remain credential-dependent. Inventory is fictional and stale copy records remain unverified until staff updates them. Mobile testing is excluded by request.

The previous release verification below is retained as historical baseline.

---

# Verification record — 8 October 2026

## Passed

- Next.js production build, including all 21 generated/static/dynamic route entries.
- TypeScript `tsc --noEmit`.
- 17 backend tests: gateway boundary, edition language/page/copy eligibility, stale availability, idempotent and private shelves, session ownership, monotonic revisions/undo, finished-book exclusion, rating validation, reviewed repeat-safe imports, signed-in claim requirement, exact-title/evidence behavior, feedback reset, pin conflicts, shortening, catalog validation, production staff denial, and invalid search filters.
- Local Sentence Transformer downloaded and loaded: `sentence-transformers/all-MiniLM-L6-v2`, 384 dimensions.
- Measured 12-query catalog experiment: hybrid Precision@5 0.433, NDCG@5 0.939, coverage 0.800; TF-IDF baseline 0.417 and 0.936. The small project-authored gold set is not an independent user study.
- HTTP gateway smoke: configuration, session creation, semantic recommendation, and persisted session retrieval.
- Desktop browser: homepage rendered; request for a mystery under 350 pages returned real matching works; shortening to 280 pages correctly produced no eligible match; Undo restored the prior shortlist; save persisted to shelf; evidence dialog showed the stored description and attributes; journal rating and notes persisted after reload.
- Desktop browser: staff metadata modal opens with validated edition fields; comparison selection opens a two-book comparison; book detail shows edition language, pages, branches, shelf locations, and observed inventory timestamps.

## Limits

- Live model-provider calls, Supabase accounts, and PostgreSQL require credentials and have not been exercised against a user-owned service.
- Demo inventory is fictional. The 40-title metadata/attribute set is curated and should be verified before real-library use.
- English embedding model; multilingual reliability not established.
- Mobile verification excluded at user request; desktop is the target.
- No independent reader study, formal WCAG certification, public deployment, real-library adapter, or pgvector deployment is claimed.
- Pytest emits a dependency deprecation notice for Starlette's httpx TestClient integration; all tests pass.

Commands and source configuration are in README.md. Evaluation output is checked into `data/evaluation/results.json`; it is measured rather than invented.
