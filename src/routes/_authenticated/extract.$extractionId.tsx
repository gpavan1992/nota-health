import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, FolderPlus, Trash2, Loader2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getProtocol, type ProtocolColumn } from "@/lib/protocols";

export const Route = createFileRoute("/_authenticated/extract/$extractionId")({
  component: ExtractionDetail,
});

function ExtractionDetail() {
  const { user } = Route.useRouteContext();
  const { extractionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [savingCase, setSavingCase] = useState<string>("");
  const [cases, setCases] = useState<{ id: string; name: string }[] | null>(null);

  const { data: extraction, isLoading } = useQuery({
    queryKey: ["extraction", extractionId],
    refetchInterval: (q) => {
      const s = (q.state.data as { status?: string } | undefined)?.status;
      return s === "processing" ? 2000 : false;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extractions")
        .select("*")
        .eq("id", extractionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function loadCases() {
    if (cases) return;
    const { data } = await supabase
      .from("cases")
      .select("id, name")
      .order("updated_at", { ascending: false })
      .limit(50);
    setCases(data ?? []);
  }

  async function saveToCase(caseId: string) {
    setSavingCase(caseId);
    const { error } = await supabase.from("extractions").update({ case_id: caseId }).eq("id", extractionId);
    setSavingCase("");
    if (error) return toast.error(error.message);
    toast.success("Saved to case");
    qc.invalidateQueries({ queryKey: ["extraction", extractionId] });
    qc.invalidateQueries({ queryKey: ["extractions", user.id] });
  }

  async function handleDelete() {
    if (!confirm("Delete this extraction?")) return;
    const { error } = await supabase.from("extractions").delete().eq("id", extractionId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["extractions", user.id] });
    navigate({ to: "/extract" });
  }

  if (isLoading) {
    return (
      <AppShell user={user}>
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      </AppShell>
    );
  }
  if (!extraction) {
    return (
      <AppShell user={user}>
        <p className="text-sm text-muted-foreground">Extraction not found.</p>
      </AppShell>
    );
  }

  const columns = (extraction.columns as unknown as ProtocolColumn[]) ?? [];
  const rows = (extraction.rows as unknown as Record<string, string>[]) ?? [];
  const proto = getProtocol(extraction.protocol);
  const name = extraction.name;

  function copyTSV() {
    const header = columns.map((c) => c.label).join("\t");
    const body = rows.map((r) => columns.map((c) => (r[c.key] ?? "").replaceAll("\n", " ")).join("\t")).join("\n");
    navigator.clipboard.writeText(header + "\n" + body);
    toast.success("Copied as TSV");
  }
  function downloadCSV() {
    const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
    const header = columns.map((c) => esc(c.label)).join(",");
    const body = rows.map((r) => columns.map((c) => esc(r[c.key] ?? "")).join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isFieldValue =
    columns.length === 2 && columns[0]?.key === "field" && columns[1]?.key === "value";

  return (
    <AppShell user={user}>
      <div
        className="-mx-4 -mt-4 min-h-full bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_35%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_35%,transparent)_1px,transparent_1px)] bg-[size:32px_32px] px-4 pt-4 sm:-mx-8 sm:px-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 h-7 text-muted-foreground">
              <Link to="/extract">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                All extractions
              </Link>
            </Button>
            <div className="flex items-start gap-3">
              <h1 className="flex-1 font-serif text-3xl font-medium tracking-tight text-foreground">
                {extraction.name}
              </h1>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDelete}
                aria-label="Delete extraction"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                {proto.name}
              </Badge>
              {extraction.case_id && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  In a Case
                </Badge>
              )}
              <StatusBadge status={extraction.status} />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {new Date(extraction.created_at).toLocaleString()}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={copyTSV} disabled={rows.length === 0}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy
            </Button>
            <Button size="sm" variant="outline" onClick={downloadCSV} disabled={rows.length === 0}>
              <Download className="mr-2 h-3.5 w-3.5" />
              CSV
            </Button>
            {!extraction.case_id && (
              <Select onOpenChange={(o) => o && loadCases()} value="" onValueChange={saveToCase}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
                  <SelectValue placeholder="Save to Case" />
                </SelectTrigger>
                <SelectContent>
                  {cases === null ? (
                    <div className="p-2 text-xs text-muted-foreground">Loading…</div>
                  ) : cases.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">No cases</div>
                  ) : (
                    cases.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                        {savingCase === c.id && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <Card className="mt-6 overflow-hidden rounded-2xl border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] backdrop-blur">
          <CardContent className="p-0">
            {extraction.status === "processing" ? (
              <div className="flex items-center justify-center gap-3 p-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting…
              </div>
            ) : extraction.status === "failed" ? (
              <div className="p-8 text-sm text-destructive">
                Extraction failed: {extraction.error ?? "unknown error"}
              </div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No rows were extracted from the provided documents.
              </div>
            ) : isFieldValue ? (
              <ClinicalFieldValueTable rows={rows} />
            ) : (
              <ClinicalTable columns={columns} rows={rows} />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

/* ------------------------------ Table pieces ------------------------------ */

// Soft tinted pill palette (semantic, cycles by hash so identical enum values share a color)
const PILL_TINTS = [
  "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-[color-mix(in_oklab,var(--primary)_85%,var(--foreground))]",
  "bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-[color-mix(in_oklab,var(--accent-foreground)_90%,var(--foreground))]",
  "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[color-mix(in_oklab,var(--success)_80%,var(--foreground))]",
  "bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-[color-mix(in_oklab,var(--warning)_85%,var(--foreground))]",
  "bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] text-[color-mix(in_oklab,var(--destructive)_85%,var(--foreground))]",
];

function tintFor(v: string) {
  let h = 0;
  for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) >>> 0;
  return PILL_TINTS[h % PILL_TINTS.length];
}

function EnumPill({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium ${tintFor(value.toLowerCase())}`}
    >
      {value}
    </span>
  );
}

/** A column is "enum-like" when values are short, repeat often, and have low cardinality. */
function detectEnumColumns(columns: ProtocolColumn[], rows: Record<string, string>[]) {
  const flags: Record<string, boolean> = {};
  for (const c of columns) {
    const vals = rows.map((r) => (r[c.key] ?? "").trim()).filter(Boolean);
    if (vals.length < 2) { flags[c.key] = false; continue; }
    const uniq = new Set(vals);
    const maxLen = Math.max(...vals.map((v) => v.length));
    flags[c.key] =
      maxLen <= 24 && uniq.size <= Math.max(2, Math.ceil(vals.length / 2)) && uniq.size <= 6;
  }
  return flags;
}

function ClinicalTable({
  columns,
  rows,
}: {
  columns: ProtocolColumn[];
  rows: Record<string, string>[];
}) {
  const enumCols = useMemo(() => detectEnumColumns(columns, rows), [columns, rows]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-[12px] font-medium text-muted-foreground">
            {columns.map((c) => (
              <th
                key={c.key}
                className="border-b border-border/60 px-4 py-3.5 font-medium"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="transition-colors hover:bg-muted/40">
              {columns.map((c) => {
                const raw = (r[c.key] ?? "").trim();
                return (
                  <td
                    key={c.key}
                    className="border-b border-border/40 px-4 py-3.5 align-top text-[13px] leading-relaxed text-foreground"
                  >
                    {raw ? (
                      c.format ? (
                        <FormattedCell value={raw} format={c.format} />
                      ) : enumCols[c.key] ? (
                        <EnumPill value={raw} />
                      ) : (
                        <span className="text-foreground/90">{raw}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormattedCell({ value, format }: { value: string; format: NonNullable<ProtocolColumn["format"]> }) {
  const v = value.trim();
  if (format === "clinical_value") {
    const m = v.match(/\b(HIGH|LOW|NORMAL|CRITICAL)\b/i);
    const flag = m?.[1]?.toUpperCase();
    const base = v.replace(/\b(HIGH|LOW|NORMAL|CRITICAL)\b/i, "").trim();
    const tint =
      flag === "HIGH"
        ? "bg-destructive/15 text-destructive"
        : flag === "LOW"
          ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
          : flag === "NORMAL"
            ? "bg-success/15 text-success"
            : "bg-warning/15 text-warning";
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-medium">{base || v}</span>
        {flag && (
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tint}`}>
            {flag}
          </span>
        )}
      </span>
    );
  }
  if (format === "icd10") {
    const m = v.match(/^([A-TV-Z]\d{2}(?:\.\d{1,4})?)\s*[—:-]?\s*(.*)$/i);
    if (m) {
      return (
        <span className="inline-flex items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{m[1].toUpperCase()}</span>
          {m[2] && <span className="text-muted-foreground">{m[2]}</span>}
        </span>
      );
    }
    return <span className="font-mono text-[12px]">{v}</span>;
  }
  if (format === "yes_no") {
    const norm = v.toLowerCase();
    const kind = norm.startsWith("y")
      ? { label: "Yes", cls: "bg-success/15 text-success" }
      : norm.startsWith("n") && !norm.includes("not")
        ? { label: "No", cls: "bg-destructive/15 text-destructive" }
        : { label: "Not Mentioned", cls: "bg-muted text-muted-foreground" };
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${kind.cls}`}>
        {kind.label}
      </span>
    );
  }
  if (format === "medication_entry") {
    const parts = v.split("|").map((s) => s.trim());
    if (parts.length >= 2) {
      const labels = ["Drug", "Dose", "Frequency", "Route"];
      return (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
          {parts.map((p, i) => (
            <span key={i}>
              <span className="text-muted-foreground">{labels[i] ?? "•"}: </span>
              <span className="font-medium">{p}</span>
            </span>
          ))}
        </div>
      );
    }
    return <span>{v}</span>;
  }
  if (format === "bulleted_list") {
    const items = v.split(/\n|;|•/).map((s) => s.trim()).filter(Boolean);
    if (items.length > 1) {
      return (
        <ul className="ml-4 list-disc space-y-0.5">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    }
    return <span>{v}</span>;
  }
  return <span>{v}</span>;
}

function ClinicalFieldValueTable({ rows }: { rows: Record<string, string>[] }) {
  return (
    <table className="w-full border-separate border-spacing-0 text-sm">
      <thead>
        <tr className="text-left text-[12px] font-medium text-muted-foreground">
          <th className="w-1/3 border-b border-border/60 px-6 py-3.5 font-medium">Field</th>
          <th className="border-b border-border/60 px-6 py-3.5 font-medium">Value</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-muted/40">
            <td className="border-b border-border/40 px-6 py-3.5 align-top text-[13px] text-muted-foreground">
              {r.field || <span className="text-muted-foreground/60">—</span>}
            </td>
            <td className="border-b border-border/40 px-6 py-3.5 align-top text-[13px] leading-relaxed text-foreground">
              {(r.value ?? "").trim() ? r.value : <span className="text-muted-foreground/60">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusBadge({ status }: { status: string }) {
  const dot =
    status === "ready" ? "bg-success" : status === "processing" ? "bg-warning" : "bg-destructive";
  return (
    <Badge variant="outline" className="gap-1.5 font-mono text-[10px]">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </Badge>
  );
}
