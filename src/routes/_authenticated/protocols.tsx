import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "./assistant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/protocols")({
  head: () => ({ meta: [{ title: "Protocols — Nota" }] }),
  component: ProtocolsPage,
});

function ProtocolsPage() {
  const { user } = Route.useRouteContext();
  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Protocols"
        title="Your clinical playbooks, always at hand."
        body="Upload institutional protocols and guidelines. Nota consults them when answering questions on your cases."
      />
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Protocol library</CardTitle>
          <CardDescription>
            Empty for now — add your first protocol document to begin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            No protocols yet
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
