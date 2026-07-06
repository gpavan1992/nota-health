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

function FeatureGrid() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionEyebrow>What Nota Health does</SectionEyebrow>
        <h2 className="mt-3 max-w-2xl font-serif text-3xl font-medium tracking-tight sm:text-4xl">
          Four workflows that already run in every clinic — done in a fraction
          of the time.
        </h2>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <FeatureCard
            title="Assistant"
            body="A chat interface that reads your medical documents, gives grounded citations, runs multi-step clinical workflows, and drafts notes end-to-end."
            tint="from-primary/[0.05] via-transparent to-emerald-500/[0.06]"
            mock={<AssistantMock />}
          />
          <FeatureCard
            title="Cases"
            body="Patient-scoped workspaces. Upload H&Ps, discharge summaries, imaging reports, and labs into a case; the assistant keeps full context across every conversation and every document."
            tint="from-emerald-500/[0.06] via-transparent to-sky-500/[0.07]"
            mock={<CasesMock />}
          />
          <FeatureCard
            title="Tabular extraction"
            body="Spreadsheet-style extraction across hundreds of charts in parallel. Every cell is verifiably cited back to a page and a quote, with no hallucinated values or dead links."
            tint="from-sky-500/[0.06] via-transparent to-primary/[0.05]"
            mock={<TabularMock />}
          />
          <FeatureCard
            title="Protocols"
            body="Save proven prompts as reusable clinical protocols — discharge summaries, prior auth reviews, appeal letters, ICD coding. Create department-wide templates your team can run in one click."
            tint="from-primary/[0.05] via-transparent to-emerald-500/[0.06]"
            mock={<ProtocolsMock />}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  body,
  tint,
  mock,
}: {
  title: string;
  body: string;
  tint: string;
  mock: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-gradient-to-br ${tint} p-6 sm:p-8`}
    >
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
        {mock}
      </div>
      <h3 className="mt-8 font-serif text-2xl font-medium tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

/* ---- Mock: Assistant ---- */

function AssistantMock() {
  return (
    <div className="w-full max-w-[340px]">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Clinical Assistant
        </span>
      </div>

      <div className="rounded-lg border border-border bg-card p-3 text-[11px]">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="font-medium text-foreground">Completed in 4 steps</span>
          <span className="text-muted-foreground">▾</span>
        </div>
        <ul className="mt-2 space-y-1.5">
          <StepRow ok label="Read discharge_summary_alvarez.pdf" />
          <StepRow ok label="Applied protocol · Discharge Summary" />
          <StepRow ok label="Extracted meds, diagnoses, follow-up" />
          <StepRow label="Drafted Discharge Summary.docx" />
        </ul>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-foreground">
        Generated a discharge summary for M. Alvarez (CHF exacerbation, I50.23)
        with medication reconciliation and 7-day follow-up plan.
      </p>

      <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-muted/40 p-2 text-[11px]">
        <div>
          <div className="font-medium text-foreground">Discharge Summary</div>
          <div className="font-mono text-[10px] text-primary">DOCX</div>
        </div>
        <div className="grid h-6 w-6 place-items-center rounded border border-border bg-card text-muted-foreground">
          ↓
        </div>
      </div>

      <div className="mt-3 rounded-md border border-border bg-card px-2 py-1.5">
        <div className="text-[11px] text-muted-foreground">
          Ask a question about this chart…
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Claude Sonnet 4.6</span>
          <span className="grid h-5 w-5 place-items-center rounded bg-foreground text-background">
            →
          </span>
        </div>
      </div>
    </div>
  );
}

function StepRow({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <li className="flex items-center gap-2 text-[11px] text-foreground">
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-success" : "bg-muted-foreground/40"}`}
      />
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

/* ---- Mock: Cases ---- */

function CasesMock() {
  const docs = [
    "H&P_alvarez_2026-05-12.pdf",
    "Echo_report_LVEF_35.pdf",
    "BMP_CBC_lab_panel.pdf",
    "CXR_read_impression.pdf",
    "Med_reconciliation.pdf",
    "Cardiology_consult_note.pdf",
    "Discharge_summary_draft.pdf",
    "Prior_auth_entresto.pdf",
  ];
  return (
    <div className="w-full max-w-[360px]">
      <div className="text-[11px] text-muted-foreground">
        Cases <span className="mx-1">›</span>
        <span className="font-serif text-lg font-medium text-foreground">
          Alvarez, M. · CHF
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4 border-b border-border pb-2 text-[11px]">
        <span className="font-medium text-foreground">Documents</span>
        <span className="text-muted-foreground">Assistant</span>
        <span className="text-muted-foreground">Tabular reviews</span>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-3 pb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span className="h-3 w-3 rounded border border-border" />
          <span>Name</span>
        </div>
        <ul className="space-y-1.5">
          {docs.map((d) => (
            <li key={d} className="flex items-center gap-3 text-[11px]">
              <span className="h-3 w-3 rounded border border-border" />
              <FileText className="h-3 w-3 text-primary/70" />
              <span className="truncate text-foreground">{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---- Mock: Tabular extraction ---- */

function TabularMock() {
  const rows: Array<{
    doc: string;
    dx: string;
    dxTone: "primary" | "accent" | "warn";
    val: string;
    status: "green" | "amber";
  }> = [
    { doc: "alvarez_M_HP.pdf", dx: "HFrEF", dxTone: "primary", val: "LVEF 35%", status: "green" },
    { doc: "chen_L_echo_2026.pdf", dx: "HFrEF", dxTone: "primary", val: "LVEF 28%", status: "green" },
    { doc: "obi_A_cards_note.pdf", dx: "HFpEF", dxTone: "accent", val: "LVEF 55%", status: "amber" },
    { doc: "singh_R_discharge.pdf", dx: "HFrEF", dxTone: "primary", val: "LVEF 40%", status: "green" },
    { doc: "kim_S_echo.pdf", dx: "HFmrEF", dxTone: "warn", val: "LVEF 45%", status: "amber" },
    { doc: "garza_M_HP.pdf", dx: "HFrEF", dxTone: "primary", val: "LVEF 30%", status: "green" },
  ];
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  } as const;
  return (
    <div className="w-full max-w-[360px] text-[11px]">
      <div className="grid grid-cols-[1fr_70px_70px] items-center gap-2 border-b border-border pb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-border" />
          Document
        </span>
        <span>Class</span>
        <span>LVEF</span>
      </div>
      <ul>
        {rows.map((r) => (
          <li
            key={r.doc}
            className="grid grid-cols-[1fr_70px_70px] items-center gap-2 border-b border-border/60 py-1.5"
          >
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-border" />
              <span className="truncate text-foreground">{r.doc}</span>
            </span>
            <span
              className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${toneMap[r.dxTone]}`}
            >
              {r.dx}
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              {r.val}
              <span
                className={`h-1.5 w-1.5 rounded-full ${r.status === "green" ? "bg-success" : "bg-amber-500"}`}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---- Mock: Protocols ---- */

function ProtocolsMock() {
  const items = [
    "Discharge Summary",
    "Prior Authorization Review",
    "Insurance Appeal Letter",
    "Referral Letter",
    "H&P Summary",
    "Medication Reconciliation",
    "ICD-11 Coding Review",
    "Progress Note Draft",
    "Clinical Trial Eligibility",
    "Radiology Impression Summary",
    "Consult Response Draft",
  ];
  return (
    <div className="w-full max-w-[320px]">
      <div className="font-serif text-lg font-medium tracking-tight text-foreground">
        Protocols
      </div>
      <div className="mt-3 border-b border-border pb-1.5 text-[11px] font-medium text-foreground">
        All protocols
      </div>
      <div className="mt-2 grid grid-cols-[16px_1fr] items-center gap-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span />
        <span>Name</span>
      </div>
      <ul>
        {items.map((i) => (
          <li
            key={i}
            className="grid grid-cols-[16px_1fr] items-center gap-2 py-1 text-[11px]"
          >
            <span className="h-3 w-3 rounded border border-border" />
            <span className="text-foreground">{i}</span>
          </li>
        ))}
      </ul>
    </div>
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
          <FooterItem>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          </FooterItem>
          <FooterDot />
          <FooterItem>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </FooterItem>
          <FooterDot />
          <FooterItem>
            <Link to="/compliance" className="hover:text-foreground">Compliance</Link>
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
