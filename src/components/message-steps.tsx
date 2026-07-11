import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepKind = "read" | "thought" | "search" | "answer";
export type StepStatus = "ok" | "warn" | "error" | "running";

export type ChatStep = {
  kind: StepKind;
  label: string;
  detail?: string;
  status?: StepStatus;
};

function StepDot({ status }: { status?: StepStatus }) {
  if (status === "running") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
    );
  }
  if (status === "warn") return <span className="h-2 w-2 rounded-full bg-warning" />;
  if (status === "error") return <span className="h-2 w-2 rounded-full bg-destructive" />;
  return <span className="h-2 w-2 rounded-full bg-success" />;
}

export function MessageSteps({
  steps,
  running,
}: {
  steps: ChatStep[];
  running?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  if (!steps || steps.length === 0) return null;

  const label = running
    ? `Working — ${steps.length} step${steps.length === 1 ? "" : "s"}`
    : `Completed in ${steps.length} step${steps.length === 1 ? "" : "s"}`;

  return (
    <div className="mb-3 rounded-xl border border-border bg-card/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium text-foreground/90 hover:bg-muted/40"
      >
        <span className="flex items-center gap-2">
          {running && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
          {label}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="border-t border-border/60 px-4 py-2">
          {steps.map((s, i) => {
            const canExpand = !!s.detail;
            const expanded = expandedIdx === i;
            return (
              <li key={i} className="py-1.5">
                <button
                  type="button"
                  disabled={!canExpand}
                  onClick={() => canExpand && setExpandedIdx(expanded ? null : i)}
                  className={cn(
                    "flex w-full items-center gap-3 text-left text-sm text-foreground/85",
                    canExpand && "hover:text-foreground",
                  )}
                >
                  <StepDot status={s.status} />
                  <span className="truncate">{s.label}</span>
                </button>
                {expanded && s.detail && (
                  <div className="ml-5 mt-1.5 whitespace-pre-wrap rounded-md bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    {s.detail}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
