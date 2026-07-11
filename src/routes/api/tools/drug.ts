import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tools/drug")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        if (!q) return Response.json({ error: "Missing query" }, { status: 400 });

        const escaped = q.replace(/["\\]/g, "");
        const search = `(openfda.brand_name:"${escaped}"+OR+openfda.generic_name:"${escaped}"+OR+openfda.substance_name:"${escaped}")`;
        const api = `https://api.fda.gov/drug/label.json?search=${search}&limit=1`;
        try {
          const res = await fetch(api, { headers: { accept: "application/json" } });
          if (res.status === 404) return Response.json({ results: [] });
          if (!res.ok) return Response.json({ error: `openFDA ${res.status}` }, { status: 502 });
          const data = (await res.json()) as {
            results?: Array<Record<string, unknown>>;
          };
          const first = data.results?.[0];
          if (!first) return Response.json({ results: [] });

          const get = (k: string): string | undefined => {
            const v = first[k];
            if (Array.isArray(v)) return v.filter(Boolean).join("\n\n");
            if (typeof v === "string") return v;
            return undefined;
          };
          const openfda = (first.openfda ?? {}) as Record<string, string[] | undefined>;

          return Response.json({
            results: [
              {
                brand_name: openfda.brand_name?.[0] ?? null,
                generic_name: openfda.generic_name?.[0] ?? null,
                manufacturer: openfda.manufacturer_name?.[0] ?? null,
                route: openfda.route?.join(", ") ?? null,
                indications: get("indications_and_usage") ?? null,
                dosage: get("dosage_and_administration") ?? null,
                warnings: get("warnings") ?? get("warnings_and_cautions") ?? null,
                contraindications: get("contraindications") ?? null,
                adverse_reactions: get("adverse_reactions") ?? null,
                drug_interactions: get("drug_interactions") ?? null,
              },
            ],
          });
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
