import { cn } from "@/lib/utils";
import type { ProviderGroup, ProviderId } from "@/lib/model-catalog";
import { MODEL_GROUPS } from "@/lib/model-catalog";

/**
 * A small monogram badge for AI provider brands (Anthropic / OpenAI / Google).
 * Uses initials + brand accent — no third-party trademarks embedded.
 */
export function ProviderMark({
  provider,
  className,
  size = "sm",
}: {
  provider: ProviderId | ProviderGroup;
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  const group =
    typeof provider === "string"
      ? MODEL_GROUPS.find((g) => g.id === provider)!
      : provider;

  const dim =
    size === "xs" ? "h-4 w-4 text-[9px]" : size === "md" ? "h-6 w-6 text-[11px]" : "h-5 w-5 text-[10px]";

  const initial =
    group.id === "openai"
      ? "O"
      : group.id === "anthropic"
        ? "A"
        : group.id === "google"
          ? "G"
          : "L";

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1",
        dim,
        group.bg,
        group.accent,
        group.ring,
        className,
      )}
    >
      {initial}
    </span>
  );
}
