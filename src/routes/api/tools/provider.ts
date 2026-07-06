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

        const params = new URLSearchParams({ version: "2.1", limit: "20" });
        if (npi) {
          params.set("number", npi);
        } else if (last) {
          params.set("last_name", last);
          if (first) params.set("first_name", first);
          if (state) params.set("state", state);
        } else {
          return Response.json(
            { error: "Provide an NPI number, or a last name (state optional)." },
            { status: 400 },
          );
        }

        try {
          const res = await fetch(`${NPI_API}?${params.toString()}`, {
            headers: { accept: "application/json" },
          });
          if (!res.ok) return Response.json({ error: `NPI ${res.status}` }, { status: 502 });
          const data = (await res.json()) as { results?: NpiResult[] };

          const results = (data.results ?? []).map((r) => {
            const tax = (r.taxonomies ?? []).find((t) => t.primary) ?? r.taxonomies?.[0];
            const loc =
              (r.addresses ?? []).find((a) => a.address_purpose === "LOCATION") ??
              r.addresses?.[0];
            const basic = r.basic ?? {};
            const isOrg = r.enumeration_type === "NPI-2";
            const name = isOrg
              ? basic.organization_name ?? ""
              : [basic.first_name, basic.middle_name, basic.last_name]
                  .filter(Boolean)
                  .join(" ");
            return {
              npi: r.number,
              type: isOrg ? "Organization" : "Individual",
              name,
              credential: basic.credential ?? null,
              status: basic.status ?? null,
              enumerated: basic.enumeration_date ?? null,
              specialty: tax?.desc ?? null,
              license: tax?.license ?? null,
              license_state: tax?.state ?? null,
              address: loc
                ? [loc.address_1, loc.address_2].filter(Boolean).join(", ")
                : null,
              city: loc?.city ?? null,
              state_code: loc?.state ?? null,
              postal: loc?.postal_code ?? null,
              phone: loc?.telephone_number ?? null,
            };
          });

          return Response.json({ results });
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
