// Single-shot text completion using the user's own API key.
// Reuses the same provider routing as chat-stream/run-extraction.

import { getModelChoice } from "./chat-stream";

export async function callProviderText(
  apiKey: string,
  modelId: string,
  prompt: string,
): Promise<string> {
  const choice = getModelChoice(modelId);
  if (choice.provider === "anthropic") return anthropicText(apiKey, choice.model, prompt);
  if (choice.provider === "openai") return openaiText(apiKey, choice.model, prompt);
  return geminiText(apiKey, choice.model, prompt);
}

async function anthropicText(apiKey: string, model: string, prompt: string): Promise<string> {
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
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("Empty Anthropic response");
  return text.trim();
}

async function openaiText(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Empty OpenAI response");
  return text.trim();
}

async function geminiText(apiKey: string, model: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p?.text ?? "")
    .join("");
  if (typeof text !== "string" || !text) throw new Error("Empty Google response");
  return text.trim();
}

/**
 * Returns the user's saved API key matching the currently-selected model, or
 * null if not configured.
 */
export function keyForModel(
  modelId: string,
  profile: {
    anthropic_api_key?: string | null;
    openai_api_key?: string | null;
    google_api_key?: string | null;
  } | null | undefined,
): string | null {
  if (!profile) return null;
  const choice = getModelChoice(modelId);
  const key =
    choice.provider === "anthropic"
      ? profile.anthropic_api_key
      : choice.provider === "openai"
        ? profile.openai_api_key
        : profile.google_api_key;
  return key && key.trim() ? key : null;
}
