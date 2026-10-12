> October 10 implementation update: OpenAI replaces the previous model provider. Four specialist roles, local accounts, a personal reading dashboard, and a staff workspace are implemented. Current architecture and verification are documented in `docs/IMPLEMENTATION.md` and `docs/VERIFICATION.md`. Broader roadmap requirements below are not a claim that every feature is delivered.

# ShelfSense — Product Requirements Document

**Academic project:** Library Book Recommendation Assistant  
**Working product name:** ShelfSense  
**Version:** 1.0  
**Date:** 8 October 2026  
**Status:** Build-ready proposed specification; implementation and experimental results pending  
**Primary platform:** Responsive web application  
**Audience:** Student developers, designers, faculty reviewers, and library collaborators

---

## 1. Product definition

ShelfSense is a personal library discovery assistant that converts a reader's interests, mood, learning goal, and practical constraints into explainable recommendations from a real catalog. Readers can challenge a recommendation, preserve the attributes they like, change those they dislike, and receive an updated shortlist. Each result connects to edition-specific metadata and library-copy availability.

**Product promise:** Find the right book for your taste, your goal, and your library—and understand why it fits.

**Primary differentiating experience:** Recommendation Remix + evidence-backed explanations + local availability. Each individual capability has precedents; the project contribution is their implementation, integration, and evaluation in a college-library context. Do not claim global novelty without further evidence.

**Design ambition:** A professional reading product with the visual care of a contemporary literary publication. The interface should feel designed around books and readers, with AI acting as a useful service inside it.

### 1.1 Planning assumptions

- One college/library organization in the first release; support multiple branches in its data model.
- Initial curated catalog: approximately 500–2,000 works. Quality and evidence coverage take priority over size.
- Fiction and academic/nonfiction discovery both supported, with different contextual controls.
- English interface; accept English, Hindi, and Hinglish requests only to the extent validated by the selected models and test set. Do not imply that every catalog book has a Hindi edition.
- Small student team; proposed six-week implementation schedule, adjustable to actual capacity.
- Start with CSV/admin-managed inventory. Real library integration is an extension dependent on access.
- An LLM API is available with a configurable usage budget. Core search and recommendations must survive its failure.
- No existing codebase was present in the workspace during preparation. The architecture below is proposed, not an assessment of implemented code.

### 1.2 Decisions already made

| Decision | Specification |
|---|---|
| Frontend | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS; customized shadcn/ui primitives |
| Backend | Python + FastAPI + Pydantic |
| Database | Supabase PostgreSQL with pgvector |
| Identity | Local scrypt accounts and HTTP-only sessions; optional Supabase Auth |
| Embeddings | Sentence Transformers; select model through English/Hinglish evaluation |
| Recommendation experiments | Python, NumPy/pandas, scikit-learn as needed |
| Conversational model | OpenAI Responses API through the official SDK; server-only API key |
| Agent strategy | Bounded coordinator, discovery, learning-path, and critic workflow with catalog tools |
| Book enrichment | Open Library and Google Books, cached and provenance-tracked |
| Delivery | One repository; frontend, backend, data scripts, documentation |

Pin mutually compatible stable package versions at implementation start. This PRD does not prescribe unverified version numbers or free hosting allowances.

## 2. Problem and research basis

Readers often know the experience they want but cannot express it as a title, author, or genre. Academic readers also need suitable prerequisites and difficulty. Ordinary recommendations may ignore available copies, repeat popular titles, or offer explanations without evidence. New users have no rating history, and existing users' preferences change by situation.

Existing products establish useful patterns:

| Source | Verified capability or documented direction | ShelfSense interpretation |
|---|---|---|
| [StoryGraph](https://thestorygraph.com/) | Mood/pace discovery, personalized recommendations, reading tracking | Borrow preference onboarding and contextual discovery |
| [Whichbook](https://www.whichbook.net/about/) | Emotion sliders, plot/character discovery, geographical discovery | Allow readers to start from an experience rather than a title |
| [Meet New Books](https://www.meetnewbooks.com/how-to) | Similar books, tropes/topics, saved/rated-book personalization | Build seed-book discovery and lightweight feedback |
| [NoveList Plus](https://about.ebsco.com/novelist/products/novelist-plus) | Library-focused read-alikes, story attributes, recommendation reasons | Explain meaningful connections and tie them to library use |
| [LibraryThing](https://www.librarything.com/) | Personal cataloging and recommendations | Provide a useful personal shelf |

Research supports testing beyond relevance. [Popularity-bias research in books](https://arxiv.org/abs/2202.13446) reports disadvantages for niche and diverse readers. [Which books do I like?](https://arxiv.org/abs/2503.03300) explores personalized taste analysis and identifies limitations including sparse documentation and misleading taste interpretations. These findings motivate controlled exploration, editable preferences, and evidence tracking; they do not prove ShelfSense's future performance.

### 2.1 Product goals

1. Help readers select a credible next book in one short discovery session.
2. Interpret natural-language interests and practical constraints.
3. Explain recommendations using actual catalog evidence and ranking signals.
4. Make refinement faster than restarting a search.
5. Connect discovery to trustworthy library availability and shelf locations.
6. Demonstrate meaningful AI techniques and reproducible evaluation.
7. Deliver a visually distinctive, accessible, responsive interface.

### 2.2 Non-goals for the first release

- Full library circulation, payment, fines, or acquisition management.
- A complete ebook reader or unrestricted full-book content ingestion.
- A social network, public messaging, or book-club platform.
- Diagnosis of emotions or mental-health recommendations.
- Automatic purchases, reservations, or changes to a real library system.
- Training a foundation language model.
- A large multi-agent framework before a measurable need exists.
- Guaranteed enjoyment predictions or unsupported numerical match probabilities.

## 3. Users and permissions

| Persona | Need | Successful outcome |
|---|---|---|
| New reader | Does not know authors or genres | Gets relevant options from interests and a short request |
| Regular reader | Wants freshness without losing preferred themes | Finds an appealing title beyond repetitive favorites |
| Academic learner | Needs the right level and prerequisites | Receives an appropriate book or short learning sequence |
| Library student | Needs something physically obtainable | Finds an available edition and its shelf location |
| Librarian | Needs clean catalog and inventory records | Imports data, corrects attributes, maintains copies |
| Faculty evaluator | Needs evidence of implemented AI | Inspects architecture, baselines, results, limitations |

### 3.1 Access matrix

| Action | Guest | Reader | Librarian | Administrator |
|---|---|---|---|---|
| Browse/search/book details | Yes | Yes | Yes | Yes |
| Bounded anonymous librarian session | Yes | Yes | Yes | Yes |
| Persist personal shelf/preferences/chat | No | Own data | Own data | Own data |
| Edit inventory/catalog | No | No | Assigned organization | Assigned organization |
| View aggregate library demand | No | No | Assigned organization | Assigned organization |
| Assign staff roles | No | No | No | Yes |
| Access another reader's private chat | No | No | No | No through ordinary product flows |
| Inspect evaluation report | Sanitized report | Sanitized report | Sanitized report | Sanitized report |

Public registration always creates a reader. Staff privileges must be assigned through a controlled administrative process. Hiding a navigation item is not authorization.

## 4. Scope and release priorities

**P0: required for a credible complete release.**

- Catalog and edition/copy model; curated seed data and CSV import.
- Guest discovery, authentication, editable onboarding/preferences.
- Keyword + semantic search; hard-constraint handling; personalized hybrid ranking.
- AI librarian with structured preference extraction and actual tool execution.
- Recommendation Remix with preserved attributes and session-local changes.
- Evidence-backed reasons, tradeoffs, comparison, and metadata provenance.
- Availability-aware results and branch/shelf information.
- Personal shelf, ratings, stopped-reading status, contextual feedback.
- Admin catalog/inventory screens and auditable imports.
- Complete responsive visual system and selected imagery.
- Deterministic fallback, usage limits, accessibility, and evaluation report.

**P1: complete after P0 works end to end.**

- Curated goal-to-books reading paths.
- Familiar / Explore / Surprise discovery controls.
- Reading statistics and CSV shelf import.
- Additional validation of multilingual requests.

**P2: optional visual or integration extensions.**

- Book Constellation semantic map, with accessible list equivalent.
- Authorized read-only Koha integration.
- Voice input, barcode/photo recognition, public collection sharing.

If a feature slips, remove its navigation and promotional claims until complete. No dead buttons or permanent placeholder pages in the release.

## 5. Information architecture and routes

| Route | Purpose | Access |
|---|---|---|
| `/` | Editorial introduction and immediate discovery entry | Public |
| `/discover` | Curated/personalized shelves and contextual discovery | Public; personalization if signed in |
| `/search` | Search results and URL-backed filters | Public |
| `/librarian` | New conversational discovery session | Public with guest quota |
| `/librarian/[sessionId]` | Resume authorized session | Owner; guest session token where applicable |
| `/books/[workId]` | Work overview, evidence, editions, inventory | Public |
| `/compare` | Compare up to three valid works | Public |
| `/shelf` | Reading queue and statuses | Reader |
| `/preferences` | Editable taste and explicit exclusions | Reader |
| `/onboarding` | Short preference setup | Reader; dismissible |
| `/paths` and `/paths/[pathId]` | Learning paths | P1; owner for saved paths |
| `/settings` | Account, export, retention, delete controls | Reader |
| `/login` and `/signup` | Identity flows | Public |
| `/admin` | Operational overview | Staff |
| `/admin/catalog` and `/admin/catalog/[workId]` | Metadata management | Staff |
| `/admin/inventory` | Edition/copy status and location | Staff |
| `/admin/imports` | Upload, preview, validate, commit, history | Staff |
| `/admin/insights` | Aggregated demand and metadata gaps | Staff |
| `/evaluation` | Sanitized reproducible academic results | Public/read-only |
| `/about` | Method, data sources, scope, project team | Public |

Search URL keys: `q`, `mode`, `genre`, `language`, `maxPages`, `level`, `branch`, `availableOnly`, `sort`, `cursor`. Validate and normalize on the server. Do not put private mood narratives, tokens, or chat text in URLs.

Desktop primary navigation: Discover, Ask the Librarian, My Shelf; learning paths appear when implemented. Search and branch selection remain visible. Admin uses a distinct operational shell. Mobile uses a compact header and labeled bottom navigation for primary reader destinations.

## 6. Primary journeys

### 6.1 First-time discovery

1. Guest lands on `/` and sees one clear discovery invitation.
2. Enters a request or chooses a contextual prompt.
3. Receives a shortlist without compulsory signup.
4. Opens a book or refines recommendations.
5. Signup is requested when saving persistent information; the current shortlist and permitted guest-session state survive login.

### 6.2 Reader onboarding

1. Choose fiction, learning, or both.
2. Select up to five favorite books, or skip if new to reading.
3. Select interests, language preferences, and optional dislikes.
4. Choose a library branch when known.
5. Save an editable profile and open Discover.

Target: approximately one minute; every optional step is skippable. No personality diagnosis or mandatory reading-history import.

### 6.3 Conversational request and Remix

Example: “I liked The Martian. Something with clever problem-solving, less technical detail, under 350 pages, available here.”

1. Extract seed, positive attributes, exclusions, page constraint, and branch constraint.
2. Display editable preference chips; distinguish inferred soft preferences from explicit hard rules.
3. Ask at most one question per turn if a missing answer materially affects results.
4. Search, filter, rank, and check copies.
5. Return three to five recommendations with short reasons and tradeoffs.
6. Reader pins problem-solving and selects “less technical.”
7. Update session preferences; retain explicit hard constraints and pins.
8. Exclude already-read results when requested and return a versioned refreshed shortlist.

If a new instruction conflicts with a pin, ask which to retain or present a clear resolution control. Never silently discard the pin. Session changes become permanent taste preferences only through an explicit “Save to my preferences” action.

### 6.4 Choose and locate

1. Open a work detail page.
2. Select a language/edition.
3. View branch, available-copy count, shelf label, and status timestamp.
4. Save to shelf or copy location information.

P0 action is “Find in library,” not a reservation. If no source establishes availability, show “Availability unknown.” If all matching copies are checked out, offer verified available alternatives.

### 6.5 Librarian catalog import

1. Upload CSV within configured size limit.
2. Map required columns and inspect preview.
3. Run validation; display row errors, duplicates, and proposed changes.
4. Staff selects valid rows and commits the reviewed import.
5. Record source file hash, counts, actor, timestamp, and record changes.
6. Enrichment/indexing runs in a tracked background job; existing catalog stays usable.

## 7. Detailed functional requirements and acceptance criteria

### FR-01 Catalog, search, and filters — P0

- Search titles, authors, identifiers, subjects, and natural-language descriptions.
- Exact ISBN/title matches must not be displaced solely by semantic similarity.
- Support keyword retrieval plus embedding retrieval; deduplicate at work level before presentation.
- Fiction controls: genre, theme, mood, pace, length, language. Academic controls: subject, goal, difficulty, prerequisites, language.
- Inventory controls: branch and available-only. Apply inventory filtering before final top-k selection so available titles can fill the list.
- Search state persists in the URL and survives refresh/back navigation.
- Paginate results; do not ship the whole catalog or all embeddings to the browser.

**Acceptance:** Typo-tolerant or semantic discovery finds relevant catalog records; exact identifier tests return correct editions; a selected hard rule is reflected in every verified result; empty results explain the conflicting constraints and offer specific relaxation choices.

### FR-02 AI librarian — P0

- Respond with a structured schema rather than extracting data from arbitrary prose.
- Tools have typed arguments, authorization boundaries, timeouts, and bounded output.
- The LLM may recommend only verified candidate IDs returned by retrieval.
- Preserve selected branch, seed books, active constraints, and pins within a session.
- Support stop/cancel, retry, and new session.
- Display actual operational states: “Understanding your request,” “Finding books,” “Checking copies,” “Preparing your shortlist.”
- Never expose chain-of-thought, provider prompts, or pretend agent messages.

**Acceptance:** A normal conversation returns catalog-backed books; a catalog description containing hostile instructions does not alter tool permissions; unauthorized session IDs cannot be read; a failed model call leads to useful deterministic search results.

### FR-03 Hybrid ranking — P0

- Combine semantic relevance, explicit preferences, seed similarity, and accumulated feedback.
- Track soft preference strengths separately from hard restrictions.
- New users rely on request/context; collaborative filtering is optional and depends on adequate interaction data.
- Stopped-reading is not automatically a universal dislike: ask/store the reason when given.
- Record ranking version, component contributions, and candidate eligibility for explanations and reproducibility.

**Acceptance:** Controlled test requests produce predictable ordering changes when preferences change; known read/excluded works do not reappear against the active rule; ranking can run without the LLM.

### FR-04 Recommendation Remix — P0

- Each card exposes “More like this,” “Too long,” “Too difficult,” “Already read,” and “Change my request,” when appropriate.
- A preference tray supports pin, unpin, edit, and reset.
- “Undo last refinement” restores the previous preference/result version.
- Explicitly show how a refinement changed the active request; do not invent causal claims about the reader.
- Stale in-flight responses cannot replace a newer result set.

**Acceptance:** Pinned attributes survive unrelated refinements; undo restores the previous version; repeated requests are idempotent where appropriate; impossible combinations produce a relaxation prompt instead of fabricated matches.

### FR-05 Evidence and comparison — P0

- Cards show up to two concise reasons and one material tradeoff when supported.
- “Why this book?” expands actual factors and source-backed metadata.
- “Why this over that?” compares up to three works on relevant shared dimensions.
- Attribute labels distinguish source metadata, librarian-reviewed tags, and AI-inferred tags.
- Numerical match percentages are prohibited until calibration establishes their meaning.
- Spoiler-free by default: use approved descriptions and short evidence snippets; no model-generated ending summaries.

**Acceptance:** Each factual explanation maps to a stored field/evidence ID; unsupported claims are omitted; confidence in metadata is distinct from prediction of enjoyment; a missing attribute is shown as unknown rather than unfavorable.

### FR-06 Inventory and editions — P0

- Work → edition → physical copy hierarchy.
- Hard page/language rules are checked against at least one eligible edition. Availability must refer to that same eligible edition.
- Copy statuses: available, checked_out, reference_only, maintenance, lost, unknown.
- Show branch, location/call number, eligible available copies, and source timestamp.
- A configurable freshness threshold marks stale inventory as unverified. Default for demonstration inventory: 24 hours; adapters may use stricter rules.
- Demonstration catalog has a persistent unobtrusive “Demo library” label in branch context and inventory screens.

**Acceptance:** An English available copy cannot satisfy a Hindi-only request; checked-out/reference-only copies do not count as borrowable; stale/unknown data is never displayed as verified availability.

### FR-07 Personal shelf and feedback — P0

- Statuses: want_to_read, reading, finished, stopped. One current shelf status per user/work.
- Optional rating from one to five stars; optional private note; update/remove allowed.
- Progress uses edition page count when known and is bounded; do not infer page count.
- Feedback records context: user, work, session/request, reason, timestamp.
- Save/unsave is idempotent. Optimistic updates roll back visibly on failure.
- Users can inspect and reset learned preferences.

**Acceptance:** Reader A cannot read or modify Reader B's shelf; shelf survives reload/login; duplicate clicks do not create duplicate records; reset actually stops old learned signals influencing ranking.

### FR-08 Staff tools — P0

- Catalog editor includes provenance, reviewed tags, metadata completeness, enrichment status, and edition relationships.
- Inventory editor supports copy status and location updates.
- Imports distinguish metadata CSV and inventory CSV; files are validated before commit.
- Work/edition merging requires preview, preserves relationships, and leaves an audit record.
- Insights show aggregate counts and missing-information queues. No individual private chat browsing.

**Acceptance:** Invalid rows identify actionable errors; repeat imports do not duplicate the same edition/copy; reader accounts are denied staff endpoints; existing recommendations remain available during indexing.

### FR-09 Learning paths — P1

- Input: goal, current knowledge, subject, language, and optional time budget.
- Output: three to five books with roles, prerequisites, order rationale, and library availability.
- Order must use curated prerequisite/difficulty data, not title speculation.
- Reading-time estimates require explicit assumptions and are editable.
- If curated data is insufficient, return a recommended starting point and disclose the limit.

**Acceptance:** A beginner path does not require unmentioned advanced prerequisites; ordering is evidence-backed; saved path references valid works; unavailable books have suitable alternatives when known.

### FR-10 Exploration and constellation — P1/P2

- Familiar favors established preferences; Explore expands genre while retaining themes; Surprise increases novelty within explicit hard constraints.
- An adventure control adjusts diversity, not catalog validity or eligibility.
- Constellation edges represent semantic/theme similarity, never certainty of enjoyment.
- Cap displayed nodes; lazy-load the graph only on its route; provide keyboard-accessible list browsing.

**Acceptance:** Increasing novelty measurably changes ranking/coverage while preserving restrictions; graph connections include understandable labels and valid books.

## 8. Screen-by-screen UX specification

### 8.1 Home

- Compact branded header, real navigation, search entry, account controls.
- Asymmetric editorial hero: left headline and concise invitation; right photography with a restrained arrangement of real catalog covers.
- Suggested headline: “Your next good read starts here.”
- Primary CTA: “Find my next book.” Secondary CTA: “Explore the library.”
- Request input with three concrete prompts, such as “A short mystery,” “Start learning AI,” and “More like my favorite.”
- Below hero: curated shelf, a feature collection with photography, and a simple explanation of the three-step discovery flow.
- Returning readers get “Continue reading” and personalized shelves; guests see honestly labeled curated collections.
- Avoid fabricated testimonials, user counts, award badges, and inflated impact statistics.

### 8.2 Discover

- Title and brief contextual greeting; branch context visible.
- Search/request bar, mode switch for stories/learning, compact filter row.
- Curated rows have editorial identities: “A good place to start,” “Clever minds, difficult situations,” or “An introduction to artificial intelligence.” Labels must correspond to real retrieval/curation criteria.
- Mix open cover grids and one larger featured collection; do not wrap every element in a bordered card.
- A shelf contains four to six covers on desktop and a small swipeable set on mobile with visible access to all results.
- Empty preference state offers onboarding without blocking discovery.

### 8.3 Search

- Visible query, result count where exact, sort, active filter chips.
- Desktop filter rail and result grid; mobile filter sheet with Apply and Reset.
- Pending filters in a mobile sheet do not mutate results until Apply.
- Available-only includes explicit branch context and explanation of unknown inventory exclusion.
- Maintain scroll/back state where feasible; loading skeletons reserve final cover dimensions.

### 8.4 Librarian

- Desktop approximately 38/62 split: conversation and preference tray left; shortlist right.
- Request composer stays available without obscuring content; operational updates are lightweight text.
- Results remain visible during refinements; mark them as updating rather than clearing the page.
- Cards prioritize title, author, short reason, tradeoff, availability, and save/refine actions.
- On mobile use a single column with accessible Conversation/Books tabs and a persistent compact preference summary.
- Suggested copy: “Tell me what you feel like reading.” Do not lead with model terminology.

### 8.5 Book detail

- Large cover on a quiet surface; title, authors, publication data, and library action nearby.
- Description, relevant attributes, edition selector, and inventory list.
- Separate labeled areas: “Why it fits,” “What to know,” and “Find it in the library.”
- Similar books use a small curated strip. Collapse long descriptions on mobile.
- Unknown ratings, page counts, tags, or covers receive honest fallbacks; no fake star ratings.

### 8.6 My Shelf

- Status tabs; cover grid/list toggle; search/filter within own shelf.
- Reading-progress controls and private notes are secondary to the books.
- Empty state explains the next useful action and links to Discover.
- Statistics are derived from real stored history, with denominators/time ranges stated.

### 8.7 Compare

- Up to three works; aligned rows for fit reasons, language/length, difficulty, tradeoffs, and availability.
- Small screens use accessible stacked sections or horizontal table scrolling with clear labels.
- “Best for your current request” is conditional and evidence-based, not an absolute book-quality judgment.

### 8.8 Staff screens

- High-information table layouts, explicit actions, filterable queues, import progress.
- Decorative photography is unnecessary here; preserve brand typography and tokens.
- Every edit has saving/success/error states. Changed inventory is invalidated in reader queries.

## 9. Visual direction and researched inspiration

### 9.1 Direction: contemporary editorial library

Warm paper, deep ink, muted forest green, occasional terracotta, generous negative space, real book artwork, and refined serif headlines. The product should feel credible, calm, and tactile while remaining fast and easy to use.

The references below were researched through their public pages/descriptions. They are a starting direction, not a claim that every interactive behavior or mobile breakpoint has been visually audited. During implementation, inspect rendered references and adapt useful patterns to ShelfSense's real content.

| Reference | What to take | What requires our own design |
|---|---|---|
| [BookNest by Adam Max](https://dribbble.com/shots/27731885-BookNest-Premium-Digital-Library-App-Landing-Page-Concept) | Its documented warm editorial direction, serif typography, cream background, restrained photographic treatment | A functioning web application rather than a promotional app showcase |
| [Filing by Arash Farhadi](https://dribbble.com/shots/25619622-Filing-Smart-Digital-Library-for-Web) | Catalog navigation, categories, filters, and discovery hierarchy | Library-copy actions and recommendation refinement instead of purchasing |
| [Digital Library detail concept by Morva Labs](https://dribbble.com/shots/19692608-Digital-Library-Website-Page-Details) | A reference candidate for book-detail composition; inspect its rendered image before borrowing visual specifics | Evidence, edition, and availability sections |
| [Penguin Random House](https://www.penguinrandomhouse.com/) | Publisher-style book discovery and cover-led content priorities | Personalized and conversational workflows |
| [Awwwards e-commerce gallery](https://www.awwwards.com/websites/e-commerce/) | Additional exploration of editorial layouts and content hierarchy | Choose individual examples after visual review; do not import animation-heavy patterns indiscriminately |

Create original layouts and assets. Dribbble screenshots are references, not production images or reusable licensed UI assets.

### 9.2 Proposed design tokens

| Token | Initial value | Use |
|---|---|---|
| `paper` | `#F7F4ED` | Main background |
| `surface` | `#FFFFFF` | Inputs, dialogs, select functional panels |
| `ink` | `#202820` | Main text |
| `muted` | `#5C655D` | Secondary text |
| `forest` | `#234B3B` | Primary actions, active states |
| `terracotta` | `#A54E35` | Select editorial accents |
| `line` | `#DDDCD2` | Subtle separators; not the sole focus indicator |
| `error` | `#A62929` | Error text and status |
| `warm-surface` | `#EEE9DE` | Cover backdrops and feature collections |

These are initial tokens, not pre-certified accessible combinations. Measure all foreground/background pairs and adjust to WCAG AA before release. Never use color as the only indicator.

- Typography: self-host licensed Fraunces for editorial headings and Inter for body/controls; suitable system fallbacks. Limit weights and font files. Use a Devanagari-compatible fallback such as Noto Sans Devanagari if validated Hindi text is displayed.
- Body: 16px base, roughly 1.55 line-height; supporting text typically 14px; avoid unreadably small metadata.
- Display headline: fluid approximately 40–72px; page heading 30–44px; section heading 24–32px.
- Reading text width: around 60–75 characters. Application container: maximum approximately 1280px.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px.
- Radius: 6px controls, 10–12px functional panels, 16px major media. Pills reserved for tags and chips.
- Book covers preserve artwork with `object-fit: contain`; consistent 2:3 display boxes do not justify cropping titles.
- Icons: one consistent line-icon family, with labels/tooltips and accessible names.

### 9.3 Composition and interaction rules

- Use editorial rhythm: large visual introduction, compact filters, open cover shelves, quieter details.
- Real cover colors supply most visual variety. Accents support hierarchy rather than decorating every panel.
- Reader pages use a top-navigation shell. Dense sidebar navigation belongs to staff operations.
- Compose distinctive page layouts rather than repeating the same card grid everywhere.
- Motion: short 120–200ms transitions, restrained hover lift, visible focus, no scroll hijacking. Respect reduced motion.
- No default purple gradients, glowing AI orbs, robots, animated neural networks, excessive glass panels, or sparkle icons on every action.
- No fullscreen conversational interface as the only way to use the catalog.
- No giant blank hero, decorative charts without data, auto-playing video, or fake social proof.
- Dark mode is optional after the light theme is complete; implement a coherent palette rather than simple color inversion.

### 9.4 Responsive requirements

| Width | Behavior |
|---|---|
| 320–639px | Single column; compact header; filter sheet; two-column cover grid if readable; stacked book detail |
| 640–1023px | Two/three-column cover layouts; adapted split views; touch-friendly controls |
| 1024px+ | Full navigation, filter rail, split librarian screen, four-to-six-cover shelves |

Desktop is the release target. Verify 1280 and 1440 CSS pixel widths; mobile completion is excluded at the user's request. Breakpoints are design rules, not user-agent detection. Verify keyboard, touch, zoom, long titles, Hindi text, and mobile safe-area behavior.

## 10. Photography, covers, and image production plan

Images are a release requirement on public discovery pages, not an optional finishing touch. Use real covers for actual works and authentic photography or generated editorial scenes for atmosphere.

### 10.1 Initial sourced image shortlist

- [Brown wooden table and chairs — Unsplash](https://unsplash.com/photos/brown-wooden-table-and-chairs-IgocsyMqK1c): candidate library-interior photograph for the home hero or library collection.
- [Man sitting inside a library — Unsplash](https://unsplash.com/photos/man-sitting-on-chair-inside-library-yUSLlcOkJnk): candidate supporting editorial image; visually assess cropping and relevance before selection.
- [Unsplash license](https://unsplash.com/license): review the chosen asset's actual eligibility and record source/author/license. Do not assume search-result images from other domains inherit this license.
- Actual book covers: source through permitted Open Library/Google Books metadata or approved local assets; keep the source record. Do not fabricate a cover and present it as the real edition.

### 10.2 Required asset inventory

| Asset | Placement | Production brief | Delivery |
|---|---|---|---|
| `home-library` | Home hero | Warm reading space, natural window light, believable shelves, clear crop area | Responsive AVIF/WebP; wide and mobile crops |
| `collection-quiet` | Quiet-reading collection | Tactile book/page detail, calm table surface | Approximately 4:3 |
| `collection-learning` | Learning collection | Books, notebook, restrained desk still life | Approximately 4:3 |
| `collection-adventure` | Fiction collection | Literary atmosphere with muted colors | Approximately 4:3 |
| Real covers | Cards and book details | Valid cover/edition association | Small card and larger detail variants |
| Missing-cover fallback | Catalog fallback | Typographic title/author treatment | Code-generated UI, not invented edition artwork |
| Social preview | Link sharing | Original wordmark and restrained book composition | 1200×630 export |

At least one strong hero image and two collection images must be selected/generated and visually verified before visual sign-off. Images remain secondary on search, chat, and admin screens.

### 10.3 Optional generation briefs

Use an image-generation tool during the website build if sourced images cannot achieve a coherent direction. Generation is optional; this PRD supplies briefs rather than claiming generated assets already exist.

**Hero brief:** “Editorial photograph of a contemporary reading room with warm oak shelves, soft morning window light, cream and muted forest-green tones, quiet thoughtful atmosphere, believable architecture, tactile paper details, asymmetric composition with uncluttered left third for layout flexibility, no readable book titles, no logos, no text, no futuristic elements.”

**Learning brief:** “Editorial still life of an open reference book, simple notebook and pencil on a warm wooden desk, soft side light, cream and deep green palette, natural imperfections, overhead three-quarter composition, no readable text, no logos.”

**Quiet-reading brief:** “Close editorial photograph of a hand turning an unbranded book page beside a sunlit window, natural paper texture, calm neutral palette, believable anatomy, minimal composition, no readable text, no logos.”

If generated scenes are used, do not label them as photographs of the user's actual college library. Provide alt text based on the delivered image, not the prompt.

### 10.4 Asset pipeline

- Record each approved asset in an asset manifest: ID, source page, author, license/permission basis, download date, generated/sourced flag, alt text, crop/focal point, usage, and optimized variants.
- Use local optimized exports or approved storage URLs according to the source's delivery rules. Avoid fragile random-image endpoints.
- Preserve dimensions to prevent layout shift; prioritize only the above-fold hero; lazy-load other images.
- Aim for a hero variant below approximately 250KB and cover thumbnails below approximately 60KB when quality permits; measure actual deliveries.
- No text baked into decorative photography. All headings/buttons remain HTML.
- Review compression, crops, artifacting, portrait rights where relevant, and cover/title legibility.

## 11. Frontend architecture

### 11.1 Architectural principles

1. Next.js owns routing, page composition, rendering, and frontend-specific request/session handling.
2. FastAPI owns recommendation logic, model calls, catalog/inventory rules, and domain mutations.
3. Use server components for initial content and layout; client components only for interactive controls, chat, live results, and optimistic actions.
4. Keep domain modules independent of page routing and presentational primitives.
5. Shared API contracts come from FastAPI OpenAPI; do not independently hand-maintain contradictory frontend/backend types.
6. One database is authoritative; no separate vector database for the initial scope.
7. Browser requests pass through a thin same-origin Next.js gateway to FastAPI. It forwards verified identity and streaming responses without implementing duplicate ranking logic.

Reference: [Next.js App Router project organization](https://nextjs.org/docs/app/getting-started/project-structure). Route groups organize layouts; they do not themselves protect routes.

### 11.2 Proposed repository structure

```text
/
  PRD.md
  README.md
  frontend/
    src/
      app/
        (public)/
          page.tsx
          discover/page.tsx
          search/page.tsx
          books/[workId]/page.tsx
          compare/page.tsx
          about/page.tsx
          evaluation/page.tsx
        (auth)/
          login/page.tsx
          signup/page.tsx
        (reader)/
          shelf/page.tsx
          onboarding/page.tsx
          preferences/page.tsx
          settings/page.tsx
        (assistant)/
          librarian/page.tsx
          librarian/[sessionId]/page.tsx
        (staff)/
          admin/layout.tsx
          admin/page.tsx
          admin/catalog/page.tsx
          admin/catalog/[workId]/page.tsx
          admin/inventory/page.tsx
          admin/imports/page.tsx
          admin/insights/page.tsx
        api/                         # thin allowlisted backend gateway
        layout.tsx
        globals.css
        not-found.tsx
      components/
        ui/                          # customized accessible primitives
        layout/                      # reader/staff shells, navigation
        editorial/                   # hero, collections, image treatments
      features/
        catalog/
        discovery/
        librarian/
        recommendations/
        shelf/
        preferences/
        inventory/
        admin/
        learning-paths/              # introduced with P1
      lib/
        api/                         # typed client and generated contracts
        auth/                        # server session helpers
        validation/
        assets/
        analytics/
        utils/
      providers/                     # query/session context only as needed
      styles/tokens.css
    public/images/
    tests/
  backend/
    app/
      main.py
      api/v1/
      schemas/
      services/
      repositories/
      recommendations/
      agents/
      integrations/
      jobs/
      security/
      observability/
    tests/
  supabase/
    migrations/
    seed/
  data/
    sample-library/
    scripts/
    evaluation/
  docs/
    assets.json
    architecture.md
    evaluation-report.md
  .env.example
```

### 11.3 Component contracts

| Component | Responsibility |
|---|---|
| `BookCover` | Correct dimensions, source, alt text, missing/broken fallback |
| `BookCard` | Title/author, reason, availability, actions; variants for grid/shortlist |
| `BookShelf` | Editorial heading and controlled set of books |
| `PreferenceChip` / `PreferenceTray` | Explicit/inferred/pinned states and accessible edits |
| `AvailabilityBadge` | Verified/stale/unknown status with text |
| `EditionSelector` | Eligible edition selection and metadata |
| `RecommendationReason` | Display stored factors, source labels, tradeoffs |
| `RefinementControls` | Remix actions without duplicating orchestration logic |
| `ConversationComposer` | Input, submit/stop, disabled/sending/error states |
| `OperationalStatus` | Real workflow progress and accessible announcements |
| `FilterPanel` / `FilterSheet` | Shared filter schema across device layouts |
| `CompareTable` | Consistent aligned dimensions and unknown states |
| `ImportPreview` | Row-level validation and reviewed changes |

Components accept typed view models; they do not call model providers directly. Data adapters translate API records into display models. Do not fork nearly identical book cards for each route.

### 11.4 State ownership

| State | Owner | Rule |
|---|---|---|
| Search query/filter/sort | URL | Shareable, refreshable, normalized |
| Catalog/book/shelf/inventory response | TanStack Query or server fetch | One cache policy per resource |
| Session preferences/result versions | Backend + client session controller | Backend is authoritative |
| Open dialog, draft input, active tab | Local React state | No global store needed |
| Multi-step onboarding draft | Local reducer; optional session storage | Do not persist secrets |
| Authentication | Supabase server/client session utilities | Never a homemade local-storage token system |

Introduce Zustand only if real cross-route ephemeral state makes reducers/context unwieldy. Avoid duplicate copies of server data in a global store. A single request coordinator handles cancellation, result versions, and streaming updates.

### 11.5 Rendering, fetching, and streaming

- Render public catalog content on the server where appropriate; interactive search updates use typed client queries.
- User-specific responses are private/non-shared. No public caching of shelves, sessions, or preference-based results.
- Public metadata may be cached by record version. Availability has short configurable TTL and visible timestamps.
- Use loading/error boundaries per major route segment.
- LLM operations run on FastAPI's service host, not inside a short-lived frontend function running local embedding models.
- Stream server-sent events over a POST fetch response through the gateway; use an explicit event parser and abort controller.
- Event types: `status`, `preferences`, `results`, `explanation_delta`, `done`, `error`. Result items carry valid IDs before explanation text is displayed.
- Gateway and hosting must preserve streaming and support the backend deadline; verify in deployment tests.
- Respect server retry advice on rate limiting; no automatic unbounded retries.

### 11.6 Frontend security and quality

- Validate inputs on both client and server; server validation is authoritative.
- Verify identity and ownership in FastAPI even if the Next.js gateway checked them.
- Use explicit CORS origins, request-size limits, secure cookie configuration, and origin/CSRF protection for cookie-authenticated mutations.
- Render model prose as text or sanitized limited Markdown. No arbitrary HTML from models/imported metadata.
- Restrict external image domains; optimize image loading and handle unavailable images.
- Keep provider secrets and Supabase privileged credentials out of browser bundles.
- Use semantic HTML, keyboard support, labeled controls, and accessible dialogs from the first implementation.

## 12. Backend and service architecture

FastAPI route handlers validate requests and identity, then call domain services. Services use repositories for database access and adapters for external sources. The recommendation pipeline and agent coordinator call the same catalog/inventory service methods; there is no separate competing agent database layer.

```text
Browser
  -> Next.js UI / same-origin gateway
       -> FastAPI API + identity verification
            -> Catalog / Inventory / Shelf services
            -> Recommendation pipeline
            -> Librarian coordinator -> model-provider adapter
            -> PostgreSQL + pgvector
            -> Cached metadata adapters
            -> Background import/index worker
```

- Use Pydantic schemas for request/response validation and structured model output.
- Load embedding model once per worker process; avoid downloading/loading it per request.
- Precompute catalog embeddings. Query embedding is computed on demand.
- Use PostgreSQL job records with a simple dedicated worker for imports/enrichment/indexing. Avoid introducing Redis/Celery until workload warrants them.
- Jobs are restartable, bounded, and idempotent. Record progress, error counts, and retry limits.
- Cache external metadata with source IDs and timestamps; do not depend on external APIs for every recommendation.
- Data migrations and seed commands are version controlled and repeatable.

## 13. Data model

UUID primary keys unless an external identifier table supplies source keys. Store timestamps in UTC; display them in the user's locale/timezone. Organization and branch IDs enforce scope even in the single-organization pilot.

| Entity | Principal fields and relationships |
|---|---|
| `profiles` | auth user ID, display name, organization ID, created_at |
| `staff_roles` | user ID, organization ID, role, assigned_by, assigned_at |
| `reader_preferences` | user ID, explicit interests/exclusions, language, default branch, version |
| `learned_preferences` | user ID, attribute, weight, evidence event IDs, reset/version marker |
| `works` | ID, title, description, first publication year, subjects, metadata status |
| `authors`, `work_authors` | names, source identifiers, ordered work authorship |
| `editions` | work ID, ISBN identifiers, language, pages, publisher, publication year, format |
| `source_records` | entity ID/type, provider, external ID, fetched_at, selected fields, source URL |
| `book_attributes` | work/edition ID, attribute/value, source kind, evidence ID, review status |
| `embeddings` | work ID, vector, model/version, input hash, indexed_at |
| `organizations`, `branches` | organization identity, branch names and public location details |
| `copies` | edition ID, organization/branch ID, unique copy/barcode ID, call number, status, updated_at |
| `inventory_snapshots` | copy/status source, observed_at, integration/import version |
| `shelf_entries` | user ID + work ID unique pair, status, edition ID optional, progress, rating, note |
| `feedback_events` | user/guest context, work ID, session ID, reason, polarity, timestamp |
| `sessions`, `messages` | owner/guest-session scope, role, content, preferences version, created_at |
| `recommendation_runs` | session/user context, request version, ranking/index versions, latency |
| `recommendation_items` | run ID, work ID, eligible edition IDs, rank, factor contributions, evidence |
| `learning_paths`, `path_items` | owner, goal, assumptions, ordered works and prerequisite evidence |
| `imports`, `import_rows` | actor, file hash, mapping, preview/commit status, errors, changed IDs |
| `jobs` | type, payload reference, status, attempts, progress, last_error |
| `audit_events` | staff actor, operation, record IDs, before/after changes, timestamp |

### 13.1 Constraints and provenance

- Enforce foreign keys, valid status enums/check constraints, and organization boundaries.
- ISBNs identify editions where available; not every work/edition has an ISBN.
- Deduplicate on trusted source IDs/ISBNs first; fuzzy title-author matches require reviewed merging.
- Local copies use a stable unique identifier within organization scope.
- Numeric page counts must be positive when supplied; unknown remains null.
- Ratings are personal feedback, not fabricated aggregate popularity data.
- Mood, difficulty, pace, and prerequisite annotations are not reliably supplied by every metadata provider. Curate them or label inference honestly.
- Do not treat “unknown violence” as “no violence.” Verified strict exclusions require supporting annotation; otherwise state that the restriction cannot be verified.
- Set evidence hierarchy: local verified inventory for copies; reviewed attributes for curated dimensions; selected provider records for bibliographic metadata; inferred attributes last and explicitly labeled.

### 13.2 CSV formats

Metadata template fields: `external_work_id`, `title`, `authors`, `description`, `subjects`, `isbn13`, `language`, `page_count`, `publisher`, `publication_year`, `cover_url`. Required minimum: title, author or explicit unknown-author marker, and a stable source identifier or reviewed match decision.

Inventory template fields: `copy_id`, `edition_external_id` or `isbn13`, `branch_code`, `call_number`, `status`, `status_observed_at`. Copy ID, resolvable edition, branch, and valid status are required. Preview unresolved edition mappings.

Validate encoding, headers, duplicates, status/date/page values, allowed URLs, organization membership, and file/row limits. Treat CSV cells as data; sanitize spreadsheet-formula prefixes in exports.

## 14. Recommendation pipeline specification

### 14.1 Steps

1. Normalize request text and validate identity/session.
2. Extract structured preferences with the model, or use direct filter controls/keyword fallback.
3. Resolve seed books to catalog IDs; ask for disambiguation when necessary.
4. Retrieve approximately 50–100 candidates through lexical and semantic searches; configurable for catalog size.
5. Merge/deduplicate candidates and apply hard rules, including eligible edition/copy joins.
6. Compute semantic relevance, seed similarity, explicit taste fit, and feedback scores.
7. Apply diversity reranking when enabled; do not weaken hard rules.
8. Fetch final inventory/evidence for the selected works.
9. Save run/version/factor data and render deterministic reasons.
10. Optionally paraphrase supported reasons with the LLM, validate factual fields, and collect feedback.

Reference implementation concept: [Sentence Transformers retrieve and rerank](https://sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html). A cross-encoder is optional after measurement demonstrates a benefit.

### 14.2 Initial ranking hypothesis

Normalize compatible signals before blending. Proposed starting weights, not established results:

```text
base_score = 0.45 * semantic_relevance
           + 0.25 * explicit_preference_fit
           + 0.20 * seed_book_similarity
           + 0.10 * feedback_fit
```

Renormalize weights over available signals for cold-start readers or requests without seeds. Keep weights/configuration versioned. Availability-only, language, read exclusions, and verified maximum page constraints are eligibility rules, not small score bonuses.

Use an optional diversity step such as maximal marginal relevance. Tune the relevance/diversity balance on validation data. Do not display internal blend scores as an enjoyment probability.

### 14.3 Multilingual behavior

- Compare at least one English baseline and one suitable multilingual embedding model on real English/Hindi/Hinglish requests.
- If translation/normalization is used, retain the original request and display extracted constraints for correction.
- Do not promise broad multilingual semantic search until evaluation passes.
- Separate request language, UI language, and requested book-edition language.

### 14.4 Evidence structure

Each result contains `work_id`, eligible editions, active constraint outcomes, named factor contributions, evidence IDs, availability source/time, and short supported reasons. Explanation generation receives only this approved bundle. If generation invents a factual claim or fails validation, fall back to deterministic templates.

The evidence verifier reduces unsupported output; it is not a mathematical guarantee against all factual errors. Source accuracy and annotation quality remain explicit limitations.

## 15. Agent and model contracts

### 15.1 Structured request

```json
{
  "intent": "recommend",
  "mode": "fiction",
  "seed_work_ids": [],
  "interests": ["problem-solving"],
  "soft_preferences": [{"attribute": "technical_detail", "direction": "lower"}],
  "hard_constraints": {"max_pages": 350, "available_only": true},
  "requested_book_languages": ["eng"],
  "branch_id": "resolved-branch-id",
  "pinned_attributes": [],
  "clarification_needed": false
}
```

IDs above are illustrative. Resolve them through actual catalog/branch tools; do not accept model-created IDs. Preference schemas reject unknown fields and invalid values. Hard rules are explicit user restrictions, not casually inferred preferences.

### 15.2 Tools

| Tool | Input | Output | Permission |
|---|---|---|---|
| `resolve_books` | titles/authors/identifiers | matching candidate IDs | Public catalog |
| `search_books` | normalized query, constraints, seeds | bounded verified candidates | Public catalog |
| `rank_candidates` | valid candidates, scoped preferences | ranked IDs and factors | Scoped request |
| `check_availability` | valid edition IDs, branch | copy status/time/location | Public inventory |
| `get_reader_preferences` | identity from server context | own preference record | Authenticated owner |
| `get_book_evidence` | valid work/edition IDs | approved attribute/source fields | Public metadata |
| `build_learning_path` | validated goal/profile | curated candidate progression | P1, scoped request |

The model does not choose arbitrary user IDs, execute SQL, browse arbitrary URLs, or mutate staff inventory. Shelf changes happen through explicit UI-backed endpoints, not hidden conversational actions.

### 15.3 Operational bounds

- Proposed default: at most six tool executions and two model-generation steps per recommendation request; configurable and measured.
- Overall deadline approximately 30 seconds; return deterministic results earlier when possible.
- One bounded retry for transient provider failure within deadline.
- Per-user/guest quotas and input/output limits are configurable; enforce server-side.
- Track estimated provider usage/cost where supported. No assumed free-tier guarantee.
- Provider credentials remain server-side. Retrieved descriptions are untrusted data, never system instructions.
- Conversation memory consists of explicit session state and recent messages; do not resend an unbounded history.

## 16. API surface and contracts

All backend routes under `/api/v1`. Return a request ID and a standard error body: `code`, safe `message`, `field_errors` where relevant, `retryable`, and `request_id`. Use bounded pagination and explicit authentication. Do not return provider secrets or raw stack traces.

| Method/path | Purpose |
|---|---|
| `GET /books` | Keyword/filter search with cursor |
| `GET /books/{work_id}` | Work details, attributes, editions |
| `GET /books/{work_id}/availability` | Branch-scoped edition/copy availability |
| `POST /recommendations` | Structured deterministic/hybrid recommendation run |
| `POST /sessions` | Create scoped reader/guest session |
| `GET /sessions/{session_id}` | Authorized session state |
| `POST /sessions/{session_id}/messages` | Process request and stream typed events |
| `POST /sessions/{session_id}/remix` | Versioned refinement and updated results |
| `POST /sessions/{session_id}/undo` | Restore previous request version |
| `GET/PATCH /me/preferences` | Inspect/change own preferences |
| `POST /me/preferences/reset-learned` | Reset learned signals |
| `GET /me/shelf` | Own shelf |
| `PUT/DELETE /me/shelf/{work_id}` | Idempotent shelf update/removal |
| `POST /feedback` | Scoped contextual feedback |
| `POST /compare` | Compare valid IDs within current context |
| `POST /paths` | P1 learning-path generation |
| `POST /admin/imports/preview` | Validate file/mapping without catalog mutation |
| `POST /admin/imports/{id}/commit` | Reviewed, idempotent import commit |
| `GET /admin/imports/{id}` | Import/job progress and errors |
| `PATCH /admin/books/{work_id}` | Staff catalog edit |
| `PATCH /admin/copies/{copy_id}` | Staff inventory edit |
| `GET /admin/insights` | Aggregated demand/gaps |
| `GET /evaluation/summary` | Sanitized measured results |
| `GET /health` and `/ready` | Service and dependency readiness |

Mutation requests use idempotency keys where duplicate execution is material. Remix requests carry `expected_version`; stale versions return a conflict with the latest state. The UI does not silently overwrite a newer session.

## 17. Failure and edge-case behavior

| Situation | Required behavior |
|---|---|
| No preferences/history | Use request and curated onboarding; do not claim learned personalization |
| No matching catalog books | Explain which constraints narrowed results; offer explicit relaxations |
| Unknown length/language | Exclude from verified strict matches or show a separate unverified suggestion with consent |
| Unknown mood/content attribute | Label unknown/inferred; do not certify absence |
| Every eligible copy checked out | Show status and search available alternatives |
| Metadata API unavailable | Use cached catalog; queue enrichment retry |
| LLM timeout/quota | Return deterministic results and plain-language recovery state |
| Embedding model unavailable | Fall back to lexical/attribute ranking; report reduced semantic capability |
| Inventory stale | Show last update and unverified status; omit from verified available-only results |
| Missing/broken cover | Display designed title/author fallback with stable dimensions |
| Ambiguous seed title | Show compact title-author choices |
| Conflicting pin/new request | Ask which rule to retain; preserve previous results |
| Multiple rapid refinements | Cancel obsolete work or ignore outdated result versions |
| Import partially invalid | Preview valid/error counts; commit only reviewed valid rows |
| Sign-in expires mid-save | Preserve draft, request login, retry idempotently |
| API connection lost during stream | Retain last verified results; offer bounded retry |
| Long title or Devanagari text | Wrap naturally; no overlap, unreadable clipping, or broken fonts |

## 18. Accessibility and performance requirements

Target [WCAG 2.2 AA](https://www.w3.org/TR/wcag/) on primary workflows. This is a target to verify, not a certification claim.

- Full keyboard operation, visible focus, meaningful headings, skip link, labeled controls.
- Focus trapping/restoration for dialogs; errors tied to inputs; operational updates through restrained live regions.
- Body text contrast at least 4.5:1; large text and relevant UI contrast according to applicable criteria.
- Aim for 44×44px interactive hit areas; never fall below applicable 24px minimum/spacing exceptions without review.
- Reduced-motion support; no essential hover-only action; status is text plus color.
- Meaningful image alt text; decorative images use empty alt.
- Reflow at zoom, no unintended horizontal overflow at 320px, mobile keyboard does not hide composer actions.

Proposed performance targets, measured on a documented deployment/device/network:

| Measure | Target |
|---|---|
| LCP | ≤2.5s on key public routes under agreed mobile test conditions |
| CLS | ≤0.1 |
| INP | ≤200ms when measurable with sufficient interactions |
| Cached catalog API | p95 ≤500ms under pilot load |
| Warm deterministic recommendation | p95 ≤2s for initial catalog |
| AI first useful shortlist | p95 ≤10s under normal provider conditions |
| AI request hard deadline | Approximately 30s with fallback |
| Visible interaction acknowledgment | Within approximately 200ms |

Measure warm and cold model startup separately. Do not call these targets achieved until tested. Virtualize large admin tables, lazy-load graph/chart code, optimize images/fonts, and avoid huge application-wide client bundles.

## 19. Privacy, authorization, and reliability

- Supabase JWTs are verified using trusted issuer/key information; verify expiration and audience as configured.
- Enforce row-level security for personal tables. Privileged backend operations perform explicit ownership and organization checks even if a service credential bypasses RLS.
- Reader preference/chat data is private; staff sees aggregate demand only.
- Proposed defaults: guest session expiration 24 hours; anonymous session bodies then deleted; authenticated chat retention 90 days unless deleted earlier. Shelf/preferences persist until reset/account deletion. Make retention configurable and explain it in Settings.
- Send only necessary request/profile fields to the model provider; do not send student identifiers, emails, or private notes by default.
- Account deletion removes personal profile, shelf, chats, preferences, and identifiable feedback; retain only permitted de-identified aggregates and required staff audit records.
- No raw private request text in analytics URLs or ordinary operational logs. Redact tokens and provider credentials.
- Rate limits, timeouts, safe input sizes, retry bounds, and job idempotency prevent accidental runaway calls.
- Protect ingestion/enrichment from arbitrary URL fetching and prompt injection. Allowlist provider endpoints and validate imported URLs.
- Backups and migration rollback procedure must be documented; restore test before public deployment.
- No invented status changes, unread book content, or fabricated evaluations.

## 20. Analytics and product success

Instrument events with request/run IDs and minimal non-sensitive context:

`discovery_started`, `search_completed`, `recommendations_shown`, `book_opened`, `evidence_opened`, `remix_applied`, `remix_undone`, `shelf_saved`, `feedback_submitted`, `availability_viewed`, `fallback_used`, `import_completed`.

Do not treat clicks as proof of enjoyment. Record denominators and distinguish guest/signed-in flows without exposing identity.

Initial pilot hypotheses, to revise with evidence:

- At least 80% of pilot participants complete discovery → detail → save/location without assistance.
- At least 70% find one of the first five recommendations useful in their tested request context.
- Median time to a saved/located candidate below three minutes for ordinary discovery tasks.
- Remix is judged more convenient than restarting by a majority of participants who test both.
- 100% valid catalog IDs in controlled release tests.
- Zero unauthorized cross-user or staff operations in the authorization test suite.
- Zero verified availability claims based on stale/unknown inventory in controlled tests.

These are release aspirations and study hypotheses, not current results.

## 21. Academic evaluation plan

### 21.1 Questions

1. Does hybrid ranking improve recommendation relevance over simple baselines?
2. Does semantic retrieval handle experience-based requests better than keywords alone?
3. Does Remix preserve explicit rules and improve perceived control?
4. Does diversity reranking improve coverage while retaining relevance?
5. Are explanations supported by stored evidence?

### 21.2 Experimental design

- Baseline A: popularity when legitimate interaction counts exist; otherwise a clearly named curated/metadata baseline.
- Baseline B: keyword/content-based retrieval.
- Baseline C: semantic-only retrieval.
- Proposed system: hybrid ranking with optional diversity reranking.
- Ablations: remove feedback, remove seed similarity, remove diversity; only run relevant ablations.
- Use [UCSD Book Graph](https://sites.google.com/eng.ucsd.edu/ucsdbookgraph/home) only after reviewing usage conditions. It is historical research data collected in 2017, not current availability data.
- For interaction evaluation, split by time where possible and deduplicate works/editions to prevent leakage. Keep training/validation/test roles explicit.
- For conversational discovery, curate at least 60 requests: fiction, academic, cold-start, constraints, ambiguous titles, multilingual, impossible matches, stale inventory, and hostile metadata.
- Relevance labels should use a documented rubric and two human annotators where feasible; adjudicate disagreements. Sample feasibility is a project limitation.
- Pilot usability study: approximately 10–20 consenting participants, counterbalanced tasks/order, with limited statistical claims.

### 21.3 Metrics

| Metric | Interpretation |
|---|---|
| Precision@5 / NDCG@5 | Relevance of the shortlist and ordering |
| Recall@k | Retrieval coverage when relevant-item labels exist |
| Catalog coverage / intra-list diversity | Repetition and breadth |
| Constraint violation rate | Failures of explicit restrictions |
| Invalid-ID rate | Recommendations absent from catalog |
| Evidence support rate | Fraction of factual explanation claims supported |
| Task completion / time / usefulness | Human product outcomes |
| Latency / provider calls / usage | Practical deployment cost and responsiveness |

Publish raw denominators, configurations, dataset/model versions, limitations, and reproducible commands. Show results only after experiments run. No generated charts labeled as actual performance.

## 22. Verification strategy

Use tests where failures matter; avoid tests that simply mirror markup.

- Backend unit tests: eligible-edition constraints, inventory freshness, ranking signal normalization, evidence validation, feedback/reset behavior.
- Integration tests: authenticated ownership/RLS, staff organization permissions, idempotent shelf/import operations, session version conflicts, source failures.
- End-to-end tests: guest search, login/save handoff, onboarding, request → Remix → undo, book edition/location, CSV preview/commit, provider fallback.
- Security cases: malicious metadata, arbitrary URLs, cross-user IDs, forged roles, invalid tokens, quota bypass.
- Visual QA: screenshots at the five specified viewport widths, long/missing content, real imagery, loading/empty/error states, focus/reduced motion.
- Accessibility: automated checks plus manual keyboard and representative screen-reader checks; automated checks alone do not establish conformance.
- Load checks: representative pilot load, e.g. 20 concurrent users, including warm embedding queries and bounded AI requests; document hardware/hosting.
- Academic checks: dataset leakage, valid metric calculation, reproducible baseline comparison.

## 23. Delivery plan and dependencies

| Stage | Proposed timing | Deliverable and exit condition |
|---|---|---|
| Foundation | Week 1 | Catalog schema, CSV seed/import preview, identity, source adapters, approved visual tokens and two polished page compositions |
| Core library | Week 2 | Home/Discover/Search/Detail/Shelf responsive flows with real data, editions, copies, and imagery |
| Recommendation engine | Week 3 | Lexical/semantic/hybrid baselines, eligibility rules, reasons, initial evaluation harness |
| Librarian and Remix | Week 4 | Tool-bound conversation, versioned refinements/undo, streaming, verified explanations, fallback |
| Operational completeness | Week 5 | Staff import/inventory, aggregate insights, security/accessibility/error-state completion; P1 paths only if P0 is stable |
| Validation and presentation | Week 6 | Pilot, measured experiments, responsive/performance polish, deployment verification, final documentation and demo |

Dependencies: curated attributes before strict mood/difficulty claims; inventory before availability-only; model/index consistency before semantic deployment; baseline harness before claimed improvements; image selection before visual sign-off.

Do not spend early weeks building decorative graphs or multi-agent theater. A complete vertical slice—request, retrieve, rank, explain, locate, save—must exist by the end of core development.

## 24. Deployment and operations

- Deploy Next.js to a compatible Node/serverless host and FastAPI plus model/worker to a Python/container host. Supabase hosts database/auth. Select providers after checking regional availability, runtime limits, streaming, and budget.
- Keep the embedding model on the backend service with sufficient memory; predownload during build/startup where permitted. Avoid host configurations that reload it for every request.
- Environments: local development, staging, production/demo. Separate credentials and database state.
- Dockerize backend/worker for reproducibility; a local frontend/backend setup must work for a presentation.
- CI: frontend typecheck/lint/build, backend meaningful tests, migration validation, key end-to-end flows.
- Track request IDs, model/ranker versions, tool latency, fallback rate, import/job state, and approximate usage without storing sensitive text in ordinary logs.
- Provide a real deterministic offline/demo fallback with bundled catalog and sample inventory. Label it; do not pretend prerecorded responses are live AI.
- Maintain `.env.example`, setup commands, seeding/indexing commands, evaluation commands, and deployment rollback instructions.
- Public publishing/real-library connections are separate delivery actions; this PRD does not assume they have occurred.

## 25. Definition of done

Release is complete when:

1. Every P0 flow works against persisted catalog/inventory and authorized user state.
2. Recommendations resolve to real catalog works and eligible editions.
3. Hard constraints and inventory freshness pass controlled acceptance tests.
4. Remix preserves pins, handles conflicts, supports undo, and ignores stale responses.
5. Reasons and comparisons expose real evidence and omit unsupported claims.
6. Reader/staff authorization boundaries pass meaningful tests.
7. Model/source failures preserve useful search and deterministic recommendations.
8. Home, Discover, Search, Librarian, Detail, Shelf, and Staff screens have complete loading/empty/error states.
9. Required imagery is delivered with source/rights records and reviewed crops; real covers and intentional fallbacks are used.
10. Responsive and accessibility review passes the agreed checks; performance is measured and material misses documented/fixed.
11. No visible nonfunctional controls, fake testimonials, fabricated analytics, or placeholder evaluation results remain.
12. Experimental results, limitations, reproducible setup, and presentation scripts are documented.

### 25.1 Five-minute demonstration

1. Open a polished Discover page with real covers and curated imagery.
2. Ask for a short problem-solving story available in the demonstration library.
3. Inspect three verified recommendations and their reasons.
4. Pin one preferred attribute; refine length/technical detail; show changed results and undo.
5. Compare two options and inspect evidence.
6. Open the eligible edition, show branch/location/timestamp, and save to shelf.
7. Briefly show librarian inventory/import tools.
8. Present measured baseline comparison and honestly state limitations.

## 26. Risks and mitigations

| Risk | Response |
|---|---|
| Sparse mood/difficulty data | Curate a smaller catalog, record inferred status, avoid false guarantees |
| No real college integration | Admin-managed demonstration inventory with clear labeling |
| Repetitive famous titles | Evaluate diversity and coverage; add controlled exploration |
| Unsupported LLM explanations | Restrict candidate IDs/evidence; validate and use deterministic fallback |
| Multilingual inconsistency | Evaluate representative requests; disclose supported scope |
| Oversized build scope | Complete P0 vertical slice; gate P1/P2 |
| Slow/costly model calls | Precompute embeddings, bound tools/history, cache metadata, measure usage |
| Hosting cold starts | Measure startup, provision appropriately, retain local presentation mode |
| Generic-looking UI | Editorial composition, custom tokens, real imagery, page-specific visual QA |
| Private-data leakage | Server ownership checks, RLS, minimal provider payloads, redacted logs |

## 27. Remaining implementation choices

These do not block the proposed core specification:

- Actual college/library name, branch names, catalog permissions, and inventory freshness requirements.
- Team size, submission date, and deployment/API budget.
- Final embedding model selected through evaluation, particularly Hinglish requests.
- Final logo/product name and approved font/image assets.
- Whether P1 learning paths or P2 constellation becomes the extra presentation feature.
- Exact provider model/runtime versions after compatibility and budget checks.

Proceed with the documented defaults until better information is available; never invent the library's actual collection, permissions, or experimental results.

## 28. Technical and source references

- [Next.js getting started](https://nextjs.org/docs/app/getting-started)
- [Next.js project structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [FastAPI features](https://fastapi.tiangolo.com/features/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase vector columns / pgvector](https://supabase.com/docs/guides/ai/vector-columns)
- [Sentence Transformers semantic search](https://www.sbert.net/examples/sentence_transformer/applications/semantic-search/README.html)
- [Sentence Transformers retrieve/rerank](https://sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html)
- [Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [LangGraph overview — optional future orchestration](https://docs.langchain.com/oss/python/langgraph/overview)
- [Open Library Search API](https://openlibrary.org/dev/docs/api/search)
- [Open Library API usage and bulk guidance](https://openlibrary.org/developers/api)
- [Google Books API](https://developers.google.com/books/docs/v1/using)
- [Koha REST API — optional integration](https://api.koha-community.org/)
- [WCAG 2.2](https://www.w3.org/TR/wcag/)

External API capabilities, hosting conditions, and model availability can change. Verify them at implementation time. References support design and architecture decisions; all acceptance targets and proposed ShelfSense behavior above are product requirements, not facts about an existing implementation.
