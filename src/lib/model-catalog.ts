// Central catalog of AI models grouped by provider brand.
// Used by the Settings > Models tab and the in-chat model picker so
// both surfaces share a single, brand-themed list.

export type ProviderId = "anthropic" | "openai" | "google";

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
      {
        value: "claude-sonnet-4-5",
        label: "Claude Sonnet 4.5",
        hint: "Best clinical reasoning",
        apiModel: "claude-sonnet-4-5",
      },
      {
        value: "claude-haiku-4-5",
        label: "Claude Haiku 4.5",
        hint: "Fast, low cost",
        apiModel: "claude-haiku-4-5",
      },
      {
        value: "claude-3-5-sonnet-latest",
        label: "Claude 3.5 Sonnet",
        hint: "Long-form reasoning",
        apiModel: "claude-3-5-sonnet-latest",
      },
      {
        value: "claude-3-5-haiku-latest",
        label: "Claude 3.5 Haiku",
        hint: "Economical",
        apiModel: "claude-3-5-haiku-latest",
      },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    accent: "text-[#10A37F]",
    ring: "ring-[#10A37F]/25",
    bg: "bg-[#10A37F]/10",
    models: [
      { value: "gpt-4o", label: "GPT-4o", hint: "Strong general model", apiModel: "gpt-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini", hint: "Economical", apiModel: "gpt-4o-mini" },
    ],
  },
  {
    id: "google",
    label: "Google Gemini",
    accent: "text-[#4285F4]",
    ring: "ring-[#4285F4]/25",
    bg: "bg-[#4285F4]/10",
    models: [
      {
        value: "gemini-1.5-pro",
        label: "Gemini 1.5 Pro",
        hint: "Long context",
        apiModel: "gemini-1.5-pro",
      },
      {
        value: "gemini-1.5-flash",
        label: "Gemini 1.5 Flash",
        hint: "Fastest",
        apiModel: "gemini-1.5-flash",
      },
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
