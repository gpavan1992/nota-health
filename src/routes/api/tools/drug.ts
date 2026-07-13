import { createFileRoute } from "@tanstack/react-router";
import { fetchBestLabel, getLabelField } from "@/lib/drug-label";

export const Route = createFileRoute("/api/tools/drug")({
  // @ts-expect-error - server handlers typing not exposed in this TanStack version
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        if (!q) return Response.json({ error: "Missing query" }, { status: 400 });

        try {
          const first = await fetchBestLabel(q);
          if (!first) return Response.json({ results: [] });
          const openfda = first.openfda ?? {};

          return Response.json({
            results: [
              {
                brand_name: openfda.brand_name?.[0] ?? null,
                generic_name: openfda.generic_name?.[0] ?? null,
                manufacturer: openfda.manufacturer_name?.[0] ?? null,
                route: openfda.route?.join(", ") ?? null,
                indications: getLabelField(first, "indications_and_usage") ?? null,
                dosage: getLabelField(first, "dosage_and_administration") ?? null,
                warnings:
                  getLabelField(first, "warnings") ?? getLabelField(first, "warnings_and_cautions") ?? null,
                contraindications: getLabelField(first, "contraindications") ?? null,
                adverse_reactions: getLabelField(first, "adverse_reactions") ?? null,
                drug_interactions: getLabelField(first, "drug_interactions") ?? null,
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
