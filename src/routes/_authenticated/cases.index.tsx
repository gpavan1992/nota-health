import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Users, FileText, MessageSquareText, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CreateCaseDialog } from "@/components/create-case-dialog";
import {
  useCases,
  caseTypeLabel,
  type CaseListItem,
} from "@/hooks/use-cases";

type Scope = "all" | "mine" | "shared";

export const Route = createFileRoute("/_authenticated/cases/")({
  head: () => ({ meta: [{ title: "Cases — Nota" }] }),
  component: CasesListPage,
});

function CasesListPage() {
  const { user } = Route.useRouteContext();
  const { data: cases, isLoading } = useCases();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const list = cases ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      if (scope === "mine" && c.owner_id !== user.id) return false;
      if (scope === "shared" && c.owner_id === user.id) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.case_ref ?? "").toLowerCase().includes(q)
      );
    });
  }, [cases, query, scope, user.id]);

  const counts = useMemo(() => {
    const list = cases ?? [];
    return {
      all: list.length,
      mine: list.filter((c) => c.owner_id === user.id).length,
      shared: list.filter((c) => c.owner_id !== user.id).length,
    };
  }, [cases, user.id]);

  return (
    <AppShell user={user}>
      <div className="flex items-start justify-between gap-6">
        <PageHeader
          eyebrow="Cases"
          title="Every clinical context, in one place."
          body="Group patient encounters, department libraries, and research projects. Nota keeps documents, members, and conversations organized under each case."
        />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create case
        </Button>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <TabsList>
            <TabsTrigger value="all">
              All cases{" "}
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {counts.all}
              </span>
            </TabsTrigger>
            <TabsTrigger value="mine">
              My cases{" "}
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {counts.mine}
              </span>
            </TabsTrigger>
            <TabsTrigger value="shared">
              Shared with me{" "}
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {counts.shared}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases…"
            className="pl-9"
          />
        </div>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onCreate={() => setCreateOpen(true)} hasCases={(cases ?? []).length > 0} />
          ) : (
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Case name</th>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Case ID</th>
                    <th className="px-3 py-3 text-right font-medium">Members</th>
                    <th className="px-3 py-3 text-right font-medium">Docs</th>
                    <th className="px-3 py-3 text-right font-medium">Conv.</th>
                    <th className="px-5 py-3 font-medium">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => (
                    <CaseRow key={c.id} c={c} ownerIsMe={c.owner_id === user.id} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="divide-y divide-border md:hidden">
              {filtered.map((c) => (
                <MobileCaseRow key={c.id} c={c} ownerIsMe={c.owner_id === user.id} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCaseDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  );
}

function CaseRow({ c, ownerIsMe }: { c: CaseListItem; ownerIsMe: boolean }) {
  return (
    <tr className="group transition-colors hover:bg-muted/30">
      <td className="px-5 py-4">
        <Link
          to="/cases/$caseId"
          params={{ caseId: c.id }}
          className="block"
        >
          <div className="font-medium text-foreground group-hover:text-primary">
            {c.name}
          </div>
          {!ownerIsMe && (
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              Shared with you
            </div>
          )}
        </Link>
      </td>
      <td className="px-3 py-4">
        <Badge variant="outline" className="text-xs font-normal">
          {caseTypeLabel(c.case_type)}
        </Badge>
      </td>
      <td className="px-3 py-4 font-mono text-[13px] text-muted-foreground">
        {c.case_ref ?? "—"}
      </td>
      <td className="px-3 py-4 text-right font-mono text-[13px] text-foreground">
        {c.member_count}
      </td>
      <td className="px-3 py-4 text-right font-mono text-[13px] text-foreground">
        {c.document_count}
      </td>
      <td className="px-3 py-4 text-right font-mono text-[13px] text-foreground">
        {c.conversation_count}
      </td>
      <td className="px-5 py-4 text-muted-foreground">
        {formatDistanceToNow(new Date(c.last_activity_at), { addSuffix: true })}
      </td>
    </tr>
  );
}

function MobileCaseRow({ c, ownerIsMe }: { c: CaseListItem; ownerIsMe: boolean }) {
  return (
    <Link
      to="/cases/$caseId"
      params={{ caseId: c.id }}
      className="block px-5 py-4 hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{c.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px] font-normal">
              {caseTypeLabel(c.case_type)}
            </Badge>
            {c.case_ref && (
              <span className="font-mono text-[11px]">{c.case_ref}</span>
            )}
            {!ownerIsMe && <span>· Shared</span>}
          </div>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(c.last_activity_at), { addSuffix: true })}
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-[11px] font-mono text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" /> {c.member_count}
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" /> {c.document_count}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquareText className="h-3 w-3" /> {c.conversation_count}
        </span>
      </div>
    </Link>
  );
}

function EmptyState({
  onCreate,
  hasCases,
}: {
  onCreate: () => void;
  hasCases: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="text-sm text-muted-foreground">
        {hasCases ? "No cases match this view." : "You don't have any cases yet."}
      </div>
      {!hasCases && (
        <Button onClick={onCreate} size="sm">
          <Plus className="h-4 w-4" /> Create your first case
        </Button>
      )}
    </div>
  );
}
