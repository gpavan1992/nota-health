import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NotaLogo } from "@/components/nota-logo";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance — Nota Health" },
      {
        name: "description",
        content:
          "Compliance information for the Nota Health hosted demo: data handling, HIPAA readiness, enterprise controls, and open-source auditability.",
      },
      { property: "og:title", content: "Compliance — Nota Health" },
      {
        property: "og:description",
        content:
          "How Nota Health handles clinical data, approaches HIPAA readiness, and makes compliance controls transparent.",
      },
    ],
    links: [{ rel: "canonical", href: "/compliance" }],
  }),
  component: CompliancePage,
});

const GITHUB_URL = "https://github.com/gpavan1992/nota-health";

function CompliancePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-primary">
          Legal
        </p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
          Compliance
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: July 6, 2026
        </p>

        <div className="mt-10 space-y-10 text-[0.95rem] leading-relaxed text-foreground">
          <Callout>
            <strong>Not a certified HIPAA service.</strong> The hosted Nota
            Health demo is provided for evaluation only and is not certified as
            HIPAA-compliant. Do not upload real Protected Health Information
            (PHI) or other regulated clinical data. For regulated clinical
            environments, self-host Nota Health and execute your own Business
            Associate Agreement with your infrastructure provider.
          </Callout>

          <Section n="1" title="How your data is handled">
            <p>
              Your uploaded documents are stored in a private encrypted storage
              bucket. No one except you can access them.
            </p>
            <p>
              Your AI provider API keys are encrypted at rest. They are never
              logged, never shared, and are used only to power your own
              conversations.
            </p>
            <p>
              Nota Health does not read your documents. AI processing happens
              between your documents and the AI provider you configure. We do
              not see the content.
            </p>
            <p>
              You can permanently delete your account and all associated data
              at any time from Settings. Deletion is immediate and irreversible.
            </p>
          </Section>

          <Section n="2" title="HIPAA readiness">
            <p>
              Nota Health is not a certified HIPAA-compliant service. It is
              architected with HIPAA principles in mind, including:
            </p>
            <List>
              <li>Private encrypted document storage</li>
              <li>No PHI in audit logs — only event types and timestamps</li>
              <li>Individual user authentication with optional multi-factor authentication</li>
              <li>Session timeout after inactivity</li>
              <li>Full audit trail of every data access event</li>
              <li>Self-hostable on infrastructure you control</li>
            </List>
            <p>
              For regulated clinical environments that require a Business
              Associate Agreement (BAA), we recommend self-hosting Nota Health
              so you control the infrastructure and can execute a BAA directly
              with your cloud provider.
            </p>
          </Section>

          <Section n="3" title="Enterprise compliance controls">
            <p>Available now:</p>
            <List>
              <li>End-to-end encrypted document storage</li>
              <li>Row-level database security</li>
              <li>Encrypted API key storage (AES-256)</li>
              <li>Complete audit log with timestamp and action</li>
              <li>Multi-factor authentication</li>
              <li>Automatic session timeout</li>
              <li>Full data export on request</li>
              <li>Permanent data deletion on request</li>
              <li>Self-hostable on any infrastructure</li>
              <li>Open source — full code auditability (AGPL-3.0)</li>
            </List>
            <p>On the roadmap:</p>
            <List>
              <li>Business Associate Agreement (BAA) — enterprise self-hosted</li>
              <li>SOC 2 Type II certification</li>
              <li>EHR integration with audit controls</li>
              <li>Role-based access control for teams</li>
            </List>
          </Section>

          <Section n="4" title="Open source and auditability">
            <p>
              Nota Health is fully open source under the GNU AGPL-3.0 license.
              Your IT and compliance teams can read every line of code that
              touches patient documents, which means there are no black boxes
              or hidden data flows.
            </p>
            <p>
              View the source code:{" "}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
              >
                github.com/gpavan1992/nota-health
              </a>
              .
            </p>
          </Section>

          <Section n="5" title="Medical device disclaimer">
            <p>
              Nota Health is not a medical device. All AI outputs require review
              by a qualified healthcare professional before any clinical action
              is taken. This compliance information is provided for
              transparency purposes only.
            </p>
          </Section>
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <Link to="/" className="text-foreground">
            <NotaLogo size="sm" />
          </Link>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
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
    <section>
      <h2 className="font-serif text-xl font-medium tracking-tight text-foreground">
        {n}. {title}
      </h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5 text-muted-foreground">
      {children}
    </ul>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/[0.06] p-5 text-[0.92rem] leading-relaxed text-foreground">
      {children}
    </div>
  );
}
