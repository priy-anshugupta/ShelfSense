# ShelfSense upgrade plan — 10 October 2026

1. Replace Gemini interpretation with OpenAI Responses API orchestration. Give the coordinator, discovery specialist, learning specialist, and critic separate responsibilities and validated outputs. Only authorized catalog tools can provide books and copy status. Stream actual execution activity and preserve a deterministic fallback.
2. Deliver real account creation, login, logout, recovery, and session persistence without requiring a hosted account service for the local project. Preserve optional Supabase authentication. Migrate guest shelves after sign-in, enforce ownership, hash passwords, and keep session secrets in HTTP-only cookies.
3. Improve the desktop homepage, make account actions visible, add a personal dashboard, and turn the staff dashboard into a navigable workspace with overview, inventory, catalog, imports, insights, and agent status.
4. Test agent routing/tool boundaries/fallback, account isolation/recovery/logout, inventory behavior, and all key desktop flows. Build the final frontend, update configuration instructions, and keep a working local preview.

No public deployment is included. Live OpenAI calls need `OPENAI_API_KEY`; no key is requested before completing the local implementation. Agent tests will simulate API responses and clearly distinguish them from live provider verification.
