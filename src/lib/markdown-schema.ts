import type { ColumnFormat, ExtractionColumnDef } from "./clinical-protocols";
import { COLUMN_FORMAT_OPTIONS } from "./clinical-protocols";

function slugId(): string {
  return `col_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeFormat(raw: string): ColumnFormat {
  const s = raw.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  for (const opt of COLUMN_FORMAT_OPTIONS) {
    if (opt.label.toLowerCase() === s) return opt.value;
    if (opt.value.toLowerCase().replace(/_/g, " ") === s) return opt.value;
  }
  // shorthand matches
  if (s.includes("medication")) return "medication_entry";
  if (s.includes("clinical")) return "clinical_value";
  if (s.startsWith("icd")) return "icd10";
  if (s.startsWith("yes")) return "yes_no";
  if (s.includes("bullet")) return "bulleted_list";
  if (s.includes("date")) return "date";
  if (s.includes("number")) return "number";
  if (s.includes("provider")) return "provider";
  if (s.includes("currency") || s.includes("cost") || s.includes("price")) return "currency";
  return "free_text";
}

export type ParseResult =
  | { ok: true; columns: ExtractionColumnDef[] }
  | { ok: false; error: string };

/** Parse a `| Title | Format | Prompt |` markdown table. */
export function parseMarkdownColumns(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));
  if (lines.length < 2) {
    return { ok: false, error: "Table must have a header row and at least one column row." };
  }
  const rows = lines
    .map((l) =>
      l
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim()),
    )
    // drop separator rows like |---|---|---|
    .filter((cells) => !cells.every((c) => /^:?-{2,}:?$/.test(c)));
  if (rows.length < 2) {
    return { ok: false, error: "No data rows found after the header." };
  }
  const [header, ...body] = rows;
  const idx = {
    title: header.findIndex((h) => /title|name|column/i.test(h)),
    format: header.findIndex((h) => /format|type/i.test(h)),
    prompt: header.findIndex((h) => /prompt|instruction|extract/i.test(h)),
  };
  if (idx.title === -1 || idx.format === -1 || idx.prompt === -1) {
    return {
      ok: false,
      error: "Header must include Title, Format, and Prompt columns.",
    };
  }
  const columns: ExtractionColumnDef[] = [];
  for (const cells of body) {
    const title = cells[idx.title] ?? "";
    if (!title) continue;
    columns.push({
      id: slugId(),
      title,
      format: normalizeFormat(cells[idx.format] ?? ""),
      prompt: cells[idx.prompt] ?? "",
    });
  }
  if (columns.length === 0) {
    return { ok: false, error: "No valid rows found." };
  }
  return { ok: true, columns };
}

export const MARKDOWN_FORMAT_EXAMPLE = `| Column Title | Format | Prompt |
|---|---|---|
| Primary Diagnosis | ICD-10 Code | Extract the primary diagnosis with ICD-10 code. |
| Discharge Medications | Medication Entry | List all medications prescribed at discharge. |
| Follow-up Date | Date | Extract the first follow-up appointment date. |`;
