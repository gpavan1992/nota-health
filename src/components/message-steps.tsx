import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Loader2, AlertTriangle, Search, Brain, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepKind = "read" | "thought" | "search" | "answer";
export type StepStatus = "ok" | "warn" | "error" | "running";

export type ChatStep = {
  kind: StepKind;
  label: string;
  detail?: string;
  status?: StepStatus;
};

function StepIcon({ kind, status }: { kind: StepKind; status?: StepStatus }) {
  if (status === "running") return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  if (status === "warn") return <AlertTriangle className="h-3.5 w-3.5 text-warning-foreground" />;
  if (kind === "read") return <FileText className="h-3.5 w-3.5 text-primary" />;
  if (kind === "thought") return <Brain className="h-3.5 w-3.5 text-muted-foreground" />;
  if (kind === "search") return <Search className="h-3.5 w-3.5 text-muted-foreground" />;
  return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
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
    <div className="mb-3 rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-foreground/80 hover:bg-muted/50"
      >
        <span className="flex items-center gap-2">
          {running && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          {label}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ol className="border-t border-border/60 px-3 py-2">
          {steps.map((s, i) => {
            const canExpand = !!s.detail;
            const expanded = expandedIdx === i;
            return (
              <li key={i} className="relative flex gap-3 py-1.5">
                <div className="relative flex flex-col items-center">
                  <div className="flex h-4 w-4 items-center justify-center">
                    <StepIcon kind={s.kind} status={s.status} />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="mt-0.5 h-full w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <button
                    type="button"
                    disabled={!canExpand}
                    onClick={() => canExpand && setExpandedIdx(expanded ? null : i)}
                    className={cn(
                      "flex w-full items-center gap-1 text-left text-xs text-foreground/80",
                      canExpand && "hover:text-foreground",
                    )}
                  >
                    <span className="truncate">{s.label}</span>
                    {canExpand && (
                      <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", expanded && "rotate-90")} />
                    )}
                  </button>
                  {expanded && s.detail && (
                    <div className="mt-1 whitespace-pre-wrap rounded-md bg-background/60 px-2 py-1.5 text-[0.72rem] leading-relaxed text-muted-foreground">
                      {s.detail}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
