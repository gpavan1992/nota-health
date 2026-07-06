// Client-side streaming to Anthropic / OpenAI using the user's own API key.
// This is a BYOK flow — the user entered their own key in Settings.

export type ChatRole = "user" | "assistant" | "system";
export interface WireMessage {
  role: ChatRole;
  content: string;
}

export const MODEL_CHOICES = [
  { id: "claude-sonnet", label: "Claude Sonnet (recommended)", provider: "anthropic", model: "claude-sonnet-4-5" },
  { id: "claude-haiku", label: "Claude Haiku", provider: "anthropic", model: "claude-haiku-4-5" },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai", model: "gpt-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai", model: "gpt-4o-mini" },
] as const;

export type ModelId = (typeof MODEL_CHOICES)[number]["id"];

export function getModelChoice(id: string) {
  return MODEL_CHOICES.find((m) => m.id === id) ?? MODEL_CHOICES[0];
}

export const CLINICAL_SYSTEM_PROMPT = `You are Nota Health, a clinical documentation assistant for healthcare professionals.

Answer with clinical precision: cite dosages, ICD codes, drug names, and NPI numbers exactly when present in the source documents. When information is not in the provided documents, say so explicitly rather than guessing.

Format responses in clear prose. Use short paragraphs. When listing findings or medications, use bullet points.

IMPORTANT: End every response with this exact disclaimer on a new line:

For clinical review only. Not a substitute for professional medical judgment.`;

export interface StreamOptions {
  apiKey: string;
  modelId: string;
  messages: WireMessage[];
  onToken: (delta: string) => void;
  signal?: AbortSignal;
}

export async function streamChat({ apiKey, modelId, messages, onToken, signal }: StreamOptions): Promise<void> {
  const choice = getModelChoice(modelId);
  if (choice.provider === "anthropic") {
    return streamAnthropic({ apiKey, model: choice.model, messages, onToken, signal });
  }
  return streamOpenAI({ apiKey, model: choice.model, messages, onToken, signal });
}

async function streamAnthropic({
  apiKey,
  model,
  messages,
  onToken,
  signal,
}: {
  apiKey: string;
  model: string;
  messages: WireMessage[];
  onToken: (t: string) => void;
  signal?: AbortSignal;
}) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    signal,
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      stream: true,
      system: CLINICAL_SYSTEM_PROMPT,
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic error ${res.status}: ${text.slice(0, 300)}`);
  }
  return readSSE(res.body, (evt) => {
    try {
      const data = JSON.parse(evt);
      if (data.type === "content_block_delta" && data.delta?.type === "text_delta") {
        onToken(data.delta.text as string);
      }
    } catch {
      /* ignore */
    }
  });
}

async function streamOpenAI({
  apiKey,
  model,
  messages,
  onToken,
  signal,
}: {
  apiKey: string;
  model: string;
  messages: WireMessage[];
  onToken: (t: string) => void;
  signal?: AbortSignal;
}) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: "system", content: CLINICAL_SYSTEM_PROMPT }, ...messages],
    }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 300)}`);
  }
  return readSSE(res.body, (evt) => {
    if (evt === "[DONE]") return;
    try {
      const data = JSON.parse(evt);
      const delta = data.choices?.[0]?.delta?.content;
      if (typeof delta === "string") onToken(delta);
    } catch {
      /* ignore */
    }
  });
}

async function readSSE(body: ReadableStream<Uint8Array>, onEvent: (data: string) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data:")) onEvent(line.slice(5).trim());
      }
    }
  }
}
