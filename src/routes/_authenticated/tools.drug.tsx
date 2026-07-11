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

        {info && <DrugGlance info={info} />}

        {searched && !info && !error && (
          <p className="mt-4 text-sm text-muted-foreground">No drug label found for that name.</p>
        )}
      </CardContent>
    </Card>
  );
}

function DrugGlance({ info }: { info: DrugInfo }) {
  const [showFull, setShowFull] = useState(false);

  const indication = firstSentence(info.indications, 160);
  const dose = firstSentence(info.dosage, 140);
  const contraKeys = extractKeywords(info.contraindications);
  const warnKeys = extractKeywords(info.warnings);
  const aeKeys = extractKeywords(info.adverse_reactions);
  const rxKeys = extractKeywords(info.drug_interactions);

  return (
    <div className="mt-5 space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/60 pb-3">
        <h3 className="font-serif text-xl leading-tight text-foreground">
          {info.brand_name ?? info.generic_name ?? "Unnamed"}
        </h3>
        {info.generic_name && info.brand_name && (
          <span className="text-sm text-muted-foreground">{info.generic_name.toLowerCase()}</span>
        )}
        <div className="ml-auto flex flex-wrap gap-1.5">
          {info.route && <MetaPill>{info.route.toLowerCase()}</MetaPill>}
          {info.manufacturer && <MetaPill tone="muted">{info.manufacturer}</MetaPill>}
        </div>
      </div>

      {/* glance grid */}
      <dl className="grid gap-3 sm:grid-cols-2">
        <GlanceRow label="Indication">{indication ?? "—"}</GlanceRow>
        <GlanceRow label="Adult dose">{dose ?? "—"}</GlanceRow>
        <GlanceRow label="Contraindications" tone="warn">
          <KeywordChips items={contraKeys} fallback={info.contraindications} />
        </GlanceRow>
        <GlanceRow label="Key warnings" tone="warn">
          <KeywordChips items={warnKeys} fallback={info.warnings} />
        </GlanceRow>
        <GlanceRow label="Common AEs">
          <KeywordChips items={aeKeys} fallback={info.adverse_reactions} />
        </GlanceRow>
        <GlanceRow label="Interactions" tone="warn">
          <KeywordChips items={rxKeys} fallback={info.drug_interactions} />
        </GlanceRow>
      </dl>

      {/* full label */}
      <button
        type="button"
        onClick={() => setShowFull((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {showFull ? "Hide full FDA label" : "Show full FDA label"}
        <ChevronDown className={cn("h-3 w-3 transition-transform", showFull && "rotate-180")} />
      </button>
      {showFull && (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-[0.8rem] leading-relaxed text-muted-foreground">
          <FullSection label="Indications" text={info.indications} />
          <FullSection label="Dosage" text={info.dosage} />
          <FullSection label="Warnings" text={info.warnings} />
          <FullSection label="Contraindications" text={info.contraindications} />
          <FullSection label="Adverse reactions" text={info.adverse_reactions} />
          <FullSection label="Drug interactions" text={info.drug_interactions} />
        </div>
      )}
    </div>
  );
}

function GlanceRow({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "warn";
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2.5">
      <dt
        className={cn(
          "text-[0.62rem] font-semibold uppercase tracking-[0.14em]",
          tone === "warn" ? "text-destructive/80" : "text-muted-foreground",
        )}
      >
        {label}
      </dt>
      <dd className="mt-1 text-[0.85rem] leading-snug text-foreground/90">{children}</dd>
    </div>
  );
}

function KeywordChips({ items, fallback }: { items: string[]; fallback: string | null }) {
  if (items.length === 0) {
    if (!fallback) return <span className="text-muted-foreground">None documented</span>;
    return <span className="text-muted-foreground">See full label</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((k) => (
        <span
          key={k}
          className="rounded-md bg-muted px-1.5 py-0.5 text-[0.7rem] font-medium capitalize text-foreground/80"
        >
          {k}
        </span>
      ))}
    </div>
  );
}

function MetaPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "muted";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[0.68rem] font-medium",
        tone === "muted"
          ? "border-border/60 bg-muted/40 text-muted-foreground"
          : "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      {children}
    </span>
  );
}

function FullSection({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-foreground/60">
        {label}
      </div>
      <p className="mt-1 whitespace-pre-wrap">{stripLabelNoise(text)}</p>
    </div>
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
