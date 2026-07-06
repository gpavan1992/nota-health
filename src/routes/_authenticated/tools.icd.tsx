import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Hash, Loader2, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/tools/icd")({
  head: () => ({ meta: [{ title: "ICD Code Lookup — Nota Health" }] }),
  component: IcdToolPage,
});

type IcdResult = {
  code: string;
  title: string;
  parent_code: string | null;
  category: string | null;
};

function IcdToolPage() {
  const { user } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<IcdResult[] | null>(null);
  const [system, setSystem] = useState<string>("ICD-10-CM");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(`/api/tools/icd?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      setResults(data.results ?? []);
      if (data.system) setSystem(data.system);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Clinical Tools · ICD Code Lookup"
        title="Find the right code, fast."
        body="Search by condition name or by code. Nothing you search is stored."
      />

      <Card className="mt-8">
        <CardContent className="pt-6">
          <form onSubmit={search} className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. type 2 diabetes, E11.9, atrial fibrillation"
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
        </CardContent>
      </Card>

      {results !== null && (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No codes matched.</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Parent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results.map((r) => (
                      <tr key={r.code}>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="gap-1.5 font-mono text-[11px]">
                            <Hash className="h-3 w-3" />
                            {r.code}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{r.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.category ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.parent_code ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Powered by the free NLM Clinical Tables API ({system}). The WHO ICD-11 API requires
        credentialed access; ICD-10-CM is the current US clinical modification and covers the same
        lookup use case.
      </p>
    </AppShell>
  );
}
