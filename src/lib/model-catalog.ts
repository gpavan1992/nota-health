// Central catalog of AI models grouped by provider brand.
// Used by the Settings > Models tab and the in-chat model picker so
// both surfaces share a single, brand-themed list.

export type ProviderId = "anthropic" | "openai" | "google" | "ollama";

export interface ModelOption {
  /** Value persisted on the profile / used at call time. */
  value: string;
  /** Short display label shown inside the dropdown. */
  label: string;
  /** Optional one-line hint shown in the settings picker. */
  hint?: string;
  /** Provider-side model id sent to the API. */
  apiModel: string;
}

export interface ProviderGroup {
  id: ProviderId;
  label: string;
  accent: string; // Tailwind text color class for the brand mark
  ring: string; // Tailwind ring color for the brand mark
  bg: string; // Tailwind background color for the brand mark
  models: ModelOption[];
}

export const MODEL_GROUPS: ProviderGroup[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    accent: "text-[#C15F3C]",
    ring: "ring-[#C15F3C]/25",
    bg: "bg-[#C15F3C]/10",
    models: [
      { value: "claude-fable-5", label: "Claude Fable 5", apiModel: "claude-fable-5" },
      { value: "claude-opus-4-8", label: "Claude Opus 4.8", apiModel: "claude-opus-4-8" },
      { value: "claude-opus-4-7", label: "Claude Opus 4.7", apiModel: "claude-opus-4-7" },
      { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", apiModel: "claude-sonnet-4-6" },
      { value: "claude-haiku-4-5", label: "Claude Haiku 4.5", apiModel: "claude-haiku-4-5" },
    ],
  },
  {
    id: "google",
    label: "Google",
    accent: "text-[#4285F4]",
    ring: "ring-[#4285F4]/25",
    bg: "bg-[#4285F4]/10",
    models: [
      { value: "gemini-2-5-pro", label: "Gemini 2.5 Pro", apiModel: "gemini-2.5-pro" },
      { value: "gemini-2-5-flash", label: "Gemini 2.5 Flash", apiModel: "gemini-2.5-flash" },
      { value: "gemini-2-0-flash", label: "Gemini 2.0 Flash", apiModel: "gemini-2.0-flash" },
      { value: "gemini-1-5-flash", label: "Gemini 1.5 Flash", apiModel: "gemini-1.5-flash" },
      { value: "gemini-1-5-pro", label: "Gemini 1.5 Pro", apiModel: "gemini-1.5-pro" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    accent: "text-[#10A37F]",
    ring: "ring-[#10A37F]/25",
    bg: "bg-[#10A37F]/10",
    models: [
      { value: "gpt-5-5", label: "GPT-5.5", apiModel: "gpt-5-5" },
      { value: "gpt-5-4", label: "GPT-5.4", apiModel: "gpt-5-4" },
      { value: "gpt-5-4-lite", label: "GPT-5.4 Lite", apiModel: "gpt-5-4-lite" },
    ],
  },
  {
    id: "ollama",
    label: "Ollama (Local)",
    accent: "text-[#0EA5E9]",
    ring: "ring-[#0EA5E9]/25",
    bg: "bg-[#0EA5E9]/10",
    models: [
      { value: "ollama-llama3-1-8b", label: "Llama 3.1 8B", hint: "Runs locally — PHI stays on device", apiModel: "llama3.1:8b" },
      { value: "ollama-llama3-1-70b", label: "Llama 3.1 70B", hint: "Higher quality, requires GPU", apiModel: "llama3.1:70b" },
      { value: "ollama-meditron-7b", label: "Meditron 7B", hint: "Clinical fine-tune of Llama 2", apiModel: "meditron:7b" },
      { value: "ollama-mistral-7b", label: "Mistral 7B", hint: "Fast general-purpose local model", apiModel: "mistral:7b" },
      { value: "ollama-qwen2-5-7b", label: "Qwen 2.5 7B", hint: "Strong reasoning, local", apiModel: "qwen2.5:7b" },
    ],
  },
];

export const ALL_MODELS: ModelOption[] = MODEL_GROUPS.flatMap((g) => g.models);

export function findModel(value: string): { model: ModelOption; group: ProviderGroup } | null {
  for (const g of MODEL_GROUPS) {
    const m = g.models.find((m) => m.value === value);
    if (m) return { model: m, group: g };
  }
  return null;
}

export function providerFor(value: string): ProviderId | null {
  return findModel(value)?.group.id ?? null;
}
