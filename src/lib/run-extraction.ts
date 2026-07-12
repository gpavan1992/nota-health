import { getModelChoice } from "./chat-stream";
import type { ProtocolColumn } from "./protocols";

export interface ExtractDoc {
  name: string;
  text: string;
  image?: { data: string; mediaType: string };
}

export interface ExtractParams {
  apiKey: string;
  modelId: string;
  protocolName: string;
  columns: ProtocolColumn[]; // may be empty for custom
  customInstruction?: string;
  documents: ExtractDoc[];
}

export interface ExtractResult {
  columns: ProtocolColumn[];
  rows: Record<string, string>[];
}

/**
 * Runs a structured extraction against the user's own Anthropic/OpenAI key.
 * Text documents are inlined into the prompt. Image documents are sent as
 * vision content blocks (Anthropic: image/base64, OpenAI: image_url data URL).
 */
export async function runExtraction(p: ExtractParams): Promise<ExtractResult> {
  const choice = getModelChoice(p.modelId);

  const textDocs = p.documents.filter((d) => !d.image && d.text.trim().length > 0);
  const imageDocs = p.documents.filter((d) => d.image);

  const docsBlock = textDocs
    .map((d) => `--- Document: ${d.name} ---\n${d.text.slice(0, 40000)}`)
    .join("\n\n");

  const hasColumnPrompts = p.columns.some((c) => c.prompt && c.prompt.trim().length > 0);

  const columnSpec = p.columns.length
    ? `Return a JSON object of the form:
{
  "columns": [ { "key": string, "label": string } ],
  "rows": [ { "<key>": string, ... } ]
}
Use exactly these columns (keep keys and labels as given):
${p.columns
  .map((c) => {
    const base = `- ${c.key} (${c.label})${c.description ? " — " + c.description : ""}`;
    const perColPrompt = c.prompt && c.prompt.trim() ? `\n    Extraction instructions: ${c.prompt.trim()}` : "";
    const fmt = c.format ? `\n    Format: ${c.format}` : "";
    return base + fmt + perColPrompt;
  })
  .join("\n")}${
        hasColumnPrompts
          ? "\n\nFollow each column's Extraction instructions precisely when filling that column's cells."
          : ""
      }`
    : `Design a small table (3–8 columns) that best captures what the user asked for. Return:
{
  "columns": [ { "key": string, "label": string } ],
  "rows": [ { "<key>": string, ... } ]
}
User instruction: ${p.customInstruction ?? "Extract the most clinically useful structured data."}`;

  const imageList = imageDocs.length
    ? `\n\nAttached images (${imageDocs.length}): ${imageDocs.map((d) => d.name).join(", ")}.\nRead any clinical content visible in the images (labels, values, handwritten notes) as source material.`
    : "";

  const prompt = `You are a clinical data extraction assistant. Read the attached documents and produce a structured table for the protocol: ${p.protocolName}.

${columnSpec}

Rules:
- Return VALID JSON only, no prose, no markdown fences.
- Every row value must be a string (use "" if unknown).
- Include one row per distinct item found (e.g. one row per medication).
- Preserve exact dosages, ICD codes, drug names, and identifiers as written in the source.

Documents:
${docsBlock || "(no text documents attached)"}${imageList}`;

  let raw: string;
  if (choice.provider === "anthropic") {
    raw = await callAnthropicJSON(p.apiKey, choice.model, prompt, imageDocs);
  } else if (choice.provider === "google") {
    raw = await callGeminiJSON(p.apiKey, choice.model, prompt, imageDocs);
  } else {
    raw = await callOpenAIJSON(p.apiKey, choice.model, prompt, imageDocs);
  }

  const parsed = safeParseJSON(raw);
  if (!parsed || !Array.isArray(parsed.rows) || !Array.isArray(parsed.columns)) {
    throw new Error("AI did not return valid extraction JSON.");
  }
  // If caller supplied a fixed column schema, keep it verbatim (preserves format
  // metadata used by the results table); otherwise fall back to what the AI
  // returned (dynamic "start from scratch" extractions).
  const columns: ProtocolColumn[] = p.columns.length
    ? p.columns
    : (parsed.columns as Array<{ key: string; label: string }>).map((c) => ({
        key: String(c.key),
        label: String(c.label),
      }));
  const rows: Record<string, string>[] = (parsed.rows as Array<Record<string, unknown>>).map((r) => {
    const out: Record<string, string> = {};
    for (const col of columns) {
      const v = r?.[col.key];
      out[col.key] = v == null ? "" : String(v);
    }
    return out;
  });
  return { columns, rows };
}

type ImgDoc = { name: string; image?: { data: string; mediaType: string } };

async function callAnthropicJSON(
  apiKey: string,
  model: string,
  prompt: string,
  images: ImgDoc[],
): Promise<string> {
  const content: unknown[] = [];
  for (const d of images) {
    if (!d.image) continue;
    content.push({
      type: "image",
      source: { type: "base64", media_type: d.image.mediaType, data: d.image.data },
    });
  }
  content.push({ type: "text", text: prompt });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("Empty Anthropic response");
  return text;
}

async function callOpenAIJSON(
  apiKey: string,
  model: string,
  prompt: string,
  images: ImgDoc[],
): Promise<string> {
  const content: unknown[] = [{ type: "text", text: prompt }];
  for (const d of images) {
    if (!d.image) continue;
    content.push({
      type: "image_url",
      image_url: { url: `data:${d.image.mediaType};base64,${d.image.data}` },
    });
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Empty OpenAI response");
  return text;
}

async function callGeminiJSON(
  apiKey: string,
  model: string,
  prompt: string,
  images: ImgDoc[],
): Promise<string> {
  const parts: unknown[] = [{ text: prompt }];
  for (const d of images) {
    if (!d.image) continue;
    parts.push({
      inline_data: { mime_type: d.image.mediaType, data: d.image.data },
    });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p?.text ?? "")
    .join("");
  if (typeof text !== "string" || !text) throw new Error("Empty Google response");
  return text;
}

function safeParseJSON(text: string): { columns: unknown[]; rows: unknown[] } | null {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
