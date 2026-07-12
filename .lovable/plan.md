## Scope

Extend the Create Custom Protocol modal so that when **Type = Extraction**, users can define the schema of columns the extraction will produce. Route that schema through to the extraction runner and render results with per-format styling. Assistant flow, built-ins, and every other feature are unchanged.

## 1. Data model (`src/lib/clinical-protocols.ts`)

Add types + persistence:

```ts
export type ColumnFormat =
  | "free_text" | "bulleted_list" | "medication_entry"
  | "clinical_value" | "icd10" | "yes_no"
  | "date" | "number" | "provider" | "currency";

export interface ExtractionColumnDef {
  id: string;          // stable client id for drag/delete
  title: string;
  format: ColumnFormat;
  prompt: string;
}

export interface ClinicalProtocol {
  ...
  extractionColumns?: ExtractionColumnDef[]; // present when type === "extraction" (custom only)
}
```

`saveCustomProtocol` / `updateCustomProtocol` already spread the payload — no shape change needed beyond storing the new field.

Add `COLUMN_FORMAT_OPTIONS` (label + value) and `TEMPLATE_PRESETS` (Prior Authorization Checklist, Medication Comparison, Lab Results Tracker) with the exact column sets from the request.

## 2. Modal UI (`src/routes/_authenticated/protocols.tsx` — `CreateCustomProtocolDialog`)

Widen dialog (`max-w-2xl`) and add scroll container so the extended form fits. Existing fields (Name, Type, Clinical area, Description, Starter prompt) remain untouched. Starter prompt keeps showing for **both** types (extraction runs can also seed a natural-language instruction) — the current code only shows it for `assistant`; keep that existing behavior unchanged and place the new section **below** it when Type = Extraction.

When `type === "extraction"`, render below existing fields:

**Extraction Columns section**
- Heading + subtext as specified.
- If `columns.length === 0`: render "Start from a template:" with the 3 preset cards; clicking one loads its columns.
- Column list: each column is a card with:
  - Drag handle (using `@dnd-kit/core` + `@dnd-kit/sortable` — add via `bun add`).
  - Title input, Format `Select`, Prompt `Textarea`, ✨ Auto-Generate button, × delete button.
- "+ Add column" button below the list.
- Footer line: `{n} columns defined`.
- Save validation: extraction type requires ≥1 column, each with non-empty title.

**Auto-Generate button**
- Reads `profile.ai_model` + matching API key via `useProfile(userId)` (same pattern as `create-extraction-dialog.tsx`).
- If no key: button disabled with tooltip "Add an AI key in Settings to use Auto-Generate".
- Otherwise POSTs the exact prompt from the spec to the chosen provider (reuse `runExtraction`'s provider helpers by extracting a small `callProviderText(apiKey, modelId, prompt)` helper in a new `src/lib/ai-text.ts`, or inline a minimal single-shot call). Populates the prompt field; user can edit.

**Advanced — Import schema from Markdown** (collapsed `<details>` / `Collapsible`)
- Two sub-blocks: paste-textarea and `<input type="file" accept=".md,.txt">`.
- "Import Columns" button parses a pipe-delimited markdown table (`| Title | Format | Prompt |`), skips the header + separator rows, maps Format via case-insensitive lookup against the format catalogue (fallback `free_text`), and replaces the current column list. Toasts success/failure per spec.
- "See expected format →" opens a Tooltip/Popover with a sample table.

Parser lives in `src/lib/markdown-schema.ts` with unit-testable pure functions (`parseMarkdownColumns(text): ExtractionColumnDef[] | { error }`).

## 3. Threading columns through to the runner

**Where the schema lives at run time.** Today, clicking "Use" on an extraction protocol navigates to `/extract?new=true&protocol=custom` (custom protocols always use the "start from scratch" extraction). We keep that URL but pass the custom protocol id so the Extract flow can look up its columns.

Changes:
- `runProtocol` in `protocols.tsx`: for custom extraction, navigate with `{ new: true, protocol: "custom", customProtocolId: p.id }`.
- `src/routes/_authenticated/extract.tsx`: extend the search schema with optional `customProtocolId`.
- `src/components/create-extraction-dialog.tsx`: accept an optional `customProtocolId` prop; when present, load the protocol via `getClinicalProtocol(id)`, pre-fill the name, force `protocolId = "custom"`, hide the protocol picker, and pass its columns down to `runExtraction`.
- `src/lib/run-extraction.ts`: extend `ExtractParams` with an optional `columnPrompts?: Record<string, string>`; when provided, include each column's per-column extraction prompt in the JSON instruction block so the model uses it. Existing built-in extraction protocols continue to hit the current code path (columns come from `PROTOCOLS`).
- Store `format` alongside each column when persisting the extraction (`columns` JSON already has `key`/`label`/`description` — extend `ProtocolColumn` with optional `format?: ColumnFormat`). No DB migration: `extractions.columns` is already a JSON blob.

## 4. Result rendering (`src/routes/_authenticated/extract.$extractionId.tsx`)

Add a `renderCell(value, format)` helper that switches on `column.format`:
- `clinical_value`: parse `"12.3 HIGH"` / `"low"` suffix; wrap in a badge — red HIGH, blue LOW, green NORMAL.
- `icd10`: monospaced code + description in muted text.
- `yes_no`: colored badge (green/red/grey).
- `medication_entry`: split `Drug | Dose | Frequency | Route` into a small grid.
- Others: plain text.

The existing table already lists rows; add the formatter to the cell renderer. Keep the current "Copy as CSV" and "Export as CSV" buttons if they exist; if not (verify while editing), add both using the same rendering-as-text strategy (raw values, not the styled markup).

## 5. Non-goals / unchanged

- Assistant flow, built-in protocols, the sidebar/nav, and Clinical Assistant are untouched.
- No new DB tables — custom protocols already live in `localStorage`, and the new `extractionColumns` array rides along in the same JSON blob.
- No changes to `PROTOCOLS` in `src/lib/protocols.ts` beyond adding an optional `format` field to `ProtocolColumn`.

## Technical details

- New deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (drag reorder).
- New files: `src/lib/markdown-schema.ts`, `src/lib/ai-text.ts` (single-shot text call reused by Auto-Generate).
- Edited files: `src/lib/clinical-protocols.ts`, `src/lib/protocols.ts`, `src/lib/run-extraction.ts`, `src/routes/_authenticated/protocols.tsx`, `src/routes/_authenticated/extract.tsx`, `src/routes/_authenticated/extract.$extractionId.tsx`, `src/components/create-extraction-dialog.tsx`.
- Storage stays in `localStorage` under the existing `nota.custom_protocols` key.
