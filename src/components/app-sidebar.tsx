import { useState } from "react";
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
  Pill,
  BookOpen,
  UserRound,
  Hash,
  ShieldCheck,
  MoreHorizontal,
  Pencil,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { NotaLogo } from "@/components/nota-logo";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/hooks/use-profile";
import {
  useChatThreads,
  useCreateThread,
  useDeleteThread,
  useRenameThread,
} from "@/hooks/use-chat-threads";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";


const NAV = [
  { title: "Clinical Assistant", to: "/assistant", icon: MessageSquareText },
  { title: "Cases", to: "/cases", icon: FolderOpen },
  { title: "Clinical Extract", to: "/extract", icon: FileSearch },
  { title: "Protocols", to: "/protocols", icon: BookMarked },
] as const;

const TOOLS = [
  { title: "Drug Database", to: "/tools/drug", icon: Pill },
  { title: "Medical Literature", to: "/tools/pubmed", icon: BookOpen },
  { title: "Provider Verification", to: "/tools/provider", icon: UserRound },
  { title: "ICD Code Lookup", to: "/tools/icd", icon: Hash },
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
  const deleteThread = useDeleteThread(user.id);
  const renameThread = useRenameThread(user.id);

  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);

  function submitRename() {
    if (!renaming) return;
    const title = renaming.title.trim();
    if (!title) return;
    renameThread.mutate(
      { threadId: renaming.id, title },
      {
        onSuccess: () => {
          toast.success("Renamed");
          setRenaming(null);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    deleteThread.mutate(id, {
      onSuccess: () => {
        toast.success("Chat deleted");
        setDeleting(null);
        if (activeThreadId === id) {
          navigate({ to: "/assistant" });
        }
      },
      onError: (e) => toast.error(e.message),
    });
  }


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

        <SidebarGroup>
          <SidebarGroupLabel className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/50">
            Clinical Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TOOLS.map((item) => {
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
                    <div className="group/thread relative flex items-center">
                      <SidebarMenuButton
                        asChild
                        size="sm"
                        isActive={activeThreadId === t.id}
                        className="pr-8"
                      >
                        <Link to="/assistant/$threadId" params={{ threadId: t.id }}>
                          <MessageCircle />
                          <span className="flex-1 truncate">{t.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label="Chat actions"
                            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-sidebar-foreground/60 opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-hover/thread:opacity-100 data-[state=open]:opacity-100"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => setRenaming({ id: t.id, title: t.title })}
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleting({ id: t.id, title: t.title })}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
            to="/compliance"
            aria-label="Compliance"
            className="rounded-md p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
          >
            <ShieldCheck className="h-4 w-4" />
          </Link>
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

    <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename chat</DialogTitle>
        </DialogHeader>
        <Input
          value={renaming?.title ?? ""}
          onChange={(e) =>
            setRenaming((r) => (r ? { ...r, title: e.target.value } : r))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitRename();
            }
          }}
          autoFocus
          placeholder="Chat title"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setRenaming(null)}>
            Cancel
          </Button>
          <Button onClick={submitRename} disabled={renameThread.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{deleting?.title}&rdquo; and all of its messages will be permanently removed.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

