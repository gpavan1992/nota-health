import {
  AlignLeft,
  List as ListIcon,
  CircleDot,
  Calendar,
  Activity,
  Hash,
  Pill,
  DollarSign,
  User as UserIcon,
  Sparkles,
  Table as TableIcon,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { ColumnFormat, ProtocolType } from "./clinical-protocols";

export const FORMAT_ICONS: Record<ColumnFormat, LucideIcon> = {
  free_text: AlignLeft,
  bulleted_list: ListIcon,
  yes_no: CircleDot,
  date: Calendar,
  clinical_value: Activity,
  icd10: Hash,
  medication_entry: Pill,
  currency: DollarSign,
  provider: UserIcon,
  number: Hash,
};

export const TYPE_ICONS: Record<ProtocolType, LucideIcon> = {
  assistant: Sparkles,
  extraction: TableIcon,
};

export const SOURCE_ICONS = {
  "Built-in": Star,
  Custom: UserIcon,
} as const;

// Palette for clinical area dots (semantic tokens where possible)
const DOT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // indigo
  "#84cc16", // lime
];

export function areaColor(area: string): string {
  let h = 0;
  for (let i = 0; i < area.length; i++) h = (h * 31 + area.charCodeAt(i)) >>> 0;
  return DOT_COLORS[h % DOT_COLORS.length];
}
