import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, ExternalLink, Loader2, Quote, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/tools/pubmed")({
  head: () => ({ meta: [{ title: "Medical Literature — Nota Health" }] }),
  component: PubmedToolPage,
});

type Article = {
  pmid: string;
  title: string;
  journal: string;
  year: number | null;
  authors: string[];
  abstract: string;
  url: string;
};

function PubmedToolPage() {
  const { user } = Route.useRouteContext();
  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Clinical Tools · Medical Literature"
        title="Search the published record."
        body="Live from PubMed. Nothing you search is stored."
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <LiteratureSearch />
        <CitationChecker />
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Powered by the free NCBI PubMed API. For clinical review only.
      </p>
    </AppShell>
  );
}

async function runSearch(query: string, limit = 10): Promise<Article[]> {
  const res = await fetch(`/api/tools/pubmed?q=${encodeURIComponent(query)}&limit=${limit}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Search failed");
  return (data.articles as Article[]) ?? [];
}

function LiteratureSearch() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[] | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setArticles(null);
    try {
      setArticles(await runSearch(q.trim(), 10));
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
          <BookOpen className="h-4 w-4 text-primary" /> Literature search
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. GLP-1 agonists heart failure outcomes"
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

        {articles && <ArticleList articles={articles} emptyLabel="No articles matched." />}
      </CardContent>
    </Card>
  );
}

function CitationChecker() {
  const [claim, setClaim] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[] | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!claim.trim()) return;
    setLoading(true);
    setError(null);
    setArticles(null);
    try {
      setArticles(await runSearch(claim.trim(), 12));
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
          <Quote className="h-4 w-4 text-primary" /> Citation checker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCheck} className="space-y-3">
          <Textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Paste a clinical claim to check…"
            className="min-h-[100px]"
          />
          <Button type="submit" disabled={loading || !claim.trim()} className="w-full">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Find related evidence
          </Button>
        </form>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {articles && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-muted-foreground">
              Related studies from PubMed. Read the abstracts to see whether each supports or
              challenges the claim.
            </p>
            <ArticleList articles={articles} emptyLabel="No related studies found." />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ArticleList({ articles, emptyLabel }: { articles: Article[]; emptyLabel: string }) {
  if (articles.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="mt-4 space-y-4">
      {articles.map((a) => (
        <li key={a.pmid} className="rounded-md border border-border p-3">
          <a
            href={a.url}
            target="_top"
            rel="external"
            onClick={(e) => {
              if (window.top === window.self) return;
              e.preventDefault();
              window.top.location.href = a.url;
            }}
            className="group inline-flex items-start gap-1.5 font-medium text-foreground hover:text-primary"
          >
            <span className="line-clamp-2 text-[0.95rem] leading-snug">{a.title}</span>
            <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
          </a>
          <div className="mt-1 text-xs text-muted-foreground">
            {a.journal}
            {a.year ? ` · ${a.year}` : ""}
            {a.authors.length > 0
              ? ` · ${a.authors.slice(0, 3).join(", ")}${a.authors.length > 3 ? ", et al." : ""}`
              : ""}
          </div>
          {a.abstract && (
            <p className="mt-2 line-clamp-3 text-[0.85rem] leading-relaxed text-foreground/80">
              {a.abstract}
            </p>
          )}
          <div className="mt-2 text-[0.68rem] uppercase tracking-wider text-muted-foreground/60">
            PMID {a.pmid}
          </div>
        </li>
      ))}
    </ul>
  );
}
