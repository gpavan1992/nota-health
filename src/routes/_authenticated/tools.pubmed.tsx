import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, ExternalLink, Loader2, Quote, Search, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useProfile } from "@/hooks/use-profile";
import { streamChat, getModelChoice } from "@/lib/chat-stream";

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
  volume: string;
  issue: string;
  doi: string;
  meshTerms: string[];
  keywords: string[];
  url: string;
};

function PubmedToolPage() {
  const { user } = Route.useRouteContext();
  const { data: profile } = useProfile(user.id);
  const [preview, setPreview] = useState<{ article: Article; query: string } | null>(null);

  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Clinical Tools · Medical Literature"
        title="Search the published record."
        body="Live from PubMed. Nothing you search is stored."
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <LiteratureSearch onSelect={(article, query) => setPreview({ article, query })} />
        <CitationChecker onSelect={(article, query) => setPreview({ article, query })} />
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Powered by the free NCBI PubMed API. For clinical review only.
      </p>
      <ArticlePreviewPanel
        state={preview}
        onClose={() => setPreview(null)}
        profile={profile ?? null}
      />
    </AppShell>
  );
}

async function runSearch(query: string, limit = 10): Promise<Article[]> {
  const res = await fetch(`/api/tools/pubmed?q=${encodeURIComponent(query)}&limit=${limit}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Search failed");
  return (data.articles as Article[]) ?? [];
}

function LiteratureSearch({
  onSelect,
}: {
  onSelect: (a: Article, q: string) => void;
}) {
  const [q, setQ] = useState("");
  const [lastQuery, setLastQuery] = useState("");
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
      setLastQuery(q.trim());
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

        {articles && (
          <ArticleList
            articles={articles}
            emptyLabel="No articles matched."
            onSelect={(a) => onSelect(a, lastQuery)}
          />
        )}
      </CardContent>
    </Card>
  );
}

function CitationChecker({
  onSelect,
}: {
  onSelect: (a: Article, q: string) => void;
}) {
  const [claim, setClaim] = useState("");
  const [lastClaim, setLastClaim] = useState("");
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
      setLastClaim(claim.trim());
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
            <ArticleList
              articles={articles}
              emptyLabel="No related studies found."
              onSelect={(a) => onSelect(a, lastClaim)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PubMedLinkNotice() {
  return (
    <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      PubMed links may be blocked in some regions (India, corporate networks). If the link does
      not open, search the article title on Google Scholar or europepmc.org.
    </div>
  );
}

function ArticleList({
  articles,
  emptyLabel,
  onSelect,
}: {
  articles: Article[];
  emptyLabel: string;
  onSelect: (a: Article) => void;
}) {
  if (articles.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="mt-4 space-y-4">
      <PubMedLinkNotice />
      <ul className="space-y-4">
        {articles.map((a) => (
          <li key={a.pmid}>
            <button
              type="button"
              onClick={() => onSelect(a)}
              className="w-full rounded-md border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-start gap-1.5 font-medium text-foreground">
                <span className="line-clamp-2 text-[0.95rem] leading-snug">{a.title}</span>
              </div>
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
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ProfileLike = {
  ai_model?: string | null;
  google_api_key?: string | null;
  openai_api_key?: string | null;
  anthropic_api_key?: string | null;
} | null;

function pickApiKey(profile: ProfileLike): { apiKey: string; modelId: string } | null {
  if (!profile) return null;
  const savedModel = profile.ai_model ?? null;
  const has = {
    google: !!profile.google_api_key,
    openai: !!profile.openai_api_key,
    anthropic: !!profile.anthropic_api_key,
  } as const;
  const savedProvider = savedModel ? getModelChoice(savedModel).provider : null;
  const provider =
    savedProvider && has[savedProvider as keyof typeof has]
      ? (savedProvider as keyof typeof has)
      : has.google
        ? "google"
        : has.openai
          ? "openai"
          : has.anthropic
            ? "anthropic"
            : null;
  if (!provider) return null;
  const modelId =
    savedProvider === provider && savedModel
      ? savedModel
      : provider === "google"
        ? "gemini-2-5-flash"
        : provider === "openai"
          ? "gpt-5-5"
          : "claude-fable-5";
  const apiKey =
    provider === "google"
      ? profile.google_api_key ?? ""
      : provider === "openai"
        ? profile.openai_api_key ?? ""
        : profile.anthropic_api_key ?? "";
  if (!apiKey) return null;
  return { apiKey, modelId };
}

function ArticlePreviewPanel({
  state,
  onClose,
  profile,
}: {
  state: { article: Article; query: string } | null;
  onClose: () => void;
  profile: ProfileLike;
}) {
  const open = !!state;
  const article = state?.article ?? null;
  const query = state?.query ?? "";
  const [takeaway, setTakeaway] = useState("");
  const [takeawayLoading, setTakeawayLoading] = useState(false);
  const [takeawayError, setTakeawayError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const creds = pickApiKey(profile);

  useEffect(() => {
    abortRef.current?.abort();
    setTakeaway("");
    setTakeawayError(null);
    if (!article || !creds || !article.abstract) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setTakeawayLoading(true);
    const prompt = `Search context: "${query || "clinical relevance"}"

Article title: ${article.title}
Journal: ${article.journal}${article.year ? ` (${article.year})` : ""}
Abstract:
${article.abstract}

In ONE sentence (max 40 words), explain why this article is clinically relevant to the search context. Plain text only, no preamble, no disclaimer.`;
    let acc = "";
    streamChat({
      apiKey: creds.apiKey,
      modelId: creds.modelId,
      messages: [{ role: "user", content: prompt }],
      signal: controller.signal,
      onToken: (t) => {
        acc += t;
        setTakeaway(acc.replace(/\n+For clinical review only[\s\S]*$/i, "").trim());
      },
    })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setTakeawayError((err as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setTakeawayLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.pmid]);

  const tags = article
    ? Array.from(new Set([...(article.meshTerms ?? []), ...(article.keywords ?? [])])).slice(0, 12)
    : [];
  const pubmedHref = article ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/` : "#";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-none md:w-2/5 md:min-w-[420px]"
      >
        {article && (
          <>
            <div className="border-b border-border/60 px-6 pb-4 pt-6">
              <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Article preview
              </div>
              <h2 className="mt-2 font-serif text-xl leading-snug text-foreground">
                {article.title}
              </h2>
              <div className="mt-3 text-sm text-muted-foreground">
                {article.journal}
                {article.year ? ` · ${article.year}` : ""}
                {article.volume ? ` · Vol. ${article.volume}` : ""}
                {article.issue ? ` (${article.issue})` : ""}
              </div>
              {article.authors.length > 0 && (
                <div className="mt-2 text-sm text-foreground/80">
                  {article.authors.join(", ")}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">
                  PMID <span className="font-mono text-foreground">{article.pmid}</span>
                </span>
                {article.doi && (
                  <span className="text-muted-foreground">
                    DOI <span className="font-mono text-foreground">{article.doi}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-6 px-6 py-5">
              {(takeaway || takeawayLoading) && creds && (
                <section className="rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wider text-primary">
                    <Sparkles className="h-3.5 w-3.5" /> Key takeaway
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    {takeaway || (takeawayLoading ? "Generating…" : "")}
                    {takeawayLoading && takeaway && (
                      <Loader2 className="ml-1 inline h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                  </p>
                  {takeawayError && (
                    <p className="mt-2 text-xs text-destructive">{takeawayError}</p>
                  )}
                </section>
              )}

              <section>
                <h3 className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  Abstract
                </h3>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {article.abstract || "No abstract available."}
                </div>
              </section>

              {tags.length > 0 && (
                <section>
                  <h3 className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    Tags
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[0.7rem] text-foreground/80"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="border-t border-border/60 bg-background px-6 py-4">
              <Button asChild className="w-full">
                <a href={pubmedHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Open full paper
                </a>
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                PubMed may be blocked in some regions. Try europepmc.org if the link does not open.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
