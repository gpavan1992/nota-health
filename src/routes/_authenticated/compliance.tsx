import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Globe, Info, Lock, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance — Nota Health" },
      {
        name: "description",
        content:
          "How Nota Health handles clinical data: encryption, row-level security, HIPAA readiness, data residency, and enterprise controls.",
      },
    ],
  }),
  component: CompliancePage,
});

function CompliancePage() {
  const { user } = Route.useRouteContext();
  const region =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "Unknown";

  return (
    <AppShell user={user}>
      <div className="space-y-10">
        <PageHeader
          eyebrow="Compliance"
          title="Security & compliance"
          body="A plain-language overview of how Nota Health stores, isolates, and protects clinical data — and where the operator's responsibilities begin."
        />

        <Section
          icon={<Lock className="h-4 w-4 text-primary" />}
          title="Data architecture"
          description="How Nota Health handles data in plain language."
        >
          <BulletList
            items={[
              "Documents are stored in a private encrypted storage bucket. Each user's files are isolated from every other user's files at the storage level.",
              "The database enforces row-level security — every query is scoped to the authenticated user. No query can return another user's records even if the application layer is compromised.",
              "API keys are encrypted at rest using AES-256. The plaintext key is never logged, never stored in memory beyond a single request, and never transmitted to any third party.",
              "Nota Health does not store AI conversation contents on any third-party server. Conversations are stored only in the user's own database.",
            ]}
          />
        </Section>

        <Section
          icon={<ShieldCheck className="h-4 w-4 text-primary" />}
          title="HIPAA readiness"
          description="How Nota Health is architected against HIPAA principles."
        >
          <BulletList
            items={[
              "For self-hosted deployments, the operator controls all data residency.",
              "PHI is never logged in audit trails — only resource IDs and event types are recorded, never document content or message text.",
              "Access controlled by individual user authentication with optional MFA.",
              "Every data access event recorded in the audit log with timestamp, user, and action type.",
            ]}
          />
          <Callout>
            Nota Health does not provide a Business Associate Agreement by default. For
            enterprise HIPAA deployments, self-host Nota Health on your own
            infrastructure and execute a BAA with your cloud provider directly.
          </Callout>
        </Section>

        <Section
          icon={<Globe className="h-4 w-4 text-primary" />}
          title="Data residency"
          description="Where your data physically lives."
        >
          <BulletList
            items={[
              "For cloud deployments: data stored in the region selected at setup.",
              "For self-hosted: data never leaves the operator's own infrastructure.",
            ]}
          />
          <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Detected region for this session</span>
            <span className="font-mono text-foreground">{region}</span>
          </div>
        </Section>

        <Section
          icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
          title="Enterprise compliance controls"
          description="A checklist of what is available today and what is on the roadmap."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTROLS.map((c) => (
              <ControlRow key={c.label} available={c.available} label={c.label} />
            ))}
          </div>
        </Section>

        <div className="flex gap-3 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Nota Health is not a certified HIPAA-compliant service. It is architected
            with HIPAA principles in mind and designed for self-hosted
            enterprise deployments where the operator controls compliance. For
            regulated clinical environments, consult your compliance officer
            before deployment.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

const CONTROLS: Array<{ label: string; available: boolean }> = [
  { label: "End-to-end encrypted document storage", available: true },
  { label: "Row-level database security", available: true },
  { label: "Encrypted API key storage", available: true },
  { label: "Full audit log with timestamp, user, and action", available: true },
  { label: "Multi-factor authentication", available: true },
  { label: "Session management with automatic timeout", available: true },
  { label: "Data export for all user data", available: true },
  { label: "Permanent data deletion on request", available: true },
  { label: "Self-hostable on any infrastructure", available: true },
  { label: "Open source — full code auditability", available: true },
  {
    label:
      "Business Associate Agreement — available for self-hosted enterprise deployments",
    available: false,
  },
  { label: "SOC 2 Type II — roadmap", available: false },
  { label: "EHR integration — roadmap", available: false },
];

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-sm text-foreground">
          <span
            aria-hidden
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
          />
          <span className="leading-relaxed text-muted-foreground">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function ControlRow({ available, label }: { available: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/70 bg-card px-3 py-2.5 text-sm">
      {available ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      ) : (
        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
      )}
      <span
        className={
          available ? "text-foreground" : "text-muted-foreground"
        }
      >
        {label}
      </span>
    </div>
  );
}
