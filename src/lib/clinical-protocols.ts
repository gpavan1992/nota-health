export type ProtocolType = "assistant" | "extraction";

export type ColumnFormat =
  | "free_text"
  | "bulleted_list"
  | "medication_entry"
  | "clinical_value"
  | "icd10"
  | "yes_no"
  | "date"
  | "number"
  | "provider"
  | "currency";

export const COLUMN_FORMAT_OPTIONS: { value: ColumnFormat; label: string; hint?: string }[] = [
  { value: "free_text", label: "Free Text" },
  { value: "bulleted_list", label: "Bulleted List" },
  { value: "medication_entry", label: "Medication Entry", hint: "Drug | Dose | Frequency | Route" },
  { value: "clinical_value", label: "Clinical Value", hint: "value with HIGH/LOW/NORMAL flag" },
  { value: "icd10", label: "ICD-10 Code", hint: "code + description" },
  { value: "yes_no", label: "Yes / No / Not Mentioned" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "provider", label: "Provider Name" },
  { value: "currency", label: "Currency / Cost" },
];

export function formatLabel(f: ColumnFormat): string {
  return COLUMN_FORMAT_OPTIONS.find((o) => o.value === f)?.label ?? "Free Text";
}

export interface ExtractionColumnDef {
  id: string;
  title: string;
  format: ColumnFormat;
  prompt: string;
}

export interface ClinicalProtocol {
  id: string;
  name: string;
  type: ProtocolType;
  clinicalArea: string;
  description: string;
  /** Seed prompt shown in the Assistant composer, or the extraction protocol id. */
  seedPrompt?: string;
  /** For extraction protocols, maps to an entry in src/lib/protocols.ts */
  extractionProtocolId?: string;
  /** Custom extraction column schema (custom protocols only). */
  extractionColumns?: ExtractionColumnDef[];
}

export interface ExtractionTemplate {
  id: string;
  name: string;
  columns: Omit<ExtractionColumnDef, "id" | "prompt">[];
}

export const EXTRACTION_TEMPLATES: ExtractionTemplate[] = [
  {
    id: "prior_auth",
    name: "Prior Authorization Checklist",
    columns: [
      { title: "Patient Name", format: "free_text" },
      { title: "Primary Diagnosis", format: "icd10" },
      { title: "Requested Procedure", format: "free_text" },
      { title: "Clinical Justification", format: "free_text" },
      { title: "Previous Treatments", format: "bulleted_list" },
      { title: "Denial Risk Factors", format: "bulleted_list" },
    ],
  },
  {
    id: "med_comparison",
    name: "Medication Comparison",
    columns: [
      { title: "Document Date", format: "date" },
      { title: "Medications Listed", format: "medication_entry" },
      { title: "Medications Added", format: "bulleted_list" },
      { title: "High Alert Medications Present", format: "yes_no" },
    ],
  },
  {
    id: "lab_tracker",
    name: "Lab Results Tracker",
    columns: [
      { title: "Test Date", format: "date" },
      { title: "HbA1c", format: "clinical_value" },
      { title: "eGFR", format: "clinical_value" },
      { title: "Serum Creatinine", format: "clinical_value" },
      { title: "Fasting Glucose", format: "clinical_value" },
      { title: "LDL Cholesterol", format: "clinical_value" },
    ],
  },
];

export function newColumnId(): string {
  return `col_${Math.random().toString(36).slice(2, 9)}`;
}

export const BUILT_IN_PROTOCOLS: ClinicalProtocol[] = [
  {
    id: "prior_auth_review",
    name: "Prior Authorization Review",
    type: "assistant",
    clinicalArea: "Payer / Utilization",
    description:
      "Reviews prior authorization requests, flags missing fields and weak justifications likely to cause payer denials.",
    seedPrompt:
      "Review the attached prior authorization request. Identify (1) any missing required fields, (2) clinical justifications that are weak or unsupported, and (3) documentation gaps likely to cause a payer denial. Return a concise checklist of what to fix before submission.",
  },
  {
    id: "discharge_summary_qa",
    name: "Discharge Summary Analysis",
    type: "assistant",
    clinicalArea: "Inpatient / Transitions of Care",
    description:
      "Reads a discharge summary and answers questions about medications, diagnoses, follow-up, and warning signs.",
    seedPrompt:
      "Analyze the attached discharge summary. Summarize the discharge diagnoses, medication changes, follow-up appointments, and patient-facing warning signs. Then wait for my follow-up questions.",
  },
  {
    id: "referral_letter",
    name: "Referral Letter Draft",
    type: "assistant",
    clinicalArea: "Ambulatory",
    description:
      "Drafts a structured specialist referral letter from clinical notes.",
    seedPrompt:
      "Draft a specialist referral letter using the attached clinical notes. Structure it with: Reason for referral, Relevant history, Current medications, Pertinent exam and diagnostics, Working diagnosis, and Specific questions for the consultant.",
  },
  {
    id: "insurance_appeal",
    name: "Insurance Appeal Letter",
    type: "assistant",
    clinicalArea: "Payer / Revenue Cycle",
    description:
      "Writes a professional appeal for a denied insurance claim.",
    seedPrompt:
      "Draft a professional insurance appeal letter for the attached denial. Include: patient identifiers, denial reason, clinical rationale for medical necessity, supporting evidence and guidelines, and a clear request for reversal.",
  },
  {
    id: "soap_note",
    name: "SOAP Note Formatter",
    type: "assistant",
    clinicalArea: "Documentation",
    description:
      "Structures free-text clinical notes into Subjective, Objective, Assessment, and Plan.",
    seedPrompt:
      "Reformat the attached clinical notes into a SOAP note with clearly labeled Subjective, Objective, Assessment, and Plan sections. Preserve all clinical detail; do not invent findings.",
  },
  {
    id: "medication_reconciliation",
    name: "Medication Reconciliation",
    type: "extraction",
    clinicalArea: "Medication Safety",
    description:
      "Extracts and compares medication lists across multiple documents to identify discrepancies.",
    extractionProtocolId: "medication_reconciliation",
  },
  {
    id: "condition_checklist",
    name: "Condition Checklist",
    type: "extraction",
    clinicalArea: "Inpatient / Transitions of Care",
    description:
      "Generates a clinical checklist of conditions and tasks that must be completed before discharge or transfer.",
    extractionProtocolId: "condition_checklist",
  },
  {
    id: "trial_eligibility",
    name: "Clinical Trial Eligibility Review",
    type: "extraction",
    clinicalArea: "Research",
    description:
      "Checks a patient's clinical profile against trial inclusion and exclusion criteria.",
    extractionProtocolId: "trial_eligibility",
  },
];

const CUSTOM_KEY = "nota.custom_protocols";

export interface CustomProtocol extends ClinicalProtocol {
  createdAt: string;
}

export function loadCustomProtocols(): CustomProtocol[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomProtocol[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomProtocol(p: Omit<CustomProtocol, "id" | "createdAt">): CustomProtocol {
  const record: CustomProtocol = {
    ...p,
    id: `custom_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  };
  const list = loadCustomProtocols();
  list.unshift(record);
  window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  return record;
}

export function updateCustomProtocol(
  id: string,
  patch: Partial<Omit<CustomProtocol, "id" | "createdAt">>,
): CustomProtocol | undefined {
  const list = loadCustomProtocols();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  const updated: CustomProtocol = { ...list[idx], ...patch };
  list[idx] = updated;
  window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  return updated;
}

export function deleteCustomProtocol(id: string) {
  const list = loadCustomProtocols().filter((p) => p.id !== id);
  window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

const DEACTIVATED_KEY = "nota.deactivated_protocols";

export function loadDeactivatedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEACTIVATED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function deactivateBuiltIn(id: string) {
  const set = new Set(loadDeactivatedIds());
  set.add(id);
  window.localStorage.setItem(DEACTIVATED_KEY, JSON.stringify([...set]));
}

export function activateBuiltIn(id: string) {
  const list = loadDeactivatedIds().filter((x) => x !== id);
  window.localStorage.setItem(DEACTIVATED_KEY, JSON.stringify(list));
}


export function getClinicalProtocol(id: string): ClinicalProtocol | undefined {
  return (
    BUILT_IN_PROTOCOLS.find((p) => p.id === id) ??
    loadCustomProtocols().find((p) => p.id === id)
  );
}
