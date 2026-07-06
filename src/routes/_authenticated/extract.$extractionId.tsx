import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
    a.download = `${(extraction as { name: string }).name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell user={user}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 h-7 text-muted-foreground">
            <Link to="/extract">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              All extractions
            </Link>
          </Button>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            {extraction.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="font-mono text-[10px]">
              {proto.name}
            </Badge>
            {extraction.case_id && (
              <Badge variant="outline" className="font-mono text-[10px]">
                In a Case
              </Badge>
            )}
            <StatusBadge status={extraction.status} />
            <span>{new Date(extraction.created_at).toLocaleString()}</span>
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
          <Button size="sm" variant="ghost" onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Card className="mt-6">
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} className="px-4 py-3 font-medium">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      {columns.map((c) => (
                        <td key={c.key} className="px-4 py-3 align-top font-mono text-[13px] text-foreground">
                          {r[c.key] || <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
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
