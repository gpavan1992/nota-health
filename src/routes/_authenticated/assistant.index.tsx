import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { useChatThreads, useCreateThread } from "@/hooks/use-chat-threads";

export const Route = createFileRoute("/_authenticated/assistant/")({
  component: AssistantIndex,
});

function AssistantIndex() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: threads, isLoading } = useChatThreads(user.id);
  const create = useCreateThread(user.id);
  const started = useRef(false);

  useEffect(() => {
    if (isLoading || started.current) return;
    started.current = true;
    if (threads && threads.length > 0) {
      navigate({ to: "/assistant/$threadId", params: { threadId: threads[0].id }, replace: true });
    } else {
      create.mutate(undefined, {
        onSuccess: (t) =>
          navigate({ to: "/assistant/$threadId", params: { threadId: t.id }, replace: true }),
      });
    }
  }, [isLoading, threads, navigate, create]);

  return (
    <AppShell user={user}>
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Opening the assistant…
      </div>
    </AppShell>
  );
}
