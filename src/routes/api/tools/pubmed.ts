import { createFileRoute } from "@tanstack/react-router";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

type ESearchResp = { esearchresult?: { idlist?: string[] } };
type ESummaryResp = {
  result?: Record<string, unknown> & { uids?: string[] };
};

async function searchPubmed(query: string, limit: number) {
  const searchUrl = `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${limit}&term=${encodeURIComponent(
    query,
  )}`;
  const searchRes = await fetch(searchUrl, { headers: { accept: "application/json" } });
  if (!searchRes.ok) throw new Error(`PubMed search ${searchRes.status}`);
  const searchJson = (await searchRes.json()) as ESearchResp;
  const ids = searchJson.esearchresult?.idlist ?? [];
  if (ids.length === 0) return { ids: [], articles: [] as Article[] };

  const sumUrl = `${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`;
  const sumRes = await fetch(sumUrl, { headers: { accept: "application/json" } });
  if (!sumRes.ok) throw new Error(`PubMed summary ${sumRes.status}`);
  const sumJson = (await sumRes.json()) as ESummaryResp;
  const result = sumJson.result ?? {};

  // Try to get abstracts in bulk via efetch.
  const abstracts = await fetchAbstracts(ids).catch(() => new Map<string, string>());

  const articles: Article[] = ids.map((id) => {
    const rec = (result[id] as Record<string, unknown>) ?? {};
    const authors = ((rec.authors as Array<{ name?: string }>) ?? [])
      .map((a) => a?.name)
      .filter(Boolean) as string[];
    return {
      pmid: id,
      title: (rec.title as string) ?? "",
      journal: (rec.fulljournalname as string) ?? (rec.source as string) ?? "",
      year: parseYear(rec.pubdate as string | undefined),
      authors,
      abstract: abstracts.get(id) ?? "",
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    };
  });

  return { ids, articles };
}

async function fetchAbstracts(ids: string[]): Promise<Map<string, string>> {
  const url = `${EUTILS}/efetch.fcgi?db=pubmed&rettype=abstract&retmode=xml&id=${ids.join(",")}`;
  const res = await fetch(url, { headers: { accept: "application/xml" } });
  if (!res.ok) return new Map();
  const xml = await res.text();
  const map = new Map<string, string>();
  const articleRe = /<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g;
  const pmidRe = /<PMID[^>]*>(\d+)<\/PMID>/;
  const absRe = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
  const matches = xml.match(articleRe) ?? [];
  for (const block of matches) {
    const pmidM = pmidRe.exec(block);
    if (!pmidM) continue;
    const pmid = pmidM[1];
    let combined = "";
    let m: RegExpExecArray | null;
    while ((m = absRe.exec(block)) !== null) {
      combined += (combined ? "\n\n" : "") + decodeEntities(stripTags(m[1]));
    }
    map.set(pmid, combined);
  }
  return map;
}

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, "");
}
function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
function parseYear(v: string | undefined): number | null {
  if (!v) return null;
  const m = /\d{4}/.exec(v);
  return m ? parseInt(m[0], 10) : null;
}

type Article = {
  pmid: string;
  title: string;
  journal: string;
  year: number | null;
  authors: string[];
  abstract: string;
  url: string;
};

export const Route = createFileRoute("/api/tools/pubmed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") ?? 10)));
        if (!q) return Response.json({ error: "Missing query" }, { status: 400 });
        try {
          const data = await searchPubmed(q, limit);
          return Response.json(data);
        } catch (err) {
          return Response.json(
            { error: (err as Error).message ?? "Upstream failure" },
            { status: 502 },
          );
        }
      },
    },
  },
});
