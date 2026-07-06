import { Link, useRouterState } from "@tanstack/react-router";
import {
  MessageSquareText,
  FolderOpen,
  FileSearch,
  BookMarked,
  Settings as SettingsIcon,
  FileText,
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
import type { Profile } from "@/hooks/use-profile";

const NAV = [
  { title: "Clinical Assistant", to: "/assistant", icon: MessageSquareText },
  { title: "Cases", to: "/cases", icon: FolderOpen },
  { title: "Clinical Extract", to: "/extract", icon: FileSearch },
  { title: "Protocols", to: "/protocols", icon: BookMarked },
] as const;

// Static placeholder — real cases wire in once the feature ships.
const RECENT_CASES: { id: string; label: string; mrn: string }[] = [];

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
            {RECENT_CASES.length === 0 ? (
              <p className="px-2 py-2 text-xs leading-relaxed text-sidebar-foreground/50">
                Recently opened cases will appear here.
              </p>
            ) : (
              <SidebarMenu>
                {RECENT_CASES.map((c) => (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton asChild size="sm">
                      <Link to="/cases">
                        <FileText />
                        <span className="flex-1 truncate">{c.label}</span>
                        <span className="font-mono text-[10px] text-sidebar-foreground/50">
                          {c.mrn}
                        </span>
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
