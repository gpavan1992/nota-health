# Plan: MikeOSS-style Assistant Enhancements

Bring the Clinical Assistant closer to the Mike OSS reference across six areas.

## 1. Execution steps timeline (per assistant message)
- Add a collapsible "Completed in N steps" panel that appears above each assistant response.
- Steps captured during a run:
  - `Read <doc>` for each attached document (green dot when parsed OK, red when unreadable).
  - `Thought process` entries at start and just before final answer (expandable to show the model's brief reasoning/preamble text).
  - `Found "<query>" (N matches) in <doc>` — simple client-side keyword hit-count against the parsed doc text using the user's question keywords.
- Persist steps on the assistant message. Add a `steps jsonb` column to `chat_messages` (nullable, default `[]`).
- Render collapsed by default with a chevron; expand to see all steps.

## 2. Clear validation / empty-content message
- When a PDF/image yields no extractable text (already the case for scanned PDFs), surface a clear one-liner in the answer body:
  > "The document '<name>' appears to be a scanned image with no extractable text. I can't summarize it. Try uploading a text-based PDF, or enable OCR."
- Also mark the corresponding Read step with a warning icon + tooltip "No extractable text".

## 3. Citations panel with right-side document preview
- Under each assistant message add a "Citations" card listing each source document with a small badge (count).
- Clicking a citation opens a right-hand slide-over panel (Sheet) that previews the document:
  - PDFs → embedded `<iframe>` using an object URL of the stored file.
  - Images → `<img>`.
  - Text/DOCX → rendered extracted text.
- Store the original file blob for the session in-memory (Map keyed by attachment id) so preview works without a re-upload. Case-linked docs use their existing storage URL.
- Include a Download button in the preview header.

## 4. Copy message button
- Add a copy icon under every assistant message (already have one stub in screenshot). Copies the plain-text answer to clipboard with a toast.

## 5. Rename / delete for chat history
- The sidebar thread list gets a `…` menu (DropdownMenu) per thread with:
  - Rename → inline input, updates `chat_threads.title`.
  - Delete → confirm dialog, removes thread + messages (cascade already in place).
- Wire to existing `useDeleteThread` and add `useRenameThread`.

## 6. Auto-scroll-to-bottom affordance
- Track whether the transcript is scrolled away from the bottom.
- When not at bottom during streaming, show a floating circular ↓ button above the composer.
- Clicking scrolls smoothly to the newest message. Auto-hides when at bottom.

## Technical notes
- Files touched:
  - `supabase/migrations/*` — add `steps jsonb` column to `chat_messages`.
  - `src/routes/_authenticated/assistant.$threadId.tsx` — steps tracking, citations, copy, auto-scroll.
  - `src/components/message-steps.tsx` — new step timeline component.
  - `src/components/document-preview-sheet.tsx` — new right-side preview.
  - `src/components/app-sidebar.tsx` (or wherever thread list renders) — rename/delete menu.
  - `src/hooks/use-chat-threads.ts` — add `useRenameThread`.
- No provider/model changes. All UI + one DB column.

Proceed?
