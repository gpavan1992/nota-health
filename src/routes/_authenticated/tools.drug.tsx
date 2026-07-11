import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pill, Plus, Search, X, AlertTriangle, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tools/drug")({
  head: () => ({ meta: [{ title: "Drug Database — Nota Health" }] }),
  component: DrugToolPage,
});

type DrugInfo = {
  brand_name: string | null;
  generic_name: string | null;
  manufacturer: string | null;
  route: string | null;
  indications: string | null;
  dosage: string | null;
  warnings: string | null;
  contraindications: string | null;
  adverse_reactions: string | null;
  drug_interactions: string | null;
};

type Interaction = {
  a: string;
  b: string;
  severity: "Major" | "Moderate" | "Minor";
  snippet: string;
  source: string;
};

function DrugToolPage() {
  const { user } = Route.useRouteContext();
  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Clinical Tools · Drug Database"
        title="Look up any medication."
        body="Live from the FDA's structured drug labels. No data leaves your session."
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DrugLookup />
        <InteractionChecker />
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Powered by the free openFDA drug label API. For clinical review only. Not a substitute for
        professional medical judgment.
      </p>
    </AppShell>
  );
}

// --- text normalization helpers -------------------------------------------

function stripLabelNoise(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\(\s*\d+(?:\.\d+)?\s*\)/g, "")
    .replace(/^\d+(?:\.\d+)?\s+[A-Z][A-Z ]{2,}?\s+/, "")
    .trim();
}

// One-line TL;DR: the first useful sentence, trimmed.
function firstSentence(raw: string | null | undefined, max = 180): string | null {
  if (!raw) return null;
  const clean = stripLabelNoise(raw);
  const m = clean.match(/^(.{20,}?[.!?])(\s|$)/);
  const s = (m?.[1] ?? clean).trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

// Pull short, high-signal keywords out of a warnings/contraindications blob.
const KEYWORDS = [
  "pregnancy", "lactation", "renal impairment", "hepatic impairment",
  "hypersensitivity", "lactic acidosis", "hypoglycemia", "hyperkalemia",
  "bleeding", "qt prolongation", "pancreatitis", "heart failure",
  "myocardial infarction", "stroke", "seizure", "angioedema",
  "black box", "boxed warning", "children", "elderly", "geriatric",
  "dialysis", "alcohol", "grapefruit",
];
function extractKeywords(raw: string | null | undefined, limit = 6): string[] {
  if (!raw) return [];
  const lower = raw.toLowerCase();
  const hits = new Set<string>();
  for (const k of KEYWORDS) if (lower.includes(k)) hits.add(k);
  return Array.from(hits).slice(0, limit);
}

function DrugLookup() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<DrugInfo | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/tools/drug?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      setInfo(data.results?.[0] ?? null);
      setSearched(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-xl">
          <Pill className="h-4 w-4 text-primary" /> Drug lookup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. metformin, lisinopril, Eliquis"
          />
          <Button type="submit" disabled={loading || !q.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {info && (
          <div className="mt-5 space-y-5">
            {/* header pill */}
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <div className="font-serif text-lg leading-tight text-foreground">
                {info.brand_name ?? info.generic_name ?? "Unnamed"}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {info.generic_name && info.brand_name ? (
                  <span>
                    Generic <span className="text-foreground/80">{info.generic_name.toLowerCase()}</span>
                  </span>
                ) : null}
                {info.route ? (
                  <span>
                    Route <span className="text-foreground/80">{info.route.toLowerCase()}</span>
                  </span>
                ) : null}
                {info.manufacturer ? (
                  <span>
                    Mfr <span className="text-foreground/80">{info.manufacturer}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <ClinicalSection label="Indications" text={info.indications} />
            <ClinicalSection label="Dosage & administration" text={info.dosage} />
            <ClinicalSection label="Warnings" text={info.warnings} tone="warn" />
            <ClinicalSection label="Contraindications" text={info.contraindications} tone="warn" />
            <ClinicalSection label="Common side effects" text={info.adverse_reactions} />
            <ClinicalSection label="Drug interactions" text={info.drug_interactions} tone="warn" />
          </div>
        )}

        {searched && !info && !error && (
          <p className="mt-4 text-sm text-muted-foreground">No drug label found for that name.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ClinicalSection({
  label,
  text,
  tone,
}: {
  label: string;
  text: string | null;
  tone?: "warn";
}) {
  const bullets = useMemo(() => cleanLabelText(text), [text]);
  const [expanded, setExpanded] = useState(false);
  if (bullets.length === 0) return null;

  const visible = expanded ? bullets : bullets.slice(0, 3);
  const canExpand = bullets.length > 3;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "warn" ? "bg-destructive" : "bg-primary",
          )}
        />
        <h4
          className={cn(
            "text-[0.68rem] font-semibold uppercase tracking-[0.14em]",
            tone === "warn" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {label}
        </h4>
      </div>
      <ul className="space-y-1.5 pl-3.5">
        {visible.map((b, i) => (
          <li
            key={i}
            className="relative text-[0.9rem] leading-relaxed text-foreground/90 before:absolute before:-left-3.5 before:top-[0.6em] before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground/50"
          >
            {b}
          </li>
        ))}
      </ul>
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {expanded ? "Show less" : `Show ${bullets.length - 3} more`}
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </section>
  );
}

function InteractionChecker() {
  const [drug, setDrug] = useState("");
  const [drugs, setDrugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<Interaction[] | null>(null);
  const [resolved, setResolved] = useState<Array<{ input: string; label_found: boolean }>>([]);

  function addDrug(nameArg?: string): string[] {
    const v = (nameArg ?? drug).trim();
    if (!v) return drugs;
    if (drugs.length >= 8) return drugs;
    if (drugs.some((d) => d.toLowerCase() === v.toLowerCase())) {
      setDrug("");
      return drugs;
    }
    const next = [...drugs, v];
    setDrugs(next);
    setDrug("");
    return next;
  }
  function removeDrug(name: string) {
    setDrugs((prev) => prev.filter((d) => d !== name));
  }

  async function checkNow() {
    // Auto-add whatever's in the input so a doctor doesn't have to press + first.
    const list = drug.trim() ? addDrug() : drugs;
    if (list.length < 2) return;
    setLoading(true);
    setError(null);
    setInteractions(null);
    try {
      const res = await fetch(`/api/tools/interactions?drugs=${encodeURIComponent(list.join(","))}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Check failed");
      setInteractions(data.interactions ?? []);
      setResolved(data.resolved ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const effectiveCount = drugs.length + (drug.trim() ? 1 : 0);
  const canCheck = effectiveCount >= 2 && !loading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-xl">
          <AlertTriangle className="h-4 w-4 text-primary" /> Interaction checker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            value={drug}
            onChange={(e) => setDrug(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDrug();
              }
            }}
            placeholder="Add a drug and press Enter"
          />
          <Button type="button" variant="outline" onClick={() => addDrug()} disabled={!drug.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {drugs.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {drugs.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-foreground"
              >
                {d}
                <button
                  type="button"
                  onClick={() => removeDrug(d)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Add at least two medications to screen for documented interactions.
          </p>
        )}

        <Button type="button" className="mt-4 w-full" onClick={checkNow} disabled={!canCheck}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {effectiveCount < 2
            ? `Add ${2 - effectiveCount} more drug${2 - effectiveCount === 1 ? "" : "s"} to check`
            : `Check ${effectiveCount} drugs for interactions`}
        </Button>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {resolved.some((r) => !r.label_found) && (
          <p className="mt-3 text-xs text-muted-foreground">
            No FDA label found for: {resolved.filter((r) => !r.label_found).map((r) => r.input).join(", ")}
          </p>
        )}

        {interactions !== null && (
          <div className="mt-4">
            {interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No documented interactions found across the FDA labels for the drugs entered. This
                does not guarantee safety — consult a pharmacist for clinical decisions.
              </p>
            ) : (
              <ul className="space-y-3">
                {interactions.map((it, i) => (
                  <li key={i} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-foreground">
                        {it.a} <span className="text-muted-foreground">×</span> {it.b}
                      </div>
                      <SeverityBadge severity={it.severity} />
                    </div>
                    <p className="mt-2 text-[0.85rem] leading-relaxed text-muted-foreground line-clamp-4">
                      {it.snippet}
                    </p>
                    <p className="mt-2 text-[0.68rem] uppercase tracking-wider text-muted-foreground/60">
                      Source: {it.source}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeverityBadge({ severity }: { severity: "Major" | "Moderate" | "Minor" }) {
  const dot =
    severity === "Major"
      ? "bg-destructive"
      : severity === "Moderate"
        ? "bg-warning"
        : "bg-muted-foreground";
  return (
    <Badge variant="outline" className="gap-1.5 font-mono text-[10px]">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {severity}
    </Badge>
  );
}
