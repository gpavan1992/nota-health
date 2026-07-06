import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { NotaLogo } from "@/components/nota-logo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Nota Health" },
      {
        name: "description",
        content:
          "How Nota Health handles information for the hosted website and hosted demo. Self-hosted deployments run entirely on your own infrastructure.",
      },
      { property: "og:title", content: "Privacy Policy — Nota Health" },
      {
        property: "og:description",
        content:
          "How the Nota Health hosted demo handles data. Not intended for real PHI — self-host for clinical use.",
      },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-primary">
          Legal
        </p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: July 6, 2026
        </p>

        <div className="mt-10 space-y-10 text-[0.95rem] leading-relaxed text-foreground">
          <Callout>
            <strong>Hosted demo notice.</strong> The hosted Nota Health application at
            this domain is provided for evaluation only.{" "}
            <em>
              Do not upload real Protected Health Information (PHI), patient
              records, or any confidential clinical, research, or personal
              data.
            </em>{" "}
            For real clinical workloads, self-host Nota Health inside your
            organization's HIPAA-aligned environment.
          </Callout>

          <Section n="1" title="Scope of this policy">
            <p>
              This Privacy Policy explains how Nota Health handles information for the
              hosted marketing website and the hosted demo application at this
              domain. It does not describe data handling for self-hosted
              deployments run by hospitals, clinics, research groups, or
              individuals on their own infrastructure.
            </p>
          </Section>

          <Section n="2" title="Self-hosted deployments">
            <p>
              If you self-host Nota Health using your own infrastructure, database,
              storage, and AI model provider keys, the Nota Health maintainers do not
              receive your account data, uploaded documents, prompts, chats,
              case libraries, extractions, or usage data. Data handling in a
              self-hosted deployment is governed entirely by the hosting,
              storage, model, and configuration choices you and your
              organization make.
            </p>
            <p>
              Self-hosted deployments used for real clinical care are the
              responsibility of the deploying organization, including HIPAA,
              GDPR, PIPEDA, and any other applicable regulatory obligations,
              Business Associate Agreements with subprocessors, workforce
              training, breach response, and audit.
            </p>
          </Section>

          <Section n="3" title="Hosted demo — no PHI">
            <p>
              The hosted demo is a public evaluation service. It has not been
              certified for HIPAA, and no Business Associate Agreement is
              offered or implied. Do not upload, submit, paste, or store
              patient identifiers, clinical notes tied to real people,
              genomics, insurance claim data, or any other regulated or
              sensitive materials. Use only synthetic, de-identified, or
              publicly available example content.
            </p>
          </Section>

          <Section n="4" title="Information we collect on the hosted service">
            <p>
              When you use the hosted website or demo, we may collect
              information needed to operate the service, including:
            </p>
            <List>
              <li>Email address and account credentials</li>
              <li>Organization, role, and clinical setting you enter at sign-up</li>
              <li>
                Documents you upload and text you paste into the assistant,
                extraction, or protocol tools
              </li>
              <li>Prompts, chat history, extracted tables, and generated outputs</li>
              <li>Usage data, settings, protocol definitions, and connector configuration</li>
              <li>Contact form submissions and support correspondence</li>
            </List>
          </Section>

          <Section n="5" title="AI models and training">
            <p>
              Nota Health does not train foundation models on your prompts, uploaded
              documents, chats, or outputs. When you use a third-party AI
              provider (for example Anthropic, OpenAI, or Google) through the
              hosted service or a self-hosted deployment, your inputs are sent
              to the provider selected or configured for that deployment so it
              can generate a response.
            </p>
            <p>
              Third-party model retention, logging, abuse-monitoring, and
              training policies are governed by that provider's API terms. If
              you use locally hosted or on-premise models in a self-hosted
              deployment, prompts and documents stay within that environment
              unless you configure external telemetry or MCP connectors that
              transmit data elsewhere.
            </p>
          </Section>

          <Section n="6" title="How we use hosted service information">
            <List>
              <li>Provide, maintain, secure, and troubleshoot the service</li>
              <li>Process requests and operate product features you invoke</li>
              <li>Respond to contact, support, and security messages</li>
              <li>Understand usage and improve the open source product</li>
              <li>Comply with legal obligations and enforce our terms</li>
            </List>
          </Section>

          <Section n="7" title="Sharing and subprocessors">
            <p>
              We do not sell personal information. We share information only in
              limited circumstances:
            </p>
            <List>
              <li>
                With infrastructure, hosting, database, storage, authentication,
                email, analytics, and AI model providers used to operate the
                hosted service
              </li>
              <li>With your consent or at your direction</li>
              <li>To comply with legal obligations, subpoenas, or court orders</li>
              <li>
                To protect the rights, privacy, safety, security, or property of
                Nota Health, users, patients, or the public
              </li>
            </List>
          </Section>

          <Section n="8" title="Data security">
            <p>
              The hosted service uses technical and organizational measures
              including TLS in transit, encryption at rest, row-level security,
              scoped API keys, and standard access controls. No transmission
              or storage system is perfectly secure, and the hosted demo must
              not be used for PHI or other sensitive clinical materials
              regardless of security controls in place.
            </p>
          </Section>

          <Section n="9" title="Data retention">
            <p>
              We retain hosted service information for as long as needed to
              provide the service, maintain records, resolve disputes, enforce
              agreements, and comply with legal obligations. You may delete
              your hosted demo account and its associated data through account
              settings; some records may be retained where required by law.
            </p>
          </Section>

          <Section n="10" title="Your rights">
            <p>
              Depending on where you live, you may have rights to access,
              correct, delete, port, or restrict processing of your personal
              information, and to object to certain processing. Contact us to
              exercise these rights.
            </p>
          </Section>

          <Section n="11" title="Children">
            <p>
              The hosted service is not intended for children under 13, and we
              do not knowingly collect personal information from them.
            </p>
          </Section>

          <Section n="12" title="Cookies and analytics">
            <p>
              The hosted website and demo may use strictly necessary cookies to
              operate authentication and remember settings, and privacy-respecting
              analytics to understand aggregate usage. You can control cookies
              through your browser settings.
            </p>
          </Section>

          <Section n="13" title="Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. We will post
              the updated policy on this page and update the "last updated"
              date above. Material changes will be communicated in-product or
              by email where required.
            </p>
          </Section>

          <Section n="14" title="Contact">
            <p>
              For privacy questions, data requests, or security disclosures
              relating to the hosted service, contact the Nota Health maintainers
              through the project's GitHub repository or the contact channel
              listed on the marketing website.
            </p>
          </Section>
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <Link to="/" className="text-foreground">
            <NotaLogo size="sm" />
          </Link>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/compliance" className="hover:text-foreground">Compliance</Link>
          </div>
        </div>
      </main>
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
