## Protocol feature rework

Rebuilds the Protocols page around three flows: **bulk management**, **two-step create + dedicated column editor**, and **Use-in picker (Assistant / Case)**. Keeps existing Nota styling and design tokens.

### 1. List page (`protocols.index.tsx`)

Rework the table and row actions:

- **Selection column** — checkbox on every row + header master checkbox.
- **Bulk action bar** — appears when any row is selected (mirrors existing pattern):
  - *Deactivate / Activate* — enabled only when selection is 100 % built-ins.
  - *Delete* — enabled only when selection is 100 % custom.
  - *Rename* — enabled only when selection is exactly one custom.
  - *Duplicate* — always enabled.
- **Row menu** (per-row `MoreHorizontal`) — split by source:
  - Built-in: `Rename`, `Duplicate`, `Edit`, `Deactivate/Activate`.
  - Custom: `Rename`, `Duplicate`, `Edit`, `Delete`.
  - `Rename` and `Edit` on built-ins clone the protocol into a new custom copy first (they can't mutate BUILT_IN_PROTOCOLS), then open the corresponding editor.
- **Create button** — no longer opens the big multi-step dialog; opens a slim "New protocol" modal (Name, Type, Clinical area, Description). On save → `saveCustomProtocol` → `navigate({ to: "/protocols/$protocolId" })`.
- Remove the current `CreateCustomProtocolDialog` column-builder code from this file.

### 2. Dedicated protocol editor (`protocols.$protocolId.tsx`)

Repurpose the existing detail page into the editor Mike-OSS screen 3 shows:

- Header: breadcrumb `Protocols › <name>`, metadata row (Type / Source / Language / Practice area / Jurisdiction fall back to existing Clinical area only — no new fields), `Use` button, `⋯` menu (Duplicate / Edit basics / Delete for custom, Deactivate for built-ins).
- **Extraction protocols** — show the columns table (Column Title / Format / Prompt) with an `+ Add Column` button (top-right + empty-state CTA). Clicking it opens `AddColumnsDialog` (see below). Rows are inline-editable for custom protocols, read-only for built-ins.
- **Assistant protocols** — show the starter prompt in a large editable textarea (custom) or rendered markdown (built-in) with an `Edit prompt` button that swaps to edit mode. No column table.
- Persist edits via `updateCustomProtocol`.

### 3. AddColumnsDialog (new component)

Mirrors Mike-OSS screens 4-5:

- Modal titled "Tabular Review › New column".
- Repeating collapsible column cards (default 1, `+ Add another column` at bottom). Each card:
  - `Column title` input.
  - `Format` select (existing `COLUMN_FORMAT_OPTIONS` + icons).
  - `Prompt` textarea with `+ Auto-Generate Prompt` (reuses `callProviderText` / `keyForModel`, gated by API key).
  - `×` to remove.
- Footer: `Cancel`, `Add columns` (disabled until every card has a title).
- On confirm, appends columns to the protocol via `updateCustomProtocol`. Reuses existing dnd-kit ordering on the parent editor page (drag handles on each row).
- Keep template presets and markdown import accessible as `+ Add from template` / `+ Import markdown` split-buttons next to `+ Add Column` on the editor page (not inside the modal, per user's answer).

### 4. Preview modal on list page

Change `PreviewModal` behaviour to match images 6-9:

- Extraction protocols: render the inline columns table (Column Title / Format / Prompt truncated) directly in the preview body — no more "Open full page for details" message. Reuse the built-in schema fallback via `getProtocol(extractionProtocolId)`.
- Assistant protocols: render the starter prompt as before.
- Footer buttons: `View Page` (existing) + `Use` (opens `UseProtocolDialog` — see next).

### 5. Use-in picker (new `UseProtocolDialog`)

Shown from row menu `Use`, preview `Use`, and editor `Use`:

- Step 1 — "Use in":
  - `Assistant` (chat) or `Case` (project).
  - `Additional message` textarea (optional; appended to the starter prompt for assistant, or added as `customInstruction` for extraction).
- Step 2 (only when Case is chosen):
  - `Select case` — list from `useCases()`.
  - When the case is chosen and the protocol is `extraction`, show a document picker fed by `useCaseDocuments(caseId)` (checkbox list of case document names, "Select all" toggle). Since `case_documents` only stores names today, the picker forwards the selected names into the existing extract wizard's uploader as pre-filled slots; user attaches the files. No DB migration.
- Confirm:
  - Assistant + Assistant chat → current `chat_threads` insert + navigate, seed = starter prompt (+ additional message).
  - Assistant + Case → same insert but link via `case_conversations` (existing table) and navigate to the case chat.
  - Extraction + Assistant → current `/extract` navigation with `customInstruction` in search state.
  - Extraction + Case → `/extract` navigation with `caseId` and `preselectedDocs` search params; extract page reads them, preloads doc slots, and on completion writes back a `case_documents` row (name = "<protocol> results — <date>") so the extraction appears in the case folder. No new table.

### 6. Data model / storage

- No schema changes. Everything still lives in `localStorage` (`nota.custom_protocols`, `nota.deactivated_protocols`) except case linkage, which reuses existing `case_conversations` / `case_documents`.
- Add small helpers to `src/lib/clinical-protocols.ts`:
  - `renameCustomProtocol(id, name)` (thin wrapper over `updateCustomProtocol`).
  - `duplicateProtocol(source)` — used by row menu and bulk action; always creates a custom clone with fresh column IDs.

### 7. Files touched

- `src/routes/_authenticated/protocols.index.tsx` — trim to list + slim create modal + bulk bar + preview updates.
- `src/routes/_authenticated/protocols.$protocolId.tsx` — full rewrite as editor page.
- `src/components/add-columns-dialog.tsx` — new.
- `src/components/use-protocol-dialog.tsx` — new.
- `src/lib/clinical-protocols.ts` — helpers.
- `src/routes/_authenticated/extract.index.tsx` — accept `caseId` + `preselectedDocs` search params, prefill uploader, and write result row into `case_documents` on success.

### Out of scope

- Language / Version / Jurisdiction fields from the Mike-OSS screenshots (not present in the current data model).
- New Supabase tables — reusing existing case tables only.
- Any change to Assistant, Cases, or the extract runner beyond the search-param plumbing above.