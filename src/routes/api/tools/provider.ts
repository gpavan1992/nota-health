import { createFileRoute } from "@tanstack/react-router";

const NPI_API = "https://npiregistry.cms.hhs.gov/api/";

type NpiAddress = {
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  telephone_number?: string;
  address_purpose?: string;
};

type NpiResult = {
  number: string;
  enumeration_type: string;
  basic?: {
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    credential?: string;
    organization_name?: string;
    status?: string;
    enumeration_date?: string;
  };
  taxonomies?: Array<{
    desc?: string;
    primary?: boolean;
    state?: string;
    license?: string;
  }>;
  addresses?: NpiAddress[];
};

export const Route = createFileRoute("/api/tools/provider")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const npi = (url.searchParams.get("npi") ?? "").trim();
        const first = (url.searchParams.get("first") ?? "").trim();
        const last = (url.searchParams.get("last") ?? "").trim();
        const state = (url.searchParams.get("state") ?? "").trim().toUpperCase();
        const city = (url.searchParams.get("city") ?? "").trim();
        const specialty = (url.searchParams.get("specialty") ?? "").trim();

        const params = new URLSearchParams({ version: "2.1", limit: "50" });
        if (npi) {
          params.set("number", npi);
        } else if (last) {
          if (!state) {
            return Response.json(
              { error: "Please select a state to narrow results." },
              { status: 400 },
            );
          }
          params.set("last_name", last);
          if (first) params.set("first_name", first);
          params.set("state", state);
          if (city) params.set("city", city);
        } else {
          return Response.json(
            { error: "Provide an NPI number, or a last name with state." },
            { status: 400 },
          );
        }

        // Map specialty select values to keywords matched against taxonomy desc
        const specialtyKeywords: Record<string, string[]> = {
          Cardiology: ["cardio"],
          "General Medicine": ["family", "internal medicine", "general practice"],
          Orthopaedics: ["orthopaedic", "orthopedic"],
          Neurology: ["neurolog"],
          Paediatrics: ["pediatric", "paediatric"],
          Psychiatry: ["psychiat"],
          Surgery: ["surgery", "surgeon", "surgical"],
          "Obstetrics and Gynaecology": ["obstetric", "gynecolog", "gynaecolog"],
          Radiology: ["radiolog"],
        };

        try {
          const res = await fetch(`${NPI_API}?${params.toString()}`, {
            headers: { accept: "application/json" },
          });
          if (!res.ok) return Response.json({ error: `NPI ${res.status}` }, { status: 502 });
          const data = (await res.json()) as { results?: NpiResult[] };
...
          let filtered = results;
          if (!npi && specialty && specialty !== "Other" && specialtyKeywords[specialty]) {
            const kws = specialtyKeywords[specialty];
            filtered = results.filter((r) =>
              r.specialty ? kws.some((k) => r.specialty!.toLowerCase().includes(k)) : false,
            );
          }

          const totalMatched = filtered.length;
          const capped = npi ? filtered : filtered.slice(0, 10);

          return Response.json({ results: capped, totalMatched, capped: totalMatched > capped.length });
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
