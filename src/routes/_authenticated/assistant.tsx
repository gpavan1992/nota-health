import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquareText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "Clinical Assistant — Nota" }] }),
  component: AssistantPage,
});

function AssistantPage() {
  const { user } = Route.useRouteContext();
  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Clinical Assistant"
        title="Ask across every document in your workspace."
        body="Nota reads uploaded records, extracts, and protocols to answer clinical questions with source-grounded citations."
      />
      <Card className="mt-8">
        <CardHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <CardTitle className="mt-3">Start a conversation</CardTitle>
          <CardDescription>
            Once your Anthropic key is saved, ask a question in plain language
            and Nota will answer against your cases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            The assistant surface will appear here.
          </div>
          <div className="mt-4 flex justify-end">
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">Configure AI</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

export function PageHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-primary">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-foreground">
        {title}
      </h1>
      {body && (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
    </div>
  );
}
