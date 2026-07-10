# Nota Health — Critical Fix Plan

Scope is large. I'll work in 5 batches, each independently shippable. Critical items first, Medium second, Low deferred.

## Batch 1 — Foundations (unblocks everything else)

**Gemini streaming adapter** (Sections 2, 3, 6, 7, 8, 9)
- Add `streamGemini()` to `src/lib/chat-stream.ts` using `generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse`
- Route `provider === "google"` to it (removes the "not wired" throw)
- Model label passed through to the assistant message metadata
- Invalid-key → surface API error text via existing toast path (already handled by throw → catch)

**Profile: per-provider keys** (Section 2)
- Extend `profiles` with `google_api_key`, `openai_api_key` (migration + GRANT); keep existing `anthropic_api_key`
- `assistant.$threadId.tsx` selects the key by provider of current model; banner + disabled input driven by "no key for current provider"
- Model selector warning when switching to a provider without a key
- Settings page: mask saved keys (`sk-•••••••abcd`), never render raw value after save
- Never store keys in localStorage/sessionStorage — DB-only (already the case; audit and confirm)

**Landing + auth redirects** (Sections 1, 11)
- Root `/` already public — verify no auth redirect
- `_authenticated` layout already redirects to `/auth`; verify `/cases` and `/assistant` covered
- Sign-up: enforce 8+ chars, required fields, map Supabase "User already registered" to clear message
- Sign-in: map "Invalid login credentials" → "Wrong email or password"
- Session persistence already via Supabase; verify `persistSession: true`

## Batch 2 — Disclaimer + Naming + Logo (Sections 12, 13, 14)

- Replace landing footer `<FooterItem>"Not a medical device"</FooterItem>` with the full required sentence
- Compliance page bottom: use the exact sentence
- Auth page: add persistent footer disclaimer
- AppShell footer already correct — verify
- Grep for bare "Nota" as product name, replace with "Nota Health"
- Grep user-visible "Lovable" strings in `client.ts` / `auth-middleware.ts` error toasts → replace with "Nota Health"
- `NotaMark` in sidebar: bump to 28px, straighten QRS polyline so the spike reads at small sizes
- Landing hero: add large `NotaMark`
- Favicon already teal ECG-N — verify

## Batch 3 — Cases + Documents (Sections 4, 5)

- Cases: confirm React Query invalidation on create/rename/delete (no refresh)
- Add confirmation dialog on delete
- `cases.$caseId.tsx`: 404 boundary via `notFoundComponent` when case missing
- Search: real-time client filter
- Uploads: accept PDF/DOCX/TXT; reject PNG and >50MB with toast
- Processing status: realtime channel or polling every 5s until terminal
- Stuck-processing watchdog: server fn cron-style check (or client-side on load) marking >2min as `failed`
- Delete during processing: cancel + row removal in one transaction

## Batch 4 — Extract + Protocols + Tools (Sections 6, 8, 9, 10)

- `run-extraction.ts`: route through Gemini when key/provider is Google, use structured JSON output
- Validate document + key before submit → clear inline errors
- All 6 built-in protocols wired with real prompts producing structured tables
- Protocols page → clicking opens Assistant with seeded prompt (already present, verify per-protocol focus)
- Tools (Drug/PubMed/NPI/ICD): already server routes under `/api/tools/*` — verify no auth-key dependency, add empty-state on zero results, error boundary on 4xx/5xx

## Batch 5 — Security cross-check (Section 15)

- Verify RLS on `cases`, `case_documents`, `chat_threads`, `chat_messages`, `extractions` (already `owner_id = auth.uid()`)
- Sign-out: `queryClient.clear()` + `cancelQueries()` before `supabase.auth.signOut()`
- Case detail route: `notFound()` on empty result (already-not-yours cases look identical to deleted)
- Audit log: currently claimed on compliance page but no table exists. Either (a) create `audit_log` table + RLS + log auth/case events, or (b) remove the claim from compliance copy. **Recommend (b)** — smaller, honest, ships today. Ask if you want (a) instead.

## Explicitly deferred (Low)

- Pattern-name taxonomy in styles.css
- Monospaced treatment for drug/dose fields
- Tablet 768px layout QA
- OG image generation

## Open questions before I start

1. **Audit log** — build the real table or remove the claim from Compliance? (Recommend remove.)
2. **Gemini model list** — the current catalog has `google/gemini-*` gateway ids, but BYOK Gemini needs raw Google model names (e.g. `gemini-2.5-flash`). OK to add a mapping in `model-catalog.ts`?
3. **Stuck-processing watchdog** — client-side sweep on load is simple and free; a cron server fn is more reliable. Pick one?

Approve and I'll start with Batch 1.
