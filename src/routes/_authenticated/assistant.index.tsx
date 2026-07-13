import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { useCreateThread } from "@/hooks/use-chat-threads";

export const Route = createFileRoute("/_authenticated/assistant/")({
  component: AssistantIndex,
});

function AssistantIndex() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const create = useCreateThread(user.id);
  const started = useRef(false);

  // Always start a fresh conversation — never resume a previous thread here.
  // History lives in the sidebar's "Chat History" section.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    create.mutate(undefined, {
      onSuccess: (t) =>
        navigate({ to: "/assistant/$threadId", params: { threadId: t.id }, replace: true }),
    });
  }, [navigate, create]);

  return (
    <AppShell user={user}>
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Opening a new chat…
      </div>
    </AppShell>
  );
}
