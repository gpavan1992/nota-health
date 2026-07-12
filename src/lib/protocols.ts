import type { ColumnFormat } from "./clinical-protocols";

export interface ProtocolColumn {
  key: string;
  label: string;
  description?: string;
  format?: ColumnFormat;
  prompt?: string;
}

export interface Protocol {
  id: string;
  name: string;
  description: string;
  columns: ProtocolColumn[];
}

export const PROTOCOLS: Protocol[] = [
  {
    id: "medication_list",
    name: "Medication List",
    description: "Extract all medications with dosing details.",
    columns: [
      { key: "drug_name", label: "Drug Name" },
      { key: "dosage", label: "Dosage" },
      { key: "frequency", label: "Frequency" },
      { key: "route", label: "Route" },
      { key: "prescribing_physician", label: "Prescribing Physician" },
    ],
  },
  {
    id: "diagnosis_summary",
    name: "Diagnosis Summary",
    description: "Primary and secondary diagnoses with ICD codes.",
    columns: [
      { key: "diagnosis", label: "Diagnosis" },
      { key: "icd_code", label: "ICD Code" },
      { key: "type", label: "Type", description: "Primary or Secondary" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    id: "lab_results",
    name: "Lab Results",
    description: "Lab values with reference ranges and abnormal flags.",
    columns: [
      { key: "test_name", label: "Test Name" },
      { key: "value", label: "Value" },
      { key: "units", label: "Units" },
      { key: "reference_range", label: "Reference Range" },
      { key: "flag", label: "Flag", description: "Normal, High, Low, Critical" },
      { key: "collected_at", label: "Collected At" },
    ],
  },
  {
    id: "vital_signs",
    name: "Vital Signs Log",
    description: "Vital sign readings with timestamps.",
    columns: [
      { key: "timestamp", label: "Timestamp" },
      { key: "bp", label: "Blood Pressure" },
      { key: "hr", label: "Heart Rate" },
      { key: "temp", label: "Temperature" },
      { key: "rr", label: "Respiratory Rate" },
      { key: "spo2", label: "SpO₂" },
    ],
  },
  {
    id: "followup_actions",
    name: "Follow-up Action List",
    description: "Follow-up instructions, appointments, and pending tasks.",
    columns: [
      { key: "action", label: "Action" },
      { key: "owner", label: "Owner" },
      { key: "due", label: "Due" },
      { key: "priority", label: "Priority" },
    ],
  },
  {
    id: "discharge_summary",
    name: "Discharge Summary Extract",
    description: "Key fields from a hospital discharge summary.",
    columns: [
      { key: "field", label: "Field" },
      { key: "value", label: "Value" },
    ],
  },
  {
    id: "medication_reconciliation",
    name: "Medication Reconciliation",
    description:
      "Extract and compare medication lists across documents to flag discrepancies.",
    columns: [
      { key: "drug_name", label: "Drug Name" },
      { key: "dose_doc_a", label: "Dose (Doc A)" },
      { key: "dose_doc_b", label: "Dose (Doc B)" },
      { key: "status", label: "Status", description: "Match, Changed, Added, Discontinued" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    id: "condition_checklist",
    name: "Condition Checklist",
    description:
      "Clinical checklist of conditions and tasks required before discharge or transfer.",
    columns: [
      { key: "item", label: "Item" },
      { key: "category", label: "Category", description: "Condition, Task, Order, Education" },
      { key: "status", label: "Status", description: "Complete, Pending, Not Met" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    id: "trial_eligibility",
    name: "Clinical Trial Eligibility Review",
    description:
      "Compare a patient's clinical profile against trial inclusion and exclusion criteria.",
    columns: [
      { key: "criterion", label: "Criterion" },
      { key: "type", label: "Type", description: "Inclusion or Exclusion" },
      { key: "patient_value", label: "Patient Value" },
      { key: "result", label: "Result", description: "Met, Not Met, Unclear" },
      { key: "evidence", label: "Evidence" },
    ],
  },
  {
    id: "custom",
    name: "Start from scratch",
    description: "Ask the AI to extract whatever you describe.",
    columns: [],
  },
];


export function getProtocol(id: string): Protocol {
  return PROTOCOLS.find((p) => p.id === id) ?? PROTOCOLS[0];
}
