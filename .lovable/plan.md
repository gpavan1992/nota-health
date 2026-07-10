
# Audit findings (no fixes applied)

## CASES

**Critical**
- **Rename case is not implemented.** No edit UI on `cases.$caseId.tsx` and no `useRenameCase` mutation. Renaming "QA Test" → "Cardiology QA" cannot be performed by any user action. Test cannot pass.
- **Delete case is not implemented.** No delete button, no confirmation dialog, no `useDeleteCase` mutation. Users can only remove cases via `PrivacyTab → "Delete all cases"` in Settings, which nukes every case they own. Per-case delete does not exist.
- **"Search zzz → empty state" copy is wrong.** `EmptyState` shows *"No cases match this view."* only when a case exists; that's fine, but the same table always renders the (empty) mobile list below because `filtered.length > 0` gate is on the block AFTER the mobile block condition is also `filtered.length > 0` — actually correct. **However**, on desktop the empty state renders **inside** the `hidden md:block` wrapper's ELSE branch, so on mobile the empty state never shows when a case list exists but the search filter empties it. Mobile users searching "zzz" see a blank card, not the empty-state message.

**Medium**
- **Case-type filter is missing.** UI has "All / Mine / Shared" but no filter for Patient vs Research; the test relies only on visible list so this is not a blocker, but the spec implies type is meaningful.
- **`useCase()` maps a fetch error to `notFound()`**: any transient RLS/network error on `cases.$caseId.tsx` looks like a not-found. Navigating to a deleted case URL will not crash (good), but a real error is misreported as 404.
- **RLS on `cases` for cross-user isolation is untested here.** Table has 4 policies but there's no owner-scope check in the loader — relies entirely on RLS. Any policy regression exposes rows across users. Recommend an explicit `eq("owner_id", ...)` or membership check in `fetchCasesWithCounts` as defense-in-depth.

**Low**
- Create-case flow only adds document **names** (see Documents section) — no actual file storage.
- "Members" adds an email but never triggers an invite email; recipient has no signal.
- Search is client-side only over the currently-loaded page; fine for small lists.

---

## DOCUMENTS

**Critical**
- **There is no document upload/processing pipeline at all.**
  - `case_documents` table columns: `id, case_id, name, created_at`. No `mime_type`, `size_bytes`, `status`, `storage_path`, `content_text`, `error`.
  - `CreateCaseDialog.handleFilePick` reads only `file.name` — the actual PDF/DOCX/TXT bytes are discarded; nothing is uploaded to Supabase Storage.
  - No storage bucket for case documents (only `avatars` exists).
  - No status field → no "Processing", "Ready", or "Failed" states can be shown.
  - No file-type validation → PNG cannot be "rejected with error"; it's accepted as a name.
  - No size validation → 50MB rejection does not happen; the input has no `accept=` and no size check.
  - No realtime subscription → nothing updates without refresh.
  - No timeout worker → nothing can "auto-fail" a stuck document at 2 minutes.
  - No per-document delete UI on `cases.$caseId.tsx`; the documents tab is read-only.

  **Every single Documents test case is unimplementable against the current build.**

**Medium**
- Even the "add document by name" flow in `CreateCaseDialog` accepts arbitrary text (`docInput`) with no dedup case-insensitivity and no length below the 200-char toast beyond that check.

**Low**
- Document list on the case detail page shows filename + created_at only; no source, uploader, or size (moot until upload exists).

---

## DOCUMENT + GEMINI CROSS-CHECK

**Critical**
- **No document-content pipeline exists.** With `case_documents` storing only a name, there is nothing for the assistant to read. Even the existing "Cases" popover in the assistant composer pushes documents into `attachments` with `text: ""` (see `assistant.$threadId.tsx` `linkCase()`). The model receives an empty document block — it cannot answer "What medications are listed in this document?" from the file.
- **No "document in scope" panel in the Clinical Assistant.** The assistant has a `Cases` popover that dumps all case documents into the message as empty-text stubs. There is no per-document checkbox, no scope UI, no way to "uncheck document from scope."
- **Gemini streaming is not wired** (already flagged in prior audit). `chat-stream.ts` throws for `provider === "google"`. Even if documents had content, the Gemini path errors before any response.
- **Assistant only reads `profile.anthropic_api_key`** regardless of selected model (already flagged). A user with only a Gemini key can't send.

**Medium**
- Even if a document's content were attached, the current pattern inlines it into the user message (up to 50 KB per file, see `handleFile` in the assistant), then relies on the model to find medications. There is no chunking, no retrieval, no citation of the source doc — for a discharge summary PDF that exceeds 50 KB after text extraction, content is silently truncated.
- No PDF/DOCX text extraction library is included. The assistant's file input has `accept=".txt,.md,.csv,.json,.text"` — PDF is not even accepted at the composer.

**Low**
- No indication in assistant responses of which document was used (no citation / source-highlight).

---

## Summary

Cases: rename, delete, and mobile empty-state are missing (Critical/Critical/Low).
Documents: the entire upload → storage → parsing → status pipeline does not exist; the "documents" feature today is a text-only tag list.
Doc + Gemini: cannot be tested end-to-end — Gemini adapter, key gating, document scope UI, and content extraction are all absent.
