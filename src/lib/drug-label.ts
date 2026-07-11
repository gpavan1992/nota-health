export type LabelDoc = {
  indications_and_usage?: string[];
  dosage_and_administration?: string[];
  drug_interactions?: string[];
  warnings?: string[];
  warnings_and_cautions?: string[];
  contraindications?: string[];
  adverse_reactions?: string[];
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    substance_name?: string[];
    route?: string[];
    pharm_class_epc?: string[];
    pharm_class_moa?: string[];
    pharm_class_cs?: string[];
    pharm_class_pe?: string[];
  };
};

const SALT_AND_FORM_WORDS = /\b(hydrochloride|hcl|sodium|potassium|calcium|magnesium|succinate|tartrate|mesylate|besylate|phosphate|sulfate|oral|tablet|tablets|capsule|capsules|injection|injectable|solution|suspension|extended release|delayed release)\b/g;

const ALIASES: Record<string, string[]> = {
  ozempic: ["semaglutide", "glp-1", "glp 1"],
  rybelsus: ["semaglutide", "glp-1", "glp 1"],
  wegovy: ["semaglutide", "glp-1", "glp 1"],
  mounjaro: ["tirzepatide", "glp-1", "gip"],
  zepbound: ["tirzepatide", "glp-1", "gip"],
  glucophage: ["metformin"],
  eliquis: ["apixaban"],
  xarelto: ["rivaroxaban"],
  jardiance: ["empagliflozin", "sglt2"],
  farxiga: ["dapagliflozin", "sglt2"],
  januvia: ["sitagliptin", "dpp-4", "dpp 4"],
};

export function normalizeDrugTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/\+/g, " ")
    .replace(SALT_AND_FORM_WORDS, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function labelText(label: LabelDoc | null | undefined, fields?: Array<keyof LabelDoc>): string {
  if (!label) return "";
  const keys = fields ?? [
    "drug_interactions",
    "warnings",
    "warnings_and_cautions",
    "contraindications",
    "indications_and_usage",
    "adverse_reactions",
  ];
  return keys
    .flatMap((key) => {
      const value = label[key];
      return Array.isArray(value) ? value : [];
    })
    .join("\n\n");
}

export function openFdaNames(label: LabelDoc | null | undefined): string[] {
  const of = label?.openfda ?? {};
  return [of.brand_name, of.generic_name, of.substance_name]
    .flatMap((items) => items ?? [])
    .filter(Boolean);
}

export function expandedDrugTerms(input: string, label?: LabelDoc | null): string[] {
  const set = new Set<string>();
  const add = (value?: string | null) => {
    if (!value) return;
    const raw = value.toLowerCase().trim();
    const normalized = normalizeDrugTerm(value);
    if (raw.length > 2) set.add(raw);
    if (normalized.length > 2) set.add(normalized);
    for (const alias of ALIASES[normalized] ?? []) set.add(alias);
  };
  add(input);
  for (const name of openFdaNames(label)) add(name);
  return Array.from(set).filter((term) => term.length > 2);
}

function queryTerms(name: string): string[] {
  const normalized = normalizeDrugTerm(name);
  const set = new Set([name.trim(), normalized]);
  for (const alias of ALIASES[normalized] ?? []) set.add(alias);
  return Array.from(set).filter((term) => term.length > 2);
}

function splitIngredients(value: string): string[] {
  return normalizeDrugTerm(value)
    .split(/\s+(?:and|with)\s+|\s*\/\s*|\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function scoreLabel(label: LabelDoc, input: string): number {
  const normalizedInput = normalizeDrugTerm(input);
  const aliases = new Set([normalizedInput, ...(ALIASES[normalizedInput] ?? []).map(normalizeDrugTerm)]);
  const names = openFdaNames(label).map(normalizeDrugTerm).filter(Boolean);
  const of = label.openfda ?? {};
  let score = 0;

  for (const name of names) {
    if (aliases.has(name)) score += 120;
    else if ([...aliases].some((alias) => name.includes(alias))) score += 55;
    else if ([...aliases].some((alias) => alias.includes(name))) score += 25;
  }

  const brandNames = (of.brand_name ?? []).map(normalizeDrugTerm);
  if (brandNames.some((brand) => aliases.has(brand))) score += 35;
  if ((of.brand_name?.length ?? 0) === 1) score += 10;

  const ingredients = [of.generic_name, of.substance_name]
    .flatMap((items) => items ?? [])
    .flatMap(splitIngredients);
  if (ingredients.some((ingredient) => aliases.has(ingredient))) score += 45;
  if (ingredients.length > 1 && ingredients.some((ingredient) => aliases.has(ingredient))) {
    score -= 45 * (ingredients.length - 1);
  }

  return score;
}

async function fetchLabelCandidates(name: string): Promise<LabelDoc[]> {
  const candidates: LabelDoc[] = [];
  const seen = new Set<string>();

  for (const term of queryTerms(name)) {
    const escaped = term.replace(/["\\]/g, "");
    const search = `(openfda.brand_name:"${escaped}"+OR+openfda.generic_name:"${escaped}"+OR+openfda.substance_name:"${escaped}")`;
    const api = `https://api.fda.gov/drug/label.json?search=${search}&limit=10`;
    const res = await fetch(api, { headers: { accept: "application/json" } });
    if (res.status === 404) continue;
    if (!res.ok) continue;
    const data = (await res.json()) as { results?: LabelDoc[] };
    for (const label of data.results ?? []) {
      const signature = JSON.stringify(label.openfda ?? {}).slice(0, 600);
      if (seen.has(signature)) continue;
      seen.add(signature);
      candidates.push(label);
    }
  }

  return candidates;
}

export async function fetchBestLabel(name: string): Promise<LabelDoc | null> {
  const candidates = await fetchLabelCandidates(name);
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => scoreLabel(b, name) - scoreLabel(a, name))[0] ?? null;
}

export function getLabelField(label: LabelDoc, key: keyof LabelDoc): string | undefined {
  const value = label[key];
  if (Array.isArray(value)) return value.filter(Boolean).join("\n\n");
  return undefined;
}