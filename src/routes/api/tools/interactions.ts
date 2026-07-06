import { createFileRoute } from "@tanstack/react-router";

// Best-effort interaction check using openFDA drug labels. For each pair,
// we look inside each drug's `drug_interactions` label section for a mention
// of the other drug's brand or generic name. Severity is a heuristic based on
// language commonly used in FDA labels (contraindicated / avoid / warning).

type LabelDoc = {
  drug_interactions?: string[];
  warnings?: string[];
  contraindications?: string[];
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    substance_name?: string[];
  };
};

async function fetchLabel(name: string): Promise<LabelDoc | null> {
  const escaped = name.replace(/["\\]/g, "");
  const search = `(openfda.brand_name:"${escaped}"+openfda.generic_name:"${escaped}"+openfda.substance_name:"${escaped}")`;
  const api = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(search)}&limit=1`;
  const res = await fetch(api, { headers: { accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: LabelDoc[] };
  return data.results?.[0] ?? null;
}

function nameTokens(label: LabelDoc | null, fallback: string): string[] {
  const set = new Set<string>();
  set.add(fallback.toLowerCase());
  const of = label?.openfda ?? {};
  for (const list of [of.brand_name, of.generic_name, of.substance_name]) {
    for (const v of list ?? []) if (v) set.add(v.toLowerCase());
  }
  return Array.from(set).filter((n) => n.length > 2);
}

function findMatch(sections: string[] | undefined, tokens: string[]): string | null {
  if (!sections?.length) return null;
  const text = sections.join("\n\n");
  const lower = text.toLowerCase();
  for (const t of tokens) {
    const idx = lower.indexOf(t);
    if (idx !== -1) {
      const start = Math.max(0, idx - 120);
      const end = Math.min(text.length, idx + 240);
      return text.slice(start, end).trim();
    }
  }
  return null;
}

function severity(snippet: string): "Major" | "Moderate" | "Minor" {
  const s = snippet.toLowerCase();
  if (
    s.includes("contraindicat") ||
    s.includes("do not ") ||
    s.includes("must not ") ||
    s.includes("avoid ") ||
    s.includes("fatal") ||
    s.includes("life-threatening") ||
    s.includes("black box")
  ) {
    return "Major";
  }
  if (
    s.includes("caution") ||
    s.includes("monitor") ||
    s.includes("adjust") ||
    s.includes("reduce dose") ||
    s.includes("warning")
  ) {
    return "Moderate";
  }
  return "Minor";
}

export const Route = createFileRoute("/api/tools/interactions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = (url.searchParams.get("drugs") ?? "").trim();
        const drugs = raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 8);
        if (drugs.length < 2) {
          return Response.json({ error: "Provide at least two drug names" }, { status: 400 });
        }

        const labels = await Promise.all(drugs.map((d) => fetchLabel(d).catch(() => null)));
        const tokens = labels.map((l, i) => nameTokens(l, drugs[i]));

        const interactions: Array<{
          a: string;
          b: string;
          severity: "Major" | "Moderate" | "Minor";
          snippet: string;
          source: "openFDA label";
        }> = [];
        const seen = new Set<string>();

        for (let i = 0; i < drugs.length; i++) {
          for (let j = i + 1; j < drugs.length; j++) {
            const key = `${drugs[i]}|${drugs[j]}`.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);

            const labelA = labels[i];
            const labelB = labels[j];
            const matchInA = findMatch(
              [
                ...(labelA?.drug_interactions ?? []),
                ...(labelA?.contraindications ?? []),
                ...(labelA?.warnings ?? []),
              ],
              tokens[j],
            );
            const matchInB = findMatch(
              [
                ...(labelB?.drug_interactions ?? []),
                ...(labelB?.contraindications ?? []),
                ...(labelB?.warnings ?? []),
              ],
              tokens[i],
            );
            const snippet = matchInA ?? matchInB;
            if (!snippet) continue;

            interactions.push({
              a: drugs[i],
              b: drugs[j],
              severity: severity(snippet),
              snippet,
              source: "openFDA label",
            });
          }
        }

        return Response.json({
          drugs,
          resolved: drugs.map((d, i) => ({ input: d, label_found: !!labels[i] })),
          interactions,
        });
      },
    },
  },
});
