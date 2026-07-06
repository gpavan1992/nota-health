import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Stethoscope, LogOut, KeyRound } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";

export function AppShell({
  user,
  children,
}: {
  user: { id: string; email?: string | null };
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile, isLoading } = useProfile(user.id);

  const missingKey = !isLoading && !profile?.anthropic_api_key;
  const onSettings = pathname.startsWith("/settings");

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2 text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Stethoscope className="h-4 w-4" />
              </span>
              <span className="text-lg font-semibold tracking-tight">Nota</span>
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink to="/dashboard" label="Dashboard" />
              <NavLink to="/settings" label="Settings" />
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {missingKey && !onSettings && (
        <div className="border-b border-border bg-accent/60">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
            <div className="flex items-center gap-2 text-sm text-accent-foreground">
              <KeyRound className="h-4 w-4" />
              <span>
                Add your Anthropic API key in Settings to start chatting with
                your documents.
              </span>
            </div>
            <Button asChild size="sm" variant="default">
              <Link to="/settings">Open Settings</Link>
            </Button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
    </div>
  );
}

function NavLink({ to, label }: { to: "/dashboard" | "/settings"; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      activeProps={{ className: "bg-accent text-accent-foreground" }}
    >
      {label}
    </Link>
  );
}
