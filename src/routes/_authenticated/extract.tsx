import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/extract")({
  head: () => ({ meta: [{ title: "Clinical Extract — Nota" }] }),
  component: ExtractPage,
});

function ExtractPage() {
  const { user } = Route.useRouteContext();
  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Clinical Extract"
        title="Structured data, straight from the chart."
        body="Pull diagnoses, medications, dosages, and identifiers into a clean, review-ready table."
      />
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Extracted entities</CardTitle>
          <CardDescription>Sample of what Nota will surface.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Value</th>
                  <th className="px-4 py-2 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <ExtractRow type="ICD-10" value="E11.9" ref="Encounter, 2026-06-14" />
                <ExtractRow type="Medication" value="Metformin 500 mg PO BID" ref="Discharge summary" />
                <ExtractRow type="NPI" value="1234567890" ref="Referring provider" />
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Preview only — extraction runs once documents are uploaded.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function ExtractRow({ type, value, ref }: { type: string; value: string; ref: string }) {
  return (
    <tr>
      <td className="px-4 py-3 text-muted-foreground">{type}</td>
      <td className="px-4 py-3 font-mono text-[13px] text-foreground">{value}</td>
      <td className="px-4 py-3 text-muted-foreground">{ref}</td>
    </tr>
  );
}
