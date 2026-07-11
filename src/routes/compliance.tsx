import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance — Nota Health" },
      {
        name: "description",
        content:
          "How Nota Health handles clinical data: encryption, HIPAA readiness, enterprise controls, and open-source auditability.",
      },
      { property: "og:title", content: "Compliance — Nota Health" },
      {
        property: "og:description",
        content:
          "Plain-language transparency on how Nota Health stores, isolates, and protects clinical data.",
      },
    ],
    links: [{ rel: "canonical", href: "/compliance" }],
  }),
  component: CompliancePage,
});

const GITHUB_URL = "https://github.com/gpavan1992/nota";

function CompliancePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <div className="flex flex-col items-start gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted/40">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-primary">
            Compliance
          </p>
          <h1 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">
            Security & compliance
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Plain-language transparency about how Nota Health stores, isolates,
            and protects clinical data — and where the operator's
            responsibilities begin.
          </p>
        </div>

        <Section n="1" title="How your data is handled">
          <PlainList
            items={[
              "Your documents are stored in a private encrypted storage bucket. No one except you can access them.",
              "Your API keys are encrypted at rest. They are never logged, never shared, and never used for anything except powering your own conversations.",
              "Nota Health never reads your documents. All AI processing happens between your documents and the AI provider you configured. We do not see the content.",
              "You can permanently delete all your data at any time from Settings. Deletion is immediate and irreversible.",
            ]}
          />
        </Section>

        <Section n="2" title="HIPAA readiness">
          <div className="rounded-lg border border-primary/30 bg-primary/[0.06] p-6">
            <p className="text-[0.95rem] leading-relaxed text-foreground">
              <strong className="font-medium">
                Nota Health is not a certified HIPAA-compliant service.
              </strong>{" "}
              It is architected with HIPAA principles in mind:
            </p>
            <ul className="mt-4 space-y-2.5">
              {[
                "Private encrypted document storage",
                "No PHI in audit logs — only event types and timestamps",
                "Individual user authentication with optional MFA",
                "Session timeout after inactivity",
                "Full audit trail of every data access event",
                "Self-hostable — keep all data on your own infrastructure",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-sm text-foreground">
                  <Check />
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              For regulated clinical environments requiring a Business Associate
              Agreement (BAA), we recommend the self-hosted deployment of Nota
              Health where you control the infrastructure and execute a BAA
              directly with your cloud provider.
            </p>
          </div>
        </Section>

        <Section n="3" title="Enterprise compliance controls">
          <div className="grid gap-6 sm:grid-cols-2">
            <ControlColumn
              heading="Available now"
              tone="available"
              items={[
                "End-to-end encrypted document storage",
                "Row-level database security",
                "Encrypted API key storage (AES-256)",
                "Complete audit log with timestamp and action",
                "Multi-factor authentication",
                "Automatic session timeout",
                "Full data export on request",
                "Permanent data deletion on request",
                "Self-hostable on any infrastructure",
                "Open source — full code auditability (AGPL-3.0)",
              ]}
            />
            <ControlColumn
              heading="On the roadmap"
              tone="roadmap"
              items={[
                "Business Associate Agreement (BAA) — enterprise self-hosted",
                "SOC 2 Type II certification",
                "EHR integration with audit controls",
                "Role-based access control for teams",
              ]}
            />
          </div>
        </Section>

        <Section n="4" title="Open source as a trust mechanism">
          <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
            Nota Health is fully open source under AGPL-3.0. This means your IT
            team can read every line of code that touches your patient
            documents. No black boxes. No hidden data flows. No vendor promises
            you have to trust without verification.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            View the source code:{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              github.com/gpavan1992/nota
            </a>
          </p>
        </Section>

        <div className="mt-16 rounded-md border border-border bg-muted/40 p-5 text-sm leading-relaxed text-muted-foreground">
          Nota Health is not a medical device. This compliance information is
          provided for transparency purposes. For regulated clinical
          environments, consult your compliance officer before deployment.
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-muted-foreground">{n}</span>
        <h2 className="font-serif text-2xl font-medium tracking-tight sm:text-3xl">
          {title}
        </h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PlainList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-4">
      {items.map((t) => (
        <li
          key={t}
          className="rounded-md border border-border/70 bg-card px-5 py-4 text-[0.95rem] leading-relaxed text-foreground"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

function ControlColumn({
  heading,
  tone,
  items,
}: {
  heading: string;
  tone: "available" | "roadmap";
  items: string[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {heading}
      </h3>
      <ul className="mt-4 space-y-3">
        {items.map((t) => (
          <li key={t} className="flex gap-3 text-sm">
            {tone === "available" ? <Check /> : <RingMark />}
            <span
              className={
                tone === "available"
                  ? "leading-relaxed text-foreground"
                  : "leading-relaxed text-muted-foreground"
              }
            >
              {t}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Check() {
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-primary"
    >
      ✓
    </span>
  );
}

function RingMark() {
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground/60"
    >
      ○
    </span>
  );
}
