import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Lock,
  Hospital,
  ShieldCheck,
  Server,
  Database,
  Award,
  ArrowUp,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotaLogo } from "@/components/nota-logo";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        navigate({ to: "/assistant", replace: true });
      } else {
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (!ready) return <div className="min-h-screen bg-background" />;

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Left panel */}
      <div className="flex min-h-screen flex-col px-6 py-8 sm:px-10 md:px-10 lg:px-14">
        <Link to="/" className="text-foreground">
          <NotaLogo size="md" />
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-8">
                <SignInForm
                  onSuccess={() =>
                    navigate({ to: "/assistant", replace: true })
                  }
                />
              </TabsContent>
              <TabsContent value="signup" className="mt-8">
                <SignUpForm
                  onSignedIn={() =>
                    navigate({ to: "/assistant", replace: true })
                  }
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <ComplianceBadgeRow />
      </div>

      {/* Right panel — social proof, desktop only */}
      <SocialProofPanel />
    </div>
  );
}

/* ---------- Sign In ---------- */

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in");
    onSuccess();
  }

  async function handleForgot() {
    if (!email) {
      toast.error("Enter your work email above first, then click Forgot password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== "undefined" ? window.location.origin + "/auth" : undefined,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent.");
    }
  }

  return (
    <div>
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to your Nota workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signin-email">Work email</Label>
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="signin-password">Password</Label>
            <button
              type="button"
              onClick={handleForgot}
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <Input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <TrustSignalRow className="mt-6" />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Nota?{" "}
        <button
          type="button"
          onClick={() => {
            const t = document.querySelector<HTMLButtonElement>(
              '[role="tab"][value="signup"]',
            );
            t?.click();
          }}
          className="font-medium text-primary hover:underline"
        >
          Create an account
        </button>
      </p>
    </div>
  );
}

/* ---------- Sign Up ---------- */

const ROLE_OPTIONS = [
  "Physician",
  "Nurse Practitioner",
  "Registered Nurse",
  "Clinical Administrator",
  "Health System IT",
  "Medical Researcher",
  "Patient Advocate",
  "Other",
];

const SETTING_OPTIONS = [
  "Hospital — Inpatient",
  "Hospital — Outpatient",
  "Private Practice",
  "Community Health Center",
  "Academic Medical Center",
  "Research Institution",
  "Health Insurance / Payer",
  "Other",
];

function SignUpForm({ onSignedIn }: { onSignedIn: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [role, setRole] = useState("");
  const [setting, setSetting] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ackDisclaimer, setAckDisclaimer] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ackDisclaimer) {
      toast.error("Please acknowledge the clinical review disclaimer to continue.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!role || !setting) {
      toast.error("Please select your role and clinical setting.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
        data: {
          full_name: fullName,
          organisation,
          role_title: role,
          clinical_setting: setting,
          marketing_opt_in: marketing,
          disclaimer_acknowledged_at: new Date().toISOString(),
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Welcome to Nota");
      onSignedIn();
    } else {
      toast.success("Check your email to confirm your account.");
    }
  }

  return (
    <div>
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
          Create your Nota account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Built for clinicians, administrators, and research teams.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="su-name">Full name</Label>
          <Input
            id="su-name"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="su-email">Work email</Label>
          <Input
            id="su-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Use your institutional email for team features.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="su-org">Organisation</Label>
          <Input
            id="su-org"
            required
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            placeholder="Hospital, clinic, or health system name"
            maxLength={160}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="su-role">Your role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="su-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-setting">Clinical setting</Label>
            <Select value={setting} onValueChange={setSetting}>
              <SelectTrigger id="su-setting">
                <SelectValue placeholder="Select setting" />
              </SelectTrigger>
              <SelectContent>
                {SETTING_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="su-pw">Password</Label>
            <Input
              id="su-pw"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-pw2">Confirm password</Label>
            <Input
              id="su-pw2"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
          <label className="flex items-start gap-3 text-sm text-foreground">
            <Checkbox
              checked={ackDisclaimer}
              onCheckedChange={(v) => setAckDisclaimer(v === true)}
              className="mt-0.5"
              required
            />
            <span>
              I understand that Nota is not a medical device and all AI outputs
              require review by a qualified healthcare professional.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <Checkbox
              checked={marketing}
              onCheckedChange={(v) => setMarketing(v === true)}
              className="mt-0.5"
            />
            <span>
              I agree to receive product updates and clinical documentation tips
              from Nota.
            </span>
          </label>
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={loading}
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <TrustSignalRow className="mt-6" />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        By signing up, you agree to our{" "}
        <Link to="/compliance" className="underline hover:text-foreground">
          Terms of Use
        </Link>{" "}
        and{" "}
        <Link to="/compliance" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

/* ---------- Trust signals row (under buttons) ---------- */

function TrustSignalRow({ className = "" }: { className?: string }) {
  const items = [
    { icon: Lock, label: "AES-256 Encrypted" },
    { icon: Hospital, label: "HIPAA Architected" },
    { icon: Sparkles, label: "Open Source" },
  ];
  return (
    <div
      className={
        "flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground " +
        className
      }
    >
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <it.icon className="h-3.5 w-3.5 text-primary" />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ---------- Compliance badges (shield-style, bottom of left panel) ---------- */

type ShieldBadge = {
  label: string;
  sub: string;
  tone: "primary" | "accent" | "neutral";
  icon: typeof Hospital;
};

const COMPLIANCE_BADGES: ShieldBadge[] = [
  { label: "HIPAA", sub: "Architected", tone: "primary", icon: Hospital },
  { label: "AES-256", sub: "Encrypted", tone: "accent", icon: Lock },
  { label: "AGPL-3.0", sub: "Open Source", tone: "neutral", icon: Award },
  { label: "RLS", sub: "Row-Level Security", tone: "primary", icon: Database },
  { label: "Self-Host", sub: "Deployable", tone: "accent", icon: Server },
  { label: "SOC 2", sub: "Roadmap", tone: "neutral", icon: ShieldCheck },
];

function ComplianceShield({ b }: { b: ShieldBadge }) {
  const toneMap = {
    primary: "from-primary/15 to-primary/5 border-primary/30 text-primary",
    accent: "from-foreground/10 to-foreground/[0.02] border-foreground/20 text-foreground",
    neutral: "from-muted to-transparent border-border text-muted-foreground",
  }[b.tone];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={
          "relative flex h-14 w-12 items-center justify-center border bg-gradient-to-b " +
          toneMap
        }
        style={{
          clipPath:
            "polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)",
        }}
      >
        <b.icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="text-center leading-tight">
        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-foreground">
          {b.label}
        </div>
        <div className="text-[0.58rem] uppercase tracking-[0.08em] text-muted-foreground">
          {b.sub}
        </div>
      </div>
    </div>
  );
}

function ComplianceBadgeRow() {
  return (
    <div className="mt-8 border-t border-border pt-6 pb-2">
      <p className="mb-4 text-center text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Security & Compliance
      </p>
      <div className="flex flex-wrap items-start justify-center gap-x-5 gap-y-4">
        {COMPLIANCE_BADGES.map((b) => (
          <ComplianceShield key={b.label} b={b} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Right panel: animated prompt + social proof ---------- */

const ROTATING_PROMPTS = [
  "Summarize this discharge summary for the primary care team…",
  "Draft a prior authorization for semaglutide 1 mg weekly…",
  "Check interactions between warfarin, amiodarone, and fluconazole…",
  "Extract ICD-11 codes from this progress note…",
  "Find recent PubMed evidence on SGLT2 inhibitors in HFpEF…",
  "Verify NPI 1235398476 and license status…",
];

function AnimatedPromptCard() {
  const [promptIdx, setPromptIdx] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const full = ROTATING_PROMPTS[promptIdx];
    let i = 0;
    setTyped("");
    const typer = setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) clearInterval(typer);
    }, 28);
    const next = setTimeout(
      () => setPromptIdx((p) => (p + 1) % ROTATING_PROMPTS.length),
      full.length * 28 + 2200,
    );
    return () => {
      clearInterval(typer);
      clearTimeout(next);
    };
  }, [promptIdx]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-md">
      <div className="mb-3 flex items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/60">
        <Sparkles className="h-3 w-3 text-primary" />
        Clinical Assistant
      </div>
      <div className="flex items-end gap-3 rounded-xl border border-white/10 bg-sidebar/60 p-3">
        <div className="min-h-[3.5rem] flex-1 text-sm leading-relaxed text-sidebar-foreground">
          {typed}
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-middle" />
        </div>
        <button
          type="button"
          aria-label="Send"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Summarize", "Prior Auth", "Interactions", "ICD-11", "PubMed"].map(
          (chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[0.68rem] text-sidebar-foreground/70"
            >
              {chip}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

type StatCard = {
  stat?: string;
  title?: string;
  body: string;
  source?: string;
};

const STATS: StatCard[] = [
  {
    stat: "49%",
    body: "Physicians spend 49% of their time on admin. Only 27% with patients.",
    source: "NEJM Catalyst",
  },
  {
    stat: "15.6h",
    body: "Clinicians spend 15.6 hours per week on documentation.",
    source: "Annals of Internal Medicine",
  },
  {
    stat: "$19.7B",
    body: "Prior authorization denials cost US hospitals $19.7B annually.",
    source: "AMA, 2023",
  },
  {
    stat: "1 in 5",
    body: "1 in 5 prior authorizations are initially denied. 75% approved on appeal.",
    source: "KFF",
  },
];

function SocialProofPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground md:block">
      <EcgBackdrop />
      <div className="relative flex h-full flex-col justify-between gap-8 p-8 lg:p-12 xl:p-14">
        <div>
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-sidebar-foreground/60">
            Why Nota
          </p>
          <h2 className="mt-2 max-w-md font-serif text-2xl font-medium leading-snug tracking-tight text-sidebar-foreground xl:text-3xl">
            Clinical documentation is broken. Nota is the layer that fixes it.
          </h2>
        </div>

        <AnimatedPromptCard />

        <div className="grid grid-cols-2 gap-3 xl:gap-4">
          {STATS.map((s, i) => (
            <StatTile key={i} card={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatTile({ card }: { card: StatCard }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
      {card.stat ? (
        <div className="font-serif text-3xl font-semibold tracking-tight text-primary xl:text-4xl">
          {card.stat}
        </div>
      ) : (
        <div className="font-serif text-base font-medium text-sidebar-foreground">
          {card.title}
        </div>
      )}
      <p className="mt-1.5 text-xs leading-relaxed text-sidebar-foreground/80 xl:text-sm">
        {card.body}
      </p>
      {card.source && (
        <p className="mt-2 text-[0.62rem] uppercase tracking-[0.14em] text-sidebar-foreground/50">
          — {card.source}
        </p>
      )}
    </div>
  );
}

function EcgBackdrop() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="ecg-pattern"
          x="0"
          y="0"
          width="200"
          height="80"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 40 H70 L80 40 L86 20 L92 60 L98 30 L104 40 H200"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-sidebar-primary"
          />
        </pattern>
      </defs>
      <rect width="800" height="600" fill="url(#ecg-pattern)" />
    </svg>
  );
}
