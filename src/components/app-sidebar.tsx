import { Link, useRouterState, useNavigate, useParams } from "@tanstack/react-router";
import {
  MessageSquareText,
  FolderOpen,
  FileSearch,
  BookMarked,
  Settings as SettingsIcon,
  FileText,
  Plus,
  MessageCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NotaLogo } from "@/components/nota-logo";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/hooks/use-profile";
import { useChatThreads, useCreateThread } from "@/hooks/use-chat-threads";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { title: "Clinical Assistant", to: "/assistant", icon: MessageSquareText },
  { title: "Cases", to: "/cases", icon: FolderOpen },
  { title: "Clinical Extract", to: "/extract", icon: FileSearch },
  { title: "Protocols", to: "/protocols", icon: BookMarked },
] as const;

function useRecentCases(userId: string | undefined) {
  return useQuery({
    queryKey: ["recent_cases", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("cases")
        .select("id, name")
        .order("updated_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });
}

const ROLE_LABEL: Record<string, string> = {
  clinician: "Clinician",
  administrator: "Administrator",
  researcher: "Researcher",
  patient_advocate: "Patient Advocate",
};

export function AppSidebar({
  user,
  profile,
}: {
  user: { id: string; email?: string | null };
  profile: Profile | null | undefined;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeThreadId = params.threadId;
  const { data: threads } = useChatThreads(user.id);
  const { data: recentCases } = useRecentCases(user.id);
  const createThread = useCreateThread(user.id);

  function handleNewChat() {
    createThread.mutate(undefined, {
      onSuccess: (t) =>
        navigate({ to: "/assistant/$threadId", params: { threadId: t.id } }),
    });
  }
  const displayName = profile?.full_name?.trim() || user.email || "Signed in";
  const roleLabel = profile?.role ? ROLE_LABEL[profile.role] : "Add your role";

  const initials = (profile?.full_name || user.email || "N")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 pt-5 pb-2">
        <Link
          to="/assistant"
          className="inline-flex items-center gap-2.5 text-sidebar-foreground group-data-[collapsible=icon]:justify-center"
        >
          <NotaLogo
            size="md"
            markClassName="text-sidebar-primary"
            wordClassName="text-sidebar-foreground group-data-[collapsible=icon]:hidden"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <div className="mb-2 px-2 group-data-[collapsible=icon]:hidden">
            <Button
              onClick={handleNewChat}
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 border-sidebar-border/60 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              New chat
            </Button>
          </div>
          <SidebarGroupLabel className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/50">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active =
                  pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                    >
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/50">
            Recent Cases
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {!recentCases || recentCases.length === 0 ? (
              <p className="px-2 py-2 text-xs leading-relaxed text-sidebar-foreground/50">
                Recently opened cases will appear here.
              </p>
            ) : (
              <SidebarMenu>
                {recentCases.map((c) => (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton asChild size="sm">
                      <Link to="/cases/$caseId" params={{ caseId: c.id }}>
                        <FileText />
                        <span className="flex-1 truncate">{c.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/50">
            Chat History
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {!threads || threads.length === 0 ? (
              <p className="px-2 py-2 text-xs leading-relaxed text-sidebar-foreground/50">
                Your conversations will appear here.
              </p>
            ) : (
              <SidebarMenu>
                {threads.slice(0, 15).map((t) => (
                  <SidebarMenuItem key={t.id}>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      isActive={activeThreadId === t.id}
                    >
                      <Link to="/assistant/$threadId" params={{ threadId: t.id }}>
                        <MessageCircle />
                        <span className="flex-1 truncate">{t.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>


      <SidebarFooter className="border-t border-sidebar-border/60 p-3">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {initials || "N"}
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-medium text-sidebar-foreground">
              {displayName}
            </div>
            <div className="truncate text-xs text-sidebar-foreground/60">
              {roleLabel}
            </div>
          </div>
          <Link
            to="/settings"
            aria-label="Settings"
            className="rounded-md p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
