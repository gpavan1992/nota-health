# Match Nota UI to the reference screenshots

Four surfaces need visual/structural changes. No business-logic changes — presentation only.

## 1. Extract list table (ref: image 1)

File: `src/routes/_authenticated/extract.index.tsx`

- Add a leading checkbox column (visual only for now, non-functional selection state) so rows read `☐ DOCUMENT | CLASS | KEY METRIC`.
- Replace generic columns (Name / Protocol / Documents / Created / Status) with a document-focused layout:
  - `DOCUMENT` — file/extraction name in regular weight
  - `CLASS` — protocol shown as a soft colored pill (slate for default, blue/amber tint variants derived from protocol id)
  - `SUMMARY` — the single most useful extracted value if available (first row's first "value-like" column), rendered with a colored status dot (green/amber/red) based on a simple heuristic; falls back to document count when no rows yet.
- Remove uppercase status text; use just the dot + label.
- Row hover: subtle bg, no borders between rows except thin `divide-y` in muted tone (already close).

## 2. Extraction detail view (ref: image 2)

File: `src/routes/_authenticated/extract.$extractionId.tsx`

- Title stays serif; add a subtle graph-paper backdrop (`bg-[radial-gradient(...)]` or existing muted grid) behind the page container.
- Under the title show three chips in mono: `<Protocol> Extract`, `In a Case` (if linked), and a green-dot `ready` chip — matching image 2.
- Timestamp on its own line in muted text.
- Replace the current wide multi-column table with a two-column **FIELD | VALUE** table when the extraction yielded a single row (typical for discharge/SOAP-style protocols):
  - Left column: field label in mono, muted
  - Right column: value in mono, foreground
  - Thin row dividers, generous padding, off-white surface
- Multi-row extractions (e.g. med lists) keep today's wide table, but restyled with the same mono header + off-white surface for visual consistency.
- Delete button: move to a small trash-icon-only button next to the title (red), matching image 2.

## 3. Assistant chat message card (ref: image 3)

File: `src/routes/_authenticated/assistant.$threadId.tsx` (assistant message rendering block)

- Attachment chip above the user bubble: pill showing `📎 <filename> · N pages` on the left and a green `Ready` badge on the right, on a single rounded card. Page count derived from parser output when available, otherwise omitted.
- Assistant response card:
  - Header row with a small sparkle icon + `Clinical Assistant` label in eyebrow style (uppercase, tracked, small).
  - Body renders markdown as today; inline ICD codes wrapped in `<code>` already via markdown.
  - Any markdown table renders inside a subtle bordered container with mono header row (MEDICATION / DOSE / INDICATION style).
  - Footer line in italic muted text: `For clinical review only. Not a substitute for professional medical judgment.` (append automatically if the model didn't include it — presentation-only append).

## 4. Step timeline (ref: image 4)

File: `src/components/message-steps.tsx`

- Replace the current per-step icon set with a uniform small dot indicator:
  - Completed step: filled green dot
  - Running step: filled amber/gray dot with subtle pulse
  - Warning/error: amber/red dot
- Remove the vertical connector line and per-step chevron; show one flat list.
- Header shows `Completed in N steps` (already correct) with a right-aligned chevron to collapse.
- Step labels stay in the clinical phrasing we already normalized; only visual density changes (tighter line-height, no icon column beyond the dot).
- Keep expand-on-click for step details, but details open inline under the row in a thin muted panel (already close).

## Technical notes

- No schema or server changes.
- Reuse existing tokens in `src/styles.css`; no new colors introduced. Status dots use `bg-success`, `bg-warning`, `bg-destructive`.
- Page-count for attachments: extend `parseFile` return only if trivial (PDFs already loaded via pdfjs — count `pdf.numPages`); otherwise skip the ` · N pages` suffix. Keep this change small; if it requires touching the parser meaningfully, drop the suffix.
- Preserve current markdown rendering pipeline (`react-markdown` + `remark-gfm`) — only wrap tables in a styled container via a custom `components.table` renderer.

## Out of scope

- Bulk actions from the new checkbox column (visual only this round).
- Real page counts for non-PDF attachments.
- Any change to extraction logic, model routing, or persistence.
