export type ProtocolType = "assistant" | "extraction";

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

export function deleteCustomProtocol(id: string) {
  const list = loadCustomProtocols().filter((p) => p.id !== id);
  window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

export function getClinicalProtocol(id: string): ClinicalProtocol | undefined {
  return (
    BUILT_IN_PROTOCOLS.find((p) => p.id === id) ??
    loadCustomProtocols().find((p) => p.id === id)
  );
}
