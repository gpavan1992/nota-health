import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Nota" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Welcome"
        title="Your clinical workspace is ready."
        body={`Signed in as ${user.email}. Upload cases, ask the assistant, or configure Nota from the sidebar.`}
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <StatCard label="Cases" value="0" status="ready" />
        <StatCard label="Extracts pending" value="0" status="processing" />
        <StatCard label="Failed jobs" value="0" status="ready" />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Uploads and assistant sessions will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            Nothing to show yet
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "ready" | "processing" | "failed";
}) {
  const dotClass =
    status === "ready"
      ? "bg-success"
      : status === "processing"
        ? "bg-warning"
        : "bg-destructive";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <Badge variant="outline" className="gap-1.5 font-mono text-[10px]">
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
            {status}
          </Badge>
        </div>
        <div className="mt-3 font-serif text-3xl text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
