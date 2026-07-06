import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Protocol</th>
                  <th className="px-4 py-3 font-medium">Documents</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => {
                  const docs = Array.isArray(e.source_documents) ? e.source_documents.length : 0;
                  const proto = getProtocol(e.protocol);
                  return (
                    <tr
                      key={e.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() =>
                        navigate({ to: "/extract/$extractionId", params: { extractionId: e.id } })
                      }
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{e.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{proto.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{docs}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(e.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={e.status} />
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
        onOpenChange={setCreateOpen}
        userId={user.id}
        onCreated={(id: string) => navigate({ to: "/extract/$extractionId", params: { extractionId: id } })}
      />
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
