import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NotaLogo } from "@/components/nota-logo";


export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Nota Health" },
      {
        name: "description",
        content:
          "Terms of Service for the Nota Health hosted demo and website. Not for real PHI or clinical use — self-host for that.",
      },
      { property: "og:title", content: "Terms of Service — Nota Health" },
      {
        property: "og:description",
        content:
          "The rules for using the Nota Health hosted demo, and the professional-responsibility boundaries for AI outputs in a clinical setting.",
      },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-primary">
          Legal
        </p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: July 6, 2026
        </p>

        <div className="mt-10 space-y-10 text-[0.95rem] leading-relaxed text-foreground">
          <Callout>
            <strong>Demo service · Not a medical device.</strong> The hosted
            Nota Health application at this domain is provided as a public demo for
            evaluation only. It is <em>not</em> cleared or approved as a
            medical device by the FDA, EMA, MHRA, or any other regulator, and
            no Business Associate Agreement is offered. Do not upload real PHI
            or use it for clinical decision-making. For real clinical use,
            self-host Nota Health inside your organization's compliant
            environment.
          </Callout>

          <Section n="1" title="Acceptance of terms">
            <p>
              These Terms of Service are a legally binding agreement between
              you and the Nota Health maintainers regarding your access to and use
              of the hosted website, hosted demo application, open source
              software, APIs, and related services (together, the "Service").
            </p>
            <p>
              By creating an account, clicking to accept these Terms, or using
              the Service, you acknowledge that you have read, understood, and
              agree to be bound by these Terms and our Privacy Policy. If you
              do not agree, you may not use the Service.
            </p>
          </Section>

          <Section n="2" title="Service overview">
            <p>
              Nota Health provides open source clinical AI workflow tools, including
              document upload, patient- and case-scoped workspaces, document
              chat with citations, tabular extraction, reusable clinical
              protocols, and drafting and editing features for clinical
              documentation.
            </p>
            <p>
              The hosted demo is provided for evaluation and testing only. You
              must not upload, submit, transmit, or store PHI, patient
              identifiers, clinical notes tied to real people, insurance claim
              data, or any other restricted, regulated, or confidential
              information. Use only synthetic or de-identified content.
            </p>
            <p>
              The Service may connect to third-party AI providers, hosting
              providers, authentication services, storage services, and other
              infrastructure. We may add, remove, suspend, or modify features
              or third-party integrations at any time.
            </p>
          </Section>

          <Section n="3" title="Eligibility and authority">
            <p>
              You must be at least 18 years old to use the Service. If you use
              the Service on behalf of a hospital, clinic, health system,
              research group, or other organization, you represent that you
              have authority to bind that organization to these Terms.
            </p>
          </Section>

          <Section n="4" title="Accounts and security">
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activity under your account. You
              agree to provide accurate account information and keep it up to
              date. If you believe your account is compromised, contact us
              promptly.
            </p>
          </Section>

          <Section n="5" title="Fees, credits, and AI provider costs">
            <p>
              Some features may be free, metered, usage-limited, or paid. We
              may introduce or change fees, plans, credits, quotas, or usage
              limits with notice where required by law.
            </p>
            <p>
              If you connect your own third-party AI provider API keys
              (Anthropic, OpenAI, Google, or others), you are responsible for
              any charges, usage limits, provider terms, or account
              restrictions imposed by those providers.
            </p>
          </Section>

          <Section n="6" title="User content and AI outputs">
            <p>
              You may submit documents, prompts, text, files, protocol
              definitions, and other materials to the Service ("Input") and
              receive AI-generated summaries, extractions, drafts, edits,
              citations, or other content ("Output"). Input and Output are
              collectively "User Content."
            </p>
            <p>
              As between you and Nota Health, you retain any rights you have in
              your Input. Subject to applicable law and third-party provider
              terms, you are responsible for reviewing and using Output.
            </p>
            <p>
              You grant Nota Health a limited license to host, store, process,
              transmit, and display User Content as necessary to provide,
              secure, troubleshoot, and support the Service.
            </p>
            <p>
              You represent that you have all rights and permissions
              necessary to submit Input, and that your Input and use of the
              Service will not violate HIPAA, GDPR, professional obligations,
              patient consent, third-party rights, court orders, or applicable
              provider terms.
            </p>
          </Section>

          <Section n="7" title="Clinical and professional responsibility">
            <p>
              Nota Health is a software tool. It is <strong>not a medical device</strong>,
              does not provide medical, diagnostic, treatment, coding, billing,
              legal, or other professional advice, and does not establish a
              clinician-patient relationship.
            </p>
            <p>
              AI systems can produce inaccurate, incomplete, outdated, biased,
              or misleading Output. You are solely responsible for reviewing,
              verifying, and exercising independent professional judgment
              before relying on any Output for patient care, prescribing,
              diagnosis, documentation, coding, billing, prior authorization,
              or clinical research. Every Output must be reviewed by a
              qualified healthcare professional before any clinical action is
              taken.
            </p>
          </Section>

          <Section n="8" title="Third-party AI models and services">
            <p>
              The Service may route Input to third-party AI models or
              infrastructure providers selected by you, configured by your
              account, or made available through the Service.
            </p>
            <p>
              Your use of those providers may be subject to additional terms,
              policies, retention settings, and usage restrictions. We are not
              responsible for third-party services, model availability, model
              behavior, pricing, outages, or provider terms.
            </p>
          </Section>

          <Section n="9" title="Prohibited conduct">
            <p>
              You agree not to use the Service for unlawful, harmful,
              infringing, deceptive, abusive, or security-compromising
              activity. You may not:
            </p>
            <List>
              <li>
                Upload real PHI, patient identifiers, or other regulated
                clinical data to the hosted demo
              </li>
              <li>
                Use Output as a substitute for clinician review, or represent
                Output as verified clinical advice
              </li>
              <li>
                Attempt unauthorized access to the Service, other accounts, or
                other users' data
              </li>
              <li>
                Interfere with the Service, upload malware, bypass usage
                limits, or misrepresent your identity or credentials
              </li>
              <li>
                Submit Input you do not have the right to use, or that
                violates confidentiality, HIPAA, or intellectual property
                obligations
              </li>
              <li>
                Use the Service in ways that violate third-party AI provider
                terms
              </li>
            </List>
          </Section>

          <Section n="10" title="Open source software and ownership">
            <p>
              The Nota Health application is made available under the GNU AGPL-3.0
              license. Your use, copying, modification, and distribution of
              that open source software is governed by AGPL-3.0, not these
              Terms.
            </p>
            <p>
              The hosted Service, marketing website, brand, name, logo,
              hosted infrastructure, documentation, and non-open-source
              elements are owned by the Nota Health maintainers or their licensors
              and are protected by intellectual property and other laws.
            </p>
          </Section>

          <Section n="11" title="Feedback">
            <p>
              If you send us comments, suggestions, or feedback, you grant us
              a perpetual, irrevocable, worldwide, royalty-free license to use
              that feedback for any purpose without obligation to you.
            </p>
          </Section>

          <Section n="12" title="Privacy and data protection">
            <p>
              Please review our{" "}
              <Link to="/privacy" className="underline">Privacy Policy</Link>{" "}
              for how we collect, use, store, and disclose information on the
              hosted service. The Privacy Policy is incorporated into these
              Terms. Business Associate Agreements are not offered for the
              hosted demo.
            </p>
          </Section>

          <Section n="13" title="Suspension and termination">
            <p>
              You may stop using the Service at any time. We may suspend or
              terminate your access if you violate these Terms, upload PHI to
              the hosted demo, create risk for the Service or other users, or
              if we discontinue the Service or any material feature.
            </p>
          </Section>

          <Section n="14" title="Disclaimers">
            <p className="uppercase">
              The Service, Output, and all content available through the
              Service are provided "as is" and "as available" without
              warranties of any kind, whether express, implied, or statutory.
            </p>
            <p className="uppercase">
              To the maximum extent permitted by law, we disclaim all
              warranties, including implied warranties of merchantability,
              fitness for a particular purpose, title, non-infringement,
              accuracy, availability, security, reliability, and fitness for
              any clinical or medical use.
            </p>
            <p className="uppercase">
              We do not warrant that the Service or Output will be
              uninterrupted, error-free, secure, complete, clinically
              accurate, or suitable for any particular medical, diagnostic,
              billing, or professional use.
            </p>
          </Section>

          <Section n="15" title="Limitation of liability">
            <p className="uppercase">
              To the maximum extent permitted by law, Nota Health and its
              maintainers, contributors, affiliates, officers, employees,
              agents, suppliers, and licensors will not be liable for
              indirect, incidental, special, consequential, exemplary, or
              punitive damages, or for lost profits, lost revenue, lost data,
              loss of goodwill, business interruption, or substitute
              services, or for any injury, harm, or adverse clinical outcome
              arising from reliance on Output.
            </p>
            <p className="uppercase">
              The Service is provided free of charge. To the maximum extent
              permitted by law, Nota Health will not be liable for any damages
              arising out of or relating to the Service or these Terms.
            </p>
          </Section>

          <Section n="16" title="Indemnity">
            <p>
              You will defend, indemnify, and hold harmless Nota Health, its
              maintainers, contributors, and affiliates from and against
              claims, liabilities, damages, losses, and expenses, including
              reasonable attorneys' fees, arising from your use of the
              Service, your User Content, your violation of these Terms, your
              violation of HIPAA or other law, or your violation of
              third-party or patient rights.
            </p>
          </Section>

          <Section n="17" title="Changes to these terms">
            <p>
              We may modify these Terms from time to time. If changes
              materially affect your rights or obligations, we will provide
              reasonable notice, such as by posting the updated Terms or
              sending an in-product notice. Your continued use of the Service
              after the effective date of updated Terms means you accept the
              updated Terms.
            </p>
          </Section>

          <Section n="18" title="Governing law and disputes">
            <p>
              These Terms are governed by the laws of the jurisdiction in
              which the Nota Health project maintainers are established, without
              regard to conflict-of-law principles, unless applicable law
              requires otherwise. Before filing a claim, each party agrees to
              try to resolve the dispute informally by contacting the other.
              If the dispute is not resolved within 30 days, either party may
              pursue available remedies in a court of competent jurisdiction.
            </p>
          </Section>

          <Section n="19" title="Electronic communications">
            <p>
              By using the Service, you consent to receive communications
              from us electronically, including notices, account messages,
              product updates, and legal disclosures.
            </p>
          </Section>

          <Section n="20" title="Contact">
            <p>
              Contact the Nota Health maintainers through the project's GitHub
              repository or the contact channel listed on the marketing
              website.
            </p>
          </Section>
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <Link to="/" className="text-foreground">
            <NotaLogo size="sm" />
          </Link>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/compliance" className="hover:text-foreground">Compliance</Link>
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
