import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FileSearch, FolderOpen, Table as TableIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getProtocol } from "@/lib/protocols";
import { CreateExtractionDialog } from "@/components/create-extraction-dialog";

export const Route = createFileRoute("/_authenticated/extract/")({
  validateSearch: (search: Record<string, unknown>) => ({
    new: search.new === "1" || search.new === true ? true : undefined,
    protocol: typeof search.protocol === "string" ? (search.protocol as string) : undefined,
  }),
  component: ExtractList,
});

function ExtractList() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  const [tab, setTab] = useState<"all" | "case" | "standalone">("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [initialProtocol, setInitialProtocol] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (searchParams.new) {
      setInitialProtocol(searchParams.protocol);
      setCreateOpen(true);
      navigate({ to: "/extract", search: {}, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.new, searchParams.protocol]);



  const qc = useQueryClient();
  const { data: extractions } = useQuery({
    queryKey: ["extractions", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extractions")
        .select("id, name, protocol, source_documents, case_id, created_at, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Stuck-processing watchdog: anything still "processing" after 2 min
  // is treated as failed (the browser tab that started it is gone).
  useEffect(() => {
    if (!extractions) return;
    const cutoff = Date.now() - 2 * 60 * 1000;
    const stuck = extractions.filter(
      (e) => e.status === "processing" && new Date(e.created_at).getTime() < cutoff,
    );
    if (stuck.length === 0) return;
    (async () => {
      await supabase
        .from("extractions")
        .update({ status: "failed", error: "Timed out — please retry." })
        .in(
          "id",
          stuck.map((s) => s.id),
        );
      qc.invalidateQueries({ queryKey: ["extractions", user.id] });
    })();
  }, [extractions, qc, user.id]);

  const filtered = useMemo(() => {
    let list = extractions ?? [];
    if (tab === "case") list = list.filter((e) => e.case_id);
    if (tab === "standalone") list = list.filter((e) => !e.case_id);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [extractions, tab, search]);

  return (
    <AppShell user={user}>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Clinical Extract"
          title="Structured data, straight from the chart."
          body="Pull diagnoses, medications, dosages, and identifiers into a clean, review-ready table."
        />
        <Button onClick={() => setCreateOpen(true)} className="mt-2 shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          New Extraction
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="case">In a Case</TabsTrigger>
            <TabsTrigger value="standalone">Standalone</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search extractions…"
          className="max-w-xs"
        />
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          {!extractions ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState onCreate={() => setCreateOpen(true)} />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-3 font-medium">
                    <span className="inline-block h-3.5 w-3.5 rounded border border-border" aria-hidden />
                  </th>
                  <th className="px-2 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filtered.map((e) => {
                  const proto = getProtocol(e.protocol);
                  return (
                    <tr
                      key={e.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() =>
                        navigate({ to: "/extract/$extractionId", params: { extractionId: e.id } })
                      }
                    >
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-block h-3.5 w-3.5 rounded border border-border bg-background"
                          aria-hidden
                          onClick={(ev) => ev.stopPropagation()}
                        />
                      </td>
                      <td className="px-2 py-3.5 font-medium text-foreground">{e.name}</td>
                      <td className="px-4 py-3.5">
                        <ClassPill protocolId={e.protocol} label={proto.name} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusRow status={e.status} date={e.created_at} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <CreateExtractionDialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setInitialProtocol(undefined);
        }}
        userId={user.id}
        initialProtocol={initialProtocol}
        onCreated={(id: string) => navigate({ to: "/extract/$extractionId", params: { extractionId: id } })}
      />

    </AppShell>
  );
}

const CLASS_TINTS: Record<string, string> = {
  medication_list: "bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  diagnosis_summary: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  lab_results: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  vital_signs: "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
  followup_actions: "bg-violet-100 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200",
  discharge_summary: "bg-slate-200 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200",
  medication_reconciliation: "bg-cyan-100 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200",
  condition_checklist: "bg-teal-100 text-teal-900 dark:bg-teal-950/40 dark:text-teal-200",
  trial_eligibility: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200",
  custom: "bg-muted text-foreground",
};

function ClassPill({ protocolId, label }: { protocolId: string; label: string }) {
  const tint = CLASS_TINTS[protocolId] ?? "bg-muted text-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tint}`}>
      {label}
    </span>
  );
}

function StatusRow({ status, date }: { status: string; date: string }) {
  const dot =
    status === "ready" ? "bg-success" : status === "processing" ? "bg-warning" : "bg-destructive";
  const label = status === "ready" ? "Ready" : status === "processing" ? "Processing" : "Failed";
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-foreground/80">{label}</span>
      <span className="text-muted-foreground/70">· {new Date(date).toLocaleDateString()}</span>
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <TableIcon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-serif text-xl text-foreground">No extractions yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Turn a discharge summary or lab report into a clean structured table.
      </p>
      <div className="mt-5 flex gap-2">
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Extraction
        </Button>
        <Button variant="outline" asChild>
          <Link to="/cases">
            <FolderOpen className="mr-2 h-4 w-4" />
            Open a Case
          </Link>
        </Button>
      </div>
      <FileSearch className="mt-6 h-4 w-4 text-muted-foreground/40" />
    </div>
  );
}
