import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  FileSearch,
  Github,
  KeyRound,
  Lock,
  MessagesSquare,
  Paperclip,
  Pill,
  ScrollText,
  Server,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Microscope,
  ListChecks,
  FileText,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { NotaLogo, NotaMark } from "@/components/nota-logo";

// Replace with the real repo when it exists. Kept in one place so the
// footer and hero always agree.
const GITHUB_URL = "https://github.com";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nota Health — the open source clinical assistant" },
      {
        name: "description",
        content:
          "Nota Health is an open source clinical assistant. Chat with medical documents, extract structured data, run prior auth reviews — self-hostable, bring-your-own-AI-key, AGPL-3.0.",
      },
      { property: "og:title", content: "Nota Health — the open source clinical assistant" },
      {
        property: "og:description",
        content:
          "Documents, extractions, protocols, and clinical tools for healthcare teams. Self-hostable and open source under AGPL-3.0.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        navigate({ to: "/assistant", replace: true });
      } else {
        setChecked(true);
      }
      setSignedIn(!!data.session);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (!checked) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader signedIn={signedIn} />
      <Hero />
      <FeatureGrid />
      <RolesSection />
      <SecuritySection />
      <OpenSourceSection />
      <SiteFooter />
    </div>
  );
}

/* -------------------------------- Hero -------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <BackgroundGrid />
      <div className="mx-auto grid max-w-6xl gap-14 px-6 pt-20 pb-24 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-28">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Open source · AGPL-3.0
          </div>
          <h1 className="mt-6 font-serif text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Reclaim the hours you lose to charts, prior auths, and discharge
            summaries no one has time to read.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Nota Health is an open source clinical assistant that reads your medical
            documents, extracts the structured data you actually need, and runs
            the paperwork protocols your team does every day.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/auth">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
                <Github className="h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.14em] text-muted-foreground/80">
            Bring your own AI key · Self-hostable · No PHI leaves your infrastructure
          </p>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}

function BackgroundGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
      style={{
        backgroundImage:
          "linear-gradient(to right, color-mix(in oklab, var(--foreground) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 6%, transparent) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
        maskImage:
          "radial-gradient(ellipse at top, black 40%, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at top, black 40%, transparent 75%)",
      }}
    />
  );
}

function ProductPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/10 blur-2xl" />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-primary/10">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <div className="ml-3 flex items-center gap-2 text-xs text-muted-foreground">
            <NotaMark className="h-3.5 w-auto text-primary" />
            <span className="font-mono">nota.app / assistant</span>
          </div>
        </div>

        <div className="grid grid-cols-[130px_1fr]">
          {/* Mini sidebar */}
          <div className="hidden border-r border-border bg-sidebar/95 p-3 text-sidebar-foreground sm:block">
            <div className="mb-4 flex items-center gap-2">
              <NotaMark className="h-4 w-auto text-sidebar-primary" />
              <span className="font-serif text-sm">Nota Health</span>
            </div>
            <MiniNav label="Assistant" active />
            <MiniNav label="Cases" />
            <MiniNav label="Extract" />
            <MiniNav label="Protocols" />
            <div className="mt-4 border-t border-sidebar-border pt-3 text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/50">
              Recent
            </div>
            <MiniNav label="M. Alvarez · CHF" sub />
            <MiniNav label="Prior auth · Ozempic" sub />
          </div>

          {/* Chat surface */}
          <div className="space-y-4 p-5">
            {/* Attached doc chip */}
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">discharge_summary_alvarez.pdf</span>
              <span className="text-muted-foreground">· 14 pages</span>
              <span className="ml-auto rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                Ready
              </span>
            </div>

            {/* User message */}
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
              Summarize this discharge and list every medication with dose and
              indication.
            </div>

            {/* AI response */}
            <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-card p-4 text-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Clinical Assistant
              </div>
              <p className="leading-relaxed text-foreground">
                72-year-old female admitted for acute decompensated CHF (
                <span className="font-mono text-primary">I50.23</span>).
                Diuresed with IV furosemide, transitioned to oral regimen.
                Discharged in stable condition.
              </p>

              <div className="mt-3 overflow-hidden rounded-md border border-border">
                <div className="grid grid-cols-[1fr_80px_1fr] bg-muted/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Medication</span>
                  <span>Dose</span>
                  <span>Indication</span>
                </div>
                <MedRow name="Furosemide" dose="40 mg PO BID" ind="Volume overload" />
                <MedRow name="Metoprolol succ." dose="50 mg PO daily" ind="HFrEF" />
                <MedRow name="Lisinopril" dose="10 mg PO daily" ind="Afterload" />
                <MedRow
                  name="Spironolactone"
                  dose="25 mg PO daily"
                  ind="MRA — HFrEF"
                  last
                />
              </div>

              <p className="mt-3 text-[11px] italic text-muted-foreground">
                For clinical review only. Not a substitute for professional
                medical judgment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniNav({
  label,
  active,
  sub,
}: {
  label: string;
  active?: boolean;
  sub?: boolean;
}) {
  return (
    <div
      className={`truncate rounded px-2 py-1 text-[11px] ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : sub
            ? "text-sidebar-foreground/60"
            : "text-sidebar-foreground/80"
      }`}
    >
      {label}
    </div>
  );
}

function MedRow({
  name,
  dose,
  ind,
  last,
}: {
  name: string;
  dose: string;
  ind: string;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_80px_1fr] items-center px-3 py-1.5 text-[11px] ${
        last ? "" : "border-b border-border/70"
      }`}
    >
      <span className="font-medium">{name}</span>
      <span className="font-mono text-muted-foreground">{dose}</span>
      <span className="text-muted-foreground">{ind}</span>
    </div>
  );
}

/* ------------------------------ Features ------------------------------ */

const FEATURES = [
  {
    icon: MessagesSquare,
    title: "Clinical document chat",
    body: "Ask questions about any medical document in plain language. Answers cite the exact section they came from.",
  },
  {
    icon: FileSearch,
    title: "Structured clinical extraction",
    body: "Pull medications, diagnoses, lab values, vitals, and follow-up tasks into organized tables — automatically.",
  },
  {
    icon: ScrollText,
    title: "Pre-built clinical protocols",
    body: "Prior auth review, discharge summary analysis, referral drafting, insurance appeals — ready on day one.",
  },
  {
    icon: Stethoscope,
    title: "Clinical intelligence tools",
    body: "Drug interactions, medical literature search, provider verification, ICD code lookup — all in one place.",
  },
] as const;

function FeatureGrid() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionEyebrow>What Nota Health does</SectionEyebrow>
        <h2 className="mt-3 max-w-2xl font-serif text-3xl font-medium tracking-tight sm:text-4xl">
          Four workflows that already run in every clinic — done in a fraction
          of the time.
        </h2>

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="group bg-card p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Roles -------------------------------- */

const ROLES = [
  {
    icon: Stethoscope,
    title: "Clinicians",
    subtitle: "At the bedside and in the clinic.",
    items: [
      { icon: MessagesSquare, label: "Document chat" },
      { icon: ClipboardList, label: "Prior auth assistant" },
      { icon: FileText, label: "Discharge summary analysis" },
      { icon: ScrollText, label: "Referral drafting" },
    ],
  },
  {
    icon: Users,
    title: "Administrators",
    subtitle: "For the operations behind care.",
    items: [
      { icon: FileSearch, label: "Department case libraries" },
      { icon: ScrollText, label: "Insurance appeal letters" },
      { icon: Users, label: "Team access management" },
      { icon: ListChecks, label: "Workflow audit trails" },
    ],
  },
  {
    icon: Microscope,
    title: "Researchers",
    subtitle: "For evidence-driven work.",
    items: [
      { icon: ClipboardList, label: "Clinical trial eligibility review" },
      { icon: BookOpen, label: "Literature search" },
      { icon: FileSearch, label: "Multi-document extraction" },
      { icon: Pill, label: "Drug interaction analysis" },
    ],
  },
] as const;

function RolesSection() {
  return (
    <section className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionEyebrow>Built for every healthcare role</SectionEyebrow>
        <h2 className="mt-3 max-w-2xl font-serif text-3xl font-medium tracking-tight sm:text-4xl">
          One workspace — three very different jobs.
        </h2>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div
              key={r.title}
              className="flex flex-col rounded-xl border border-border bg-card p-7"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <r.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{r.title}</h3>
                  <p className="text-xs text-muted-foreground">{r.subtitle}</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3 border-t border-border pt-6">
                {r.items.map((it) => (
                  <li
                    key={it.label}
                    className="flex items-center gap-3 text-sm text-foreground"
                  >
                    <it.icon className="h-4 w-4 shrink-0 text-primary" />
                    <span>{it.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Security ------------------------------- */

const SECURITY = [
  { icon: Server, label: "Self-hostable on your own infrastructure" },
  { icon: Lock, label: "Documents never leave your private storage bucket" },
  {
    icon: KeyRound,
    label: "Bring your own AI key — Nota Health never sees your AI traffic",
  },
  {
    icon: ShieldCheck,
    label: "Row-level security — no user can access another user's data",
  },
  { icon: ListChecks, label: "Audit log of every action" },
  { icon: ShieldCheck, label: "Multi-factor authentication built in" },
] as const;

function SecuritySection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
          <div>
            <SectionEyebrow>Security & compliance</SectionEyebrow>
            <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight sm:text-4xl">
              The controls your IT security team asks for first.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Nota Health is designed for the review meeting, not the demo. Every claim
              here maps to an option you can verify in the code and the
              settings panel.
            </p>
            <div className="mt-8">
              <Button asChild variant="outline">
                <Link to="/auth">Read the compliance overview</Link>
              </Button>
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {SECURITY.map((s) => (
              <li
                key={s.label}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <span className="text-sm leading-relaxed text-foreground">
                  {s.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Open Source ----------------------------- */

function OpenSourceSection() {
  return (
    <section className="border-b border-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <SectionEyebrow className="text-sidebar-primary">
              Open source
            </SectionEyebrow>
            <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight sm:text-4xl">
              Nota Health is free and open source — AGPL-3.0.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-sidebar-foreground/75">
              Built for the healthcare community, not a vendor. Anyone can audit
              the code, self-host for their team, or contribute. No vendor
              lock-in, no phone-home telemetry, no proprietary black box between
              you and your patients' data.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
              >
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Github className="h-4 w-4" />
                  View the repository
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-sidebar-border/60 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Link to="/auth">Try the hosted version</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-sidebar-border/50 bg-sidebar-accent/40 p-6">
            <div className="flex items-center justify-between border-b border-sidebar-border/40 pb-4">
              <div className="flex items-center gap-2 text-sm">
                <Github className="h-4 w-4" />
                <span className="font-mono">nota-health / nota</span>
              </div>
              <span className="rounded-full border border-sidebar-border/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sidebar-foreground/70">
                AGPL-3.0
              </span>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              <RepoBullet>Anyone can audit the code line by line.</RepoBullet>
              <RepoBullet>Self-host for your team on your own cloud or on-prem.</RepoBullet>
              <RepoBullet>Contribute protocols, integrations, and fixes.</RepoBullet>
              <RepoBullet>No account required to read the source.</RepoBullet>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function RepoBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sidebar-foreground/85">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-primary" />
      <span>{children}</span>
    </li>
  );
}

/* ------------------------------- Footer ------------------------------- */

function SiteFooter() {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <NotaLogo size="sm" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <FooterItem>Nota Health</FooterItem>
          <FooterDot />
          <FooterItem>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
              Open Source
            </a>
          </FooterItem>
          <FooterDot />
          <FooterItem>AGPL-3.0</FooterItem>
          <FooterDot />
          <FooterItem>Not a medical device</FooterItem>
          <FooterDot />
          <FooterItem>All outputs require clinical review</FooterItem>
          <FooterDot />
          <FooterItem>
            <Link to="/compliance">Compliance</Link>
          </FooterItem>
        </div>
      </div>
    </footer>
  );
}

function FooterItem({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}
function FooterDot() {
  return <span className="text-muted-foreground/40">·</span>;
}

/* ------------------------------- Helpers ------------------------------- */

function SectionEyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-[0.72rem] font-medium uppercase tracking-[0.16em] text-primary ${className}`}
    >
      {children}
    </p>
  );
}
