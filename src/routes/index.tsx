import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, MessagesSquare, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({
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
        navigate({ to: "/dashboard", replace: true });
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
    <div className="min-h-screen bg-background">
      <SiteHeader signedIn={signedIn} />
      <main className="mx-auto max-w-6xl px-6 py-20">
        <section className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Nota for healthcare teams
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            An AI assistant that reads your clinical documents so you don't have to.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Nota helps clinicians and health administrators upload medical
            documents, ask questions in plain language, and get grounded,
            source-cited answers—so the record works for the team, not the
            other way around.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Create your account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="mt-20 grid gap-6 sm:grid-cols-3">
          <Feature
            icon={<FileText className="h-5 w-5" />}
            title="Bring your documents"
            body="Upload discharge summaries, protocols, guidelines, and notes. Everything stays scoped to your account."
          />
          <Feature
            icon={<MessagesSquare className="h-5 w-5" />}
            title="Ask, don't scroll"
            body="Ask questions the way you'd ask a colleague. Nota answers with citations back to the source document."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Built for clinical trust"
            body="Private by default, with a calm, focused interface designed for how healthcare teams actually work."
          />
        </section>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-card-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
