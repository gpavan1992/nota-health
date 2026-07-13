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
  const abstracts = await fetchAbstracts(ids).catch(() => new Map<string, ArticleDetails>());

  const articles: Article[] = ids.map((id) => {
    const rec = (result[id] as Record<string, unknown>) ?? {};
    const authors = ((rec.authors as Array<{ name?: string }>) ?? [])
      .map((a) => a?.name)
      .filter(Boolean) as string[];
    const details = abstracts.get(id) ?? {
      abstract: "",
      volume: "",
      issue: "",
      doi: "",
      meshTerms: [] as string[],
      keywords: [] as string[],
    };
    const articleIds = (rec.articleids as Array<{ idtype?: string; value?: string }>) ?? [];
    const doiFromSummary =
      articleIds.find((x) => x?.idtype?.toLowerCase() === "doi")?.value ?? "";
    return {
      pmid: id,
      title: (rec.title as string) ?? "",
      journal: (rec.fulljournalname as string) ?? (rec.source as string) ?? "",
      year: parseYear(rec.pubdate as string | undefined),
      authors,
      abstract: details.abstract,
      volume: details.volume || ((rec.volume as string) ?? ""),
      issue: details.issue || ((rec.issue as string) ?? ""),
      doi: details.doi || doiFromSummary,
      meshTerms: details.meshTerms,
      keywords: details.keywords,
      url: buildPubmedArticleUrl(id),
    };
  });

  return { ids, articles };
}

type ArticleDetails = {
  abstract: string;
  volume: string;
  issue: string;
  doi: string;
  meshTerms: string[];
  keywords: string[];
};

async function fetchAbstracts(ids: string[]): Promise<Map<string, ArticleDetails>> {
  const url = `${EUTILS}/efetch.fcgi?db=pubmed&rettype=abstract&retmode=xml&id=${ids.join(",")}`;
  const res = await fetch(url, { headers: { accept: "application/xml" } });
  if (!res.ok) return new Map();
  const xml = await res.text();
  const map = new Map<string, ArticleDetails>();
  const articleRe = /<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g;
  const pmidRe = /<PMID[^>]*>(\d+)<\/PMID>/;
  const absRe = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
  const volRe = /<Volume>([\s\S]*?)<\/Volume>/;
  const issueRe = /<Issue>([\s\S]*?)<\/Issue>/;
  const doiRe = /<ArticleId IdType="doi"[^>]*>([\s\S]*?)<\/ArticleId>/i;
  const meshRe = /<DescriptorName[^>]*>([\s\S]*?)<\/DescriptorName>/g;
  const kwRe = /<Keyword[^>]*>([\s\S]*?)<\/Keyword>/g;
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
    const meshTerms: string[] = [];
    while ((m = meshRe.exec(block)) !== null) {
      meshTerms.push(decodeEntities(stripTags(m[1])).trim());
    }
    const keywords: string[] = [];
    while ((m = kwRe.exec(block)) !== null) {
      const t = decodeEntities(stripTags(m[1])).trim();
      if (t) keywords.push(t);
    }
    map.set(pmid, {
      abstract: combined,
      volume: volRe.exec(block)?.[1]?.trim() ?? "",
      issue: issueRe.exec(block)?.[1]?.trim() ?? "",
      doi: doiRe.exec(block)?.[1]?.trim() ?? "",
      meshTerms,
      keywords,
    });
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

function buildPubmedArticleUrl(pmid: string) {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}

async function sourceView(pmid: string) {
  if (!/^\d+$/.test(pmid)) return new Response("Invalid PMID", { status: 400 });
  const abstractUrl = `${EUTILS}/efetch.fcgi?db=pubmed&rettype=abstract&retmode=text&id=${pmid}`;
  const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  const res = await fetch(abstractUrl, { headers: { accept: "text/plain" } });
  if (!res.ok) return new Response("Unable to load PubMed source", { status: 502 });
  const text = (await res.text()).trim() || `No abstract text returned for PMID ${pmid}.`;
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PMID ${pmid} — PubMed Source</title>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #111827; }
    main { max-width: 880px; margin: 0 auto; padding: 32px 20px 56px; }
    a { color: #0f766e; font-weight: 650; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; border: 1px solid #d1d5db; background: #ffffff; padding: 20px; line-height: 1.55; font-size: 15px; }
    .meta { margin-bottom: 16px; color: #4b5563; }
  </style>
</head>
<body>
  <main>
    <h1>PMID ${pmid}</h1>
    <p class="meta">Official NCBI/PubMed abstract source. Direct PubMed page: <a href="${pubmedUrl}" target="_blank" rel="noopener noreferrer">${pubmedUrl}</a></p>
    <pre>${escapeHtml(text)}</pre>
  </main>
</body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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


export const Route = createFileRoute("/api/tools/pubmed")({
  // @ts-expect-error - server handlers typing not exposed in this TanStack version
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const source = (url.searchParams.get("source") ?? "").trim();
        if (source) return sourceView(source);
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
