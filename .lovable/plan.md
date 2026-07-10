
# Audit findings (no fixes applied)

## NAMING

**Medium**
- **`NotaLogo` component (`src/components/nota-logo.tsx` line 78) renders the wordmark as `Nota` + `Health`**, correctly. But the standalone `NotaMark` is used bare (no wordmark) in several places — that's fine as a mark. However `src/components/site-header.tsx:15` uses "Open Nota Health" — good. No naked "Nota" as product name visible in user-facing copy. ✓
- **`export const CLINICAL_SYSTEM_PROMPT` (`src/lib/chat-stream.ts:40`)** starts with `"You are Nota Health, a clinical documentation assistant…"` — good, and instructs the model to append the disclaimer to every response. ✓ But because Gemini streaming isn't wired (prior audit), Gemini responses never actually reach the disclaimer append path — the "appears at end of every Gemini response" audit item still fails for that reason.
- **User-visible "Lovable" strings:** three occurrences in `src/integrations/supabase/{client,client.server,auth-middleware}.ts` — the error message `"Connect Supabase in Lovable Cloud."` is surface-able as a runtime error toast if env vars are missing. Per Lovable Cloud rules, "Supabase" and "Lovable" should not be shown to end users. Files are auto-generated, so flag but don't rewrite them; consider intercepting the error at the app boundary.
- **Download filename** `nota-<name>-<date>.json` (settings.tsx:448) uses bare `"nota"` — user sees this as a saved filename. Low-visibility but technically naked-Nota.
- **`CUSTOM_KEY = "nota.custom_protocols"`** — localStorage key, not user-visible.

**Low**
- Root `head()` (`src/routes/__root.tsx:82`) title: `"Nota Health — Clinical Documentation Intelligence"`. Good, but page-level `head()` overrides typically set titles like `"Cases — Nota Health"` — reversed order (page — brand) inconsistent with the root (brand — tagline). Not wrong, just not uniform.
- OG title (`__root.tsx:89`) `"Nota Health — Clinical Documentation Intelligence"` — matches audit requirement of "Nota Health" in shared link title. ✓
- `LovableErrorOptions` / `reportLovableError` (`src/lib/lovable-error-reporting.ts`) are internal names only used by the platform error bridge; not visible to users. Fine as-is.

---

## LOGO

**Medium**
- **`NotaMark` sizes.** Sidebar uses `size="sm"` → `h-5` (~20 px), not 28 px. Audit expects "28 px in sidebar" — currently ~20 px. The mark still reads as an N at 20 px, but not at the required size.
- **QRS spike is drawn with a straight polyline** (`d="M4 0 L16 18 L18 22 L20 -10 L22 30 L24 22 L36 36"`). At small sizes the spike compresses and reads as noise rather than a heartbeat. Between the two verticals the peak/trough (`L20 -10 L22 30`) is centered but sharp — at `h-5` sidebar size the −10 baseline (12 units above cap) is barely visible.
- **`viewBox="0 -12 40 52"`** — negative Y origin extends 12 units above the glyph so the QRS overshoot has room. Correct, but `NotaMark`'s default `className="h-6 w-auto"` inflates the width by ratio 40/52 → the mark is wider than square; a 28 × 28 sidebar slot will render as ~28 × ~36 px letterbox.

**Low**
- Mark uses `text-primary` and inherits the teal from theme (`--primary`). Not "black or generic blue" — passes. Favicon (`public/favicon.svg`) hardcodes `#1b7a86` — same teal in hex form, so theme changes don't update the favicon.
- No `<link rel="apple-touch-icon">` or `<meta name="theme-color">` in `__root.tsx` — the mark won't propagate to iOS home-screen or mobile browser chrome.
- No generic healthcare symbols (no caduceus, no stethoscope glyph, no cross). ✓

---

## DISCLAIMER

**Critical**
- **Landing page footer** (`src/routes/index.tsx:828`) reads just "Not a medical device" (four words in a `<FooterItem>` list). It is NOT the full "Nota Health is not a medical device. All AI outputs require review by a qualified healthcare professional." required. Audit item fails.
- **Compliance page** (`src/routes/_authenticated/compliance.tsx`) does not render the exact disclaimer sentence at the bottom (previously flagged). Line 110 says "Nota Health is not a certified HIPAA-compliant service…" — that's a different sentence. Audit expects the standard clinical disclaimer; currently missing.
- **Auth page** shows the disclaimer only inside the consent checkbox on sign-up (`auth.tsx:519`), not as a persistent footer. Sign-in visitors never see it.
- **Gemini responses** — as flagged in a prior audit, `streamChat` throws for `provider === "google"`, so the model never emits a disclaimer at all. Audit item "Appears at end of every Gemini response" fails until Gemini streaming is implemented.

**Medium**
- **`AppShell` footer** (`src/components/app-shell.tsx:88-91`) renders the correct sentence — so Clinical Assistant, Cases, Extract, Protocols, Tools, Settings, Compliance all get it *because* they use `AppShell`. ✓
- Compliance page uses `AppShell`, so it does get the AppShell footer at the bottom — but audit read the compliance-specific "disclaimer at bottom" as a page-level element, not the shared footer. Ambiguous; flag for the spec-owner.
- System prompt says "End every response with this exact disclaimer on a new line" but the client also appends it defensively in `assistant.$threadId.tsx:213` ("Ensure disclaimer present"). If the model already appends it, users may see two copies. No dedup check found.

**Low**
- Disclaimer sentence in the AppShell footer wraps at narrow widths and drops to two centered lines; readable but visually thin (`text-[0.7rem]`).

---

## VISUAL THEMES

**Medium**
- **`bg-pattern-*` utilities** in `src/styles.css` are defined for `neural`, `grid` (Cases uses grid, not "document filing"), `lab`, `flow`, `hex` (Drug), `paper` (PubMed), `map` (Provider), `tree` (ICD). Naming mismatch vs audit:
  - Cases audit calls for "document filing pattern"; app uses `bg-pattern-grid`. `grid` reads as a grid, not filing tabs.
  - Drug audit calls for "molecular pattern"; app uses `bg-pattern-hex`. Hex ≈ benzene ring; passable but not explicit molecules.
  - Provider audit calls for "network pattern"; app uses `bg-pattern-map`. Map lines ≠ network topology.
- Patterns are single-utility CSS backgrounds; need to render-check the actual visual density (patterns not read in this pass).

**Low**
- **`AnimatedPromptCard`** on `/auth` right panel — assumed present, statistics visible in `STATS.map(...)`. ✓
- **Compliance badges** on `/auth` right panel: `<ComplianceBadgeRow />` (auth.tsx:110) renders `ComplianceShield` (line 577) components — those are proper visual badge components (shield-shaped, iconized), not plain text. ✓
- **Monospaced font usage**: ICD code chips use `font-mono text-[11px]` (tools.icd), NPI shown via `<Badge className="font-mono">` — good. Drug names, dosages: currently rendered in regular text — no monospaced treatment. Audit expects mono on drug names/dosages; currently not applied.
- **Teal accent**: `--primary` teal, used on primary buttons and active states. Identifier chips (NPI, ICD, PMID) — NPI/ICD use outline badges without teal fill; identifiers not visually teal-tinted.
- **Tablet 768 px**: cannot verify without a screenshot; `PageHeader`/`AppShell` uses `sm:px-10` and `max-w-5xl` — likely OK but not verified.

---

## SECURITY CROSS-CHECK

**Medium**
- **RLS**: `cases`, `case_members`, `case_documents`, `chat_threads`, `chat_messages`, `extractions` all appear in migrations with policies scoped to `owner_id = auth.uid()` (or `is_case_owner`/`is_case_member`). ✓ User B cannot SELECT User A's case. That means:
  - Navigating to User A's case URL as User B → `useCase()` fetch returns no row → the loader maps this to `notFound()` (already flagged in a prior audit: transient errors also map to `notFound()`, which is a separate issue).
  - DevTools Network tab as User B → the query returns `{data: null}` for the target case ID. No User A rows leak. ✓
- **Extraction insert** (`create-extraction-dialog.tsx`) sets `user_id: userId` on insert — but the audit prior noted `extractions` policies are on `user_id` scoped to `auth.uid()`. Assuming the migration matches that, ✓.
- **Audit log**: no dedicated `audit_log` table is present in the migrations grepped. The compliance page copy claims "Every data access event recorded in the audit log" but there is no audit log implementation. Audit-log audit item fails — either the copy is aspirational or the feature is missing.

**Critical**
- **Client-side Anthropic/OpenAI calls** send the full document body over the browser directly to `api.anthropic.com` / `api.openai.com` — outside Lovable Cloud, outside any RLS boundary. Not a User-A-to-User-B leak, but the compliance copy "Nota Health does not store AI conversation contents on any third-party server" is misleading: the conversation is transmitted to Anthropic/OpenAI directly and their retention policies apply.
- **Deleted cases**: no `.filter("owner_id", ...)` check on the client, but RLS enforces server-side. If the client deletes a case then re-fetches, another user's cached React Query cache from before sign-out could theoretically flash on Back button; earlier audit noted sign-out doesn't clear React Query cache. Combine those two issues and User A's cached data can render for ~200 ms during User B's login. Actual data on-wire is fine.

**Low**
- Case URL structure `/cases/$caseId` uses raw UUIDs — non-enumerable but shareable. Fine given RLS.

---

## Summary of blockers

1. Landing footer and compliance page do not carry the required exact disclaimer sentence.
2. Naming leak: `"Connect Supabase in Lovable Cloud"` error strings are user-reachable.
3. Sidebar mark is ~20 px, not the requested 28 px.
4. Pattern names don't match audit taxonomy (grid vs filing, hex vs molecules, map vs network).
5. Audit-log feature is claimed on the compliance page but not implemented.
6. Gemini disclaimer requirement blocked by the unimplemented Gemini adapter (upstream from this audit).
