import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
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
    <SidebarProvider>
      <AppSidebar user={user} profile={profile} />
      <SidebarInset className="bg-background">
        <header className="flex h-14 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-muted-foreground" />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>

        {missingKey && !onSettings && (
          <div className="border-b border-warning/30 bg-warning/10">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-2.5">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <KeyRound className="h-4 w-4 text-warning-foreground" />
                <span>
                  Add your Anthropic API key in Settings to activate the
                  Clinical Assistant.
                </span>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/settings">Open Settings</Link>
              </Button>
            </div>
          </div>
        )}

        <main className="flex-1 px-6 py-10 sm:px-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
