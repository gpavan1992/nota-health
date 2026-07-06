import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  return (
    <AppShell user={user}>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Welcome to Nota
        </h1>
        <p className="mt-3 text-muted-foreground">
          You're signed in as{" "}
          <span className="font-medium text-foreground">{user.email}</span>.
          Your workspace is ready — document upload and AI Q&amp;A are coming
          next.
        </p>
      </div>
      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Your documents</CardTitle>
          <CardDescription>
            Clinical documents you upload will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            No documents yet
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
