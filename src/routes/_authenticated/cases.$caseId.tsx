import { useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FileText, Loader2, MessageSquareText, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCase,
  useCaseDocuments,
  useCaseMembers,
  useCaseConversations,
  useRenameCase,
  useDeleteCase,
  caseTypeLabel,
} from "@/hooks/use-cases";

export const Route = createFileRoute("/_authenticated/cases/$caseId")({
  head: () => ({ meta: [{ title: "Case — Nota Health" }] }),
  component: CaseDetailPage,
  notFoundComponent: CaseNotFound,
  errorComponent: CaseErrorBoundary,
});

function CaseNotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <h1 className="font-serif text-2xl font-medium text-foreground">Case not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This case may have been deleted, or you do not have access to view it.
      </p>
      <Button asChild className="mt-6" variant="outline">
        <Link to="/cases">
          <ArrowLeft className="h-4 w-4" /> Back to cases
        </Link>
      </Button>
    </div>
  );
}

function CaseErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <h1 className="font-serif text-2xl font-medium text-foreground">Could not load case</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button asChild className="mt-6" variant="outline">
        <Link to="/cases">
          <ArrowLeft className="h-4 w-4" /> Back to cases
        </Link>
      </Button>
    </div>
  );
}

function CaseDetailPage() {
  const { user } = Route.useRouteContext();
  const { caseId } = Route.useParams();
  const caseQ = useCase(caseId);
  const membersQ = useCaseMembers(caseId);
  const docsQ = useCaseDocuments(caseId);
  const convosQ = useCaseConversations(caseId);

  if (caseQ.isLoading) {
    return (
      <AppShell user={user}>
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (caseQ.isError || !caseQ.data) {
    throw notFound();
  }

  const c = caseQ.data;
  const isOwner = c.owner_id === user.id;

  return (
    <AppShell user={user}>
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
          <Link to="/cases">
            <ArrowLeft className="h-4 w-4" /> All cases
          </Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal">
              {caseTypeLabel(c.case_type)}
            </Badge>
            {!isOwner && (
              <Badge variant="secondary" className="text-xs font-normal">
                Shared with you
              </Badge>
            )}
          </div>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-foreground">
            {c.name}
          </h1>
          {c.case_ref && (
            <p className="mt-2 font-mono text-sm text-muted-foreground">
              {c.case_ref}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            Last activity {formatDistanceToNow(new Date(c.last_activity_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      <Tabs defaultValue="documents" className="mt-10">
        <TabsList>
          <TabsTrigger value="documents">
            <FileText className="h-3.5 w-3.5" />
            Documents
            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
              {docsQ.data?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-3.5 w-3.5" />
            Members
            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
              {membersQ.data?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="conversations">
            <MessageSquareText className="h-3.5 w-3.5" />
            Conversations
            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
              {convosQ.data?.length ?? 0}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Every document attached to this case.</CardDescription>
            </CardHeader>
            <CardContent>
              {docsQ.data?.length ? (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {docsQ.data.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 font-mono text-[13px] text-foreground">
                        {d.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyRow label="No documents attached yet" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Care team</CardTitle>
              <CardDescription>
                People invited to view this case.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {membersQ.data?.length ? (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {membersQ.data.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                        {m.member_email[0]?.toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm text-foreground">
                        {m.member_email}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        Viewer
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyRow label="No members yet" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>
                Assistant sessions scoped to this case.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {convosQ.data?.length ? (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {convosQ.data.map((cv) => (
                    <li key={cv.id} className="flex items-center gap-3 px-4 py-3">
                      <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm text-foreground">
                        {cv.title ?? "Untitled conversation"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(cv.created_at), { addSuffix: true })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyRow label="No conversations yet" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
      {label}
    </div>
  );
}
