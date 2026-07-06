import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pill, Plus, Search, X, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <div className="font-serif text-lg text-foreground">
                {info.brand_name ?? info.generic_name ?? "Unnamed"}
              </div>
              <div className="text-xs text-muted-foreground">
                {info.generic_name && info.brand_name ? `generic: ${info.generic_name}` : null}
                {info.route ? ` · route: ${info.route.toLowerCase()}` : null}
                {info.manufacturer ? ` · ${info.manufacturer}` : null}
              </div>
            </div>
            <Section label="What it treats" text={info.indications} />
            <Section label="Dosage and administration" text={info.dosage} />
            <Section label="Warnings" text={info.warnings} tone="warn" />
            <Section label="Contraindications" text={info.contraindications} tone="warn" />
            <Section label="Side effects" text={info.adverse_reactions} />
          </div>
        )}

        {searched && !info && !error && (
          <p className="mt-4 text-sm text-muted-foreground">No drug label found for that name.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  label,
  text,
  tone,
}: {
  label: string;
  text: string | null;
  tone?: "warn";
}) {
  if (!text) return null;
  return (
    <div>
      <div
        className={`text-[0.68rem] font-medium uppercase tracking-[0.14em] ${
          tone === "warn" ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-[0.9rem] leading-relaxed text-foreground/90 line-clamp-[12]">
        {text}
      </p>
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

  function addDrug() {
    const v = drug.trim();
    if (!v) return;
    if (drugs.length >= 8) return;
    if (drugs.some((d) => d.toLowerCase() === v.toLowerCase())) {
      setDrug("");
      return;
    }
    setDrugs((prev) => [...prev, v]);
    setDrug("");
  }
  function removeDrug(name: string) {
    setDrugs((prev) => prev.filter((d) => d !== name));
  }

  async function checkNow() {
    if (drugs.length < 2) return;
    setLoading(true);
    setError(null);
    setInteractions(null);
    try {
      const res = await fetch(`/api/tools/interactions?drugs=${encodeURIComponent(drugs.join(","))}`);
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
            placeholder="Add a drug (press Enter)"
          />
          <Button type="button" variant="outline" onClick={addDrug}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {drugs.length > 0 && (
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
        )}

        <Button
          type="button"
          className="mt-4 w-full"
          onClick={checkNow}
          disabled={drugs.length < 2 || loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Check interactions
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
