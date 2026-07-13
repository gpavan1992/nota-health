import { createFileRoute } from "@tanstack/react-router";

// The WHO ICD-11 API requires OAuth client credentials. The US National
// Library of Medicine's Clinical Tables service exposes an open, no-auth
// endpoint for ICD-10-CM (the current US clinical modification), which
// covers the same lookup use case with the official code, title, and
// hierarchical parent lineage.

const NLM = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search";

export const Route = createFileRoute("/api/tools/icd")({
  // @ts-expect-error - server handlers typing not exposed in this TanStack version
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        if (!q) return Response.json({ error: "Missing query" }, { status: 400 });

        const params = new URLSearchParams({
          sf: "code,name",
          df: "code,name",
          terms: q,
          maxList: "25",
        });

        try {
          const res = await fetch(`${NLM}?${params.toString()}`, {
            headers: { accept: "application/json" },
          });
          if (!res.ok) return Response.json({ error: `NLM ${res.status}` }, { status: 502 });
          // NLM returns a tuple: [total, codes[], null, display[]]
          const raw = (await res.json()) as [number, string[], unknown, string[][]];
          const [_total, codes, , display] = raw;

          const results = codes.map((code, i) => {
            const row = display?.[i] ?? [];
            const title = row?.[1] ?? "";
            const parentCode = code.includes(".") ? code.split(".")[0] : chapterCode(code);
            return {
              code,
              title,
              parent_code: parentCode !== code ? parentCode : null,
              category: chapterName(code),
            };
          });

          return Response.json({ system: "ICD-10-CM", source: "NLM Clinical Tables", results });
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

function chapterCode(code: string): string {
  const letter = code[0]?.toUpperCase();
  if (!letter) return "";
  return letter;
}

const CHAPTERS: Array<[RegExp, string]> = [
  [/^A|^B/, "Certain infectious and parasitic diseases"],
  [/^C|^D[0-4]/, "Neoplasms"],
  [/^D[5-8]/, "Diseases of blood and immune system"],
  [/^E/, "Endocrine, nutritional and metabolic diseases"],
  [/^F/, "Mental, behavioral and neurodevelopmental disorders"],
  [/^G/, "Diseases of the nervous system"],
  [/^H[0-5]/, "Diseases of the eye and adnexa"],
  [/^H[6-9]/, "Diseases of the ear and mastoid process"],
  [/^I/, "Diseases of the circulatory system"],
  [/^J/, "Diseases of the respiratory system"],
  [/^K/, "Diseases of the digestive system"],
  [/^L/, "Diseases of the skin and subcutaneous tissue"],
  [/^M/, "Diseases of the musculoskeletal system"],
  [/^N/, "Diseases of the genitourinary system"],
  [/^O/, "Pregnancy, childbirth and the puerperium"],
  [/^P/, "Conditions originating in the perinatal period"],
  [/^Q/, "Congenital malformations"],
  [/^R/, "Symptoms, signs and abnormal findings"],
  [/^S|^T/, "Injury, poisoning and external causes"],
  [/^V|^W|^X|^Y/, "External causes of morbidity"],
  [/^Z/, "Factors influencing health status"],
  [/^U/, "Codes for special purposes"],
];

function chapterName(code: string): string | null {
  for (const [rx, name] of CHAPTERS) if (rx.test(code)) return name;
  return null;
}
