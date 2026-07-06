import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "./assistant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/cases")({
  head: () => ({ meta: [{ title: "Cases — Nota" }] }),
  component: CasesPage,
});

function CasesPage() {
  const { user } = Route.useRouteContext();
  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Cases"
        title="Every patient record, organized."
        body="Group discharge summaries, imaging, and notes by case. Nota keeps identifiers precise and searchable."
      />
      <Card className="mt-8">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>All cases</CardTitle>
            <CardDescription>Your workspace is empty for now.</CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            0 open
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            No cases yet
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
