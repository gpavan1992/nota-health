import { createFileRoute } from "@tanstack/react-router";
import {
  expandedDrugTerms,
  fetchBestLabel,
  labelText,
  normalizeDrugTerm,
  openFdaNames,
  type LabelDoc,
} from "@/lib/drug-label";

// Best-effort interaction check using openFDA drug labels. For each pair,
// we look inside each drug's `drug_interactions` label section for a mention
// of the other drug's brand or generic name. Severity is a heuristic based on
// language commonly used in FDA labels (contraindicated / avoid / warning).

function nameTokens(label: LabelDoc | null, fallback: string): string[] {
  return expandedDrugTerms(fallback, label);
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

function cleanSnippet(snippet: string): string {
  return snippet
    .replace(/\s+/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s+[A-Z][A-Z\s]{3,}:?\s*/g, "")
    .replace(/\(\s*\d+(?:\.\d+)?\s*\)/g, "")
    .trim()
    .slice(0, 360);
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

type InteractionResult = {
  a: string;
  b: string;
  severity: "Major" | "Moderate" | "Minor";
  snippet: string;
  source: string;
};

type DrugConcepts = {
  oralRoute: boolean;
  delaysGastricEmptying: boolean;
  glucoseLowering: boolean;
  insulinOrSecretagogueWarning: boolean;
  renalClearance: boolean;
  lacticAcidosis: boolean;
};

function concepts(label: LabelDoc | null): DrugConcepts {
  const of = label?.openfda ?? {};
  const text = [
    labelText(label),
    ...(of.route ?? []),
    ...(of.pharm_class_epc ?? []),
    ...(of.pharm_class_moa ?? []),
    ...(of.pharm_class_cs ?? []),
    ...(of.pharm_class_pe ?? []),
    ...openFdaNames(label),
  ]
    .join(" ")
    .toLowerCase();

  return {
    oralRoute: /\boral\b|tablet|capsule/.test(text),
    delaysGastricEmptying: /delay(?:s|ed)? gastric emptying|other oral drugs|oral medications/.test(text),
    glucoseLowering: /glucose|glycemic|hypoglycemia|diabetes|antidiabetic|glp-?1|sulfonylurea|biguanide|metformin|semaglutide|tirzepatide|insulin/.test(text),
    insulinOrSecretagogueWarning: /insulin secretagogue|sulfonylurea|with insulin|hypoglycemia/.test(text),
    renalClearance: /renal|kidney|creatinine|tubular secretion|metformin clearance/.test(text),
    lacticAcidosis: /lactic acidosis/.test(text),
  };
}

function displayName(input: string, label: LabelDoc | null): string {
  const of = label?.openfda ?? {};
  return of.brand_name?.[0] ?? of.generic_name?.[0] ?? input;
}

function semanticMatch(
  aInput: string,
  bInput: string,
  labelA: LabelDoc | null,
  labelB: LabelDoc | null,
): InteractionResult | null {
  const a = concepts(labelA);
  const b = concepts(labelB);
  const aName = displayName(aInput, labelA);
  const bName = displayName(bInput, labelB);

  if (a.delaysGastricEmptying && b.oralRoute) {
    return {
      a: aInput,
      b: bInput,
      severity: "Moderate",
      snippet: `${aName} can delay gastric emptying. ${bName} is an oral medication, so monitor clinical response and tolerability; pay closer attention if the oral drug has a narrow therapeutic index or needs lab monitoring.`,
      source: "FDA label semantic match",
    };
  }

  if (b.delaysGastricEmptying && a.oralRoute) {
    return {
      a: aInput,
      b: bInput,
      severity: "Moderate",
      snippet: `${bName} can delay gastric emptying. ${aName} is an oral medication, so monitor clinical response and tolerability; pay closer attention if the oral drug has a narrow therapeutic index or needs lab monitoring.`,
      source: "FDA label semantic match",
    };
  }

  if (a.glucoseLowering && b.glucoseLowering && (a.insulinOrSecretagogueWarning || b.insulinOrSecretagogueWarning)) {
    return {
      a: aInput,
      b: bInput,
      severity: "Moderate",
      snippet: `${aName} and ${bName} both sit in a glucose-lowering regimen. No direct contraindication was found, but monitor glucose and GI tolerance, especially if insulin or a sulfonylurea is also present.`,
      source: "FDA label semantic match",
    };
  }

  if ((a.renalClearance && b.lacticAcidosis) || (b.renalClearance && a.lacticAcidosis)) {
    return {
      a: aInput,
      b: bInput,
      severity: "Moderate",
      snippet: `The label language points to renal clearance and lactic-acidosis risk. Check eGFR, dehydration/AKI risk, and dose appropriateness before combining.`,
      source: "FDA label semantic match",
    };
  }

  return null;
}

export const Route = createFileRoute("/api/tools/interactions")({
  // @ts-expect-error - server handlers typing not exposed in this TanStack version
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
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

        const labels = await Promise.all(drugs.map((d) => fetchBestLabel(d).catch(() => null)));
        const tokens = labels.map((l, i) => nameTokens(l, drugs[i]));

        const interactions: InteractionResult[] = [];
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
            const directSnippet = matchInA ?? matchInB;
            const semantic = semanticMatch(drugs[i], drugs[j], labelA, labelB);
            const snippet = directSnippet ? cleanSnippet(directSnippet) : semantic?.snippet;
            if (!snippet) continue;

            interactions.push({
              a: drugs[i],
              b: drugs[j],
              severity: directSnippet ? severity(directSnippet) : (semantic?.severity ?? "Minor"),
              snippet,
              source: directSnippet ? "FDA label direct mention" : (semantic?.source ?? "FDA label"),
            });
          }
        }

        return Response.json({
          drugs,
          resolved: drugs.map((d, i) => ({
            input: d,
            label_found: !!labels[i],
            matched_name: displayName(d, labels[i]),
            normalized: normalizeDrugTerm(d),
          })),
          interactions,
        });
      },
    },
  },
});
