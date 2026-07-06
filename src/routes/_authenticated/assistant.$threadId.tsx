import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUp,
  BookMarked,
  FileText,
  FolderOpen,
  KeyRound,
  Loader2,
  Paperclip,
  Plus,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useChatMessages, type ChatMessage } from "@/hooks/use-chat-threads";
import { streamChat, type WireMessage } from "@/lib/chat-stream";
import { GroupedModelSelect } from "@/components/grouped-model-select";

export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  validateSearch: (search: Record<string, unknown>) => ({
    seed: typeof search.seed === "string" ? (search.seed as string) : undefined,
  }),
  component: AssistantThread,
});

type Attachment = { name: string; text: string };

function AssistantThread() {
  const { user } = Route.useRouteContext();
  const { threadId } = Route.useParams();
  const { seed } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useProfile(user.id);
  const updateProfile = useUpdateProfile(user.id);
  const { data: savedMessages } = useChatMessages(threadId);

  const [input, setInput] = useState("");

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [pendingUser, setPendingUser] = useState<ChatMessage | null>(null);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [caseList, setCaseList] = useState<{ id: string; name: string }[] | null>(null);
  const [protocolList] = useState([
    { id: "soap", name: "SOAP note", prompt: "Draft a SOAP note from the attached documents." },
    { id: "discharge", name: "Discharge summary", prompt: "Draft a discharge summary from the attached documents." },
    { id: "medrec", name: "Medication reconciliation", prompt: "Perform a medication reconciliation across the attached documents." },
  ]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [savedMessages, streamText, pendingUser]);

  // Reset transient state when switching threads
  useEffect(() => {
    setPendingUser(null);
    setStreamText("");
    setAttachments([]);
    abortRef.current?.abort();
  }, [threadId]);

  // Apply protocol seed prompt from URL, then clear it so refreshes don't repeat.
  useEffect(() => {
    if (seed && !input) {
      setInput(seed);
      navigate({
        to: "/assistant/$threadId",
        params: { threadId },
        search: {},
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, threadId]);


  const modelId = profile?.ai_model ?? "claude-sonnet-4-5";
  const apiKey = profile?.anthropic_api_key ?? "";
  const displayName = profile?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";

  async function loadCases() {
    if (caseList) return;
    const { data } = await supabase.from("cases").select("id, name").order("updated_at", { ascending: false }).limit(20);
    setCaseList(data ?? []);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const f of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        setAttachments((a) => [...a, { name: f.name, text: text.slice(0, 50000) }]);
      };
      reader.readAsText(f);
    }
    e.target.value = "";
  }

  async function linkCase(caseId: string, name: string) {
    const { error } = await supabase.from("chat_threads").update({ case_id: caseId }).eq("id", threadId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["chat_threads", user.id] });
    toast.success(`Linked to ${name}`);
    // Pull case documents
    const { data: docs } = await supabase
      .from("case_documents")
      .select("name")
      .eq("case_id", caseId);
    if (docs && docs.length > 0) {
      setAttachments((a) => [
        ...a,
        ...docs.map((d) => ({ name: d.name, text: "" })),
      ]);
    }
  }

  function usePrompt(text: string) {
    setInput((v) => (v ? v + "\n\n" + text : text));
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    if (!apiKey) {
      toast.error("Add your API key in Settings first.");
      return;
    }

    let content = trimmed;
    if (attachments.length > 0) {
      const docsBlock = attachments
        .map((a) => `--- Document: ${a.name} ---\n${a.text}`)
        .join("\n\n");
      content = `Attached documents:\n\n${docsBlock}\n\nQuestion:\n${trimmed}`;
    }

    // Insert user message
    const { data: userMsg, error: userErr } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: threadId,
        user_id: user.id,
        role: "user",
        content,
        attachments: attachments.map((a) => ({ name: a.name })),
      })
      .select()
      .single();
    if (userErr || !userMsg) {
      toast.error(userErr?.message ?? "Failed to save message");
      return;
    }

    // Update thread title on first message
    const isFirst = (savedMessages?.length ?? 0) === 0;
    if (isFirst) {
      const title = trimmed.slice(0, 60);
      await supabase.from("chat_threads").update({ title, updated_at: new Date().toISOString() }).eq("id", threadId);
    } else {
      await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    }
    qc.invalidateQueries({ queryKey: ["chat_threads", user.id] });

    setInput("");
    setAttachments([]);
    setPendingUser(userMsg);
    setStreamText("");
    setStreaming(true);

    const history: WireMessage[] = [
      ...(savedMessages ?? []).map((m) => ({ role: m.role as WireMessage["role"], content: m.content })),
      { role: "user", content },
    ];

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    try {
      await streamChat({
        apiKey,
        modelId,
        messages: history,
        signal: controller.signal,
        onToken: (t) => {
          acc += t;
          setStreamText(acc);
        },
      });
      // Ensure disclaimer present
      const DISCLAIMER = "For clinical review only. Not a substitute for professional medical judgment.";
      const finalText = acc.includes(DISCLAIMER) ? acc : acc.trimEnd() + `\n\n${DISCLAIMER}`;

      await supabase.from("chat_messages").insert({
        thread_id: threadId,
        user_id: user.id,
        role: "assistant",
        content: finalText,
      });
      qc.invalidateQueries({ queryKey: ["chat_messages", threadId] });
      qc.invalidateQueries({ queryKey: ["chat_threads", user.id] });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error((err as Error).message);
      }
    } finally {
      setStreaming(false);
      setPendingUser(null);
      setStreamText("");
      abortRef.current = null;
    }
  }

  const hasMessages = (savedMessages?.length ?? 0) > 0 || pendingUser || streamText;

  return (
    <AppShell user={user}>
      <div className="mx-auto flex h-[calc(100vh-9rem)] w-full max-w-3xl flex-col">
        {!apiKey && (
          <div className="mb-4 flex items-center justify-between rounded-md border border-warning/40 bg-warning/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <KeyRound className="h-4 w-4 text-warning-foreground" />
              Add your API key to start chatting.
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/settings">Open Settings</Link>
            </Button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto pr-2">
          {!hasMessages ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-primary">
                Clinical Assistant
              </p>
              <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-foreground">
                Good to see you, {displayName}.
              </h1>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                Upload documents or pull them from a Case, then ask a question in plain language.
              </p>
            </div>
          ) : (
            <div className="space-y-6 py-6">
              {(savedMessages ?? []).map((m) => (
                <MessageBubble key={m.id} role={m.role} content={m.content} />
              ))}
              {pendingUser && <MessageBubble role="user" content={pendingUser.content} />}
              {streaming && (
                <MessageBubble
                  role="assistant"
                  content={streamText || "Thinking…"}
                  streaming={!streamText}
                />
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="mt-4 rounded-2xl border border-border bg-card p-3 shadow-sm">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-foreground"
                >
                  <FileText className="h-3 w-3" />
                  {a.name}
                  <button
                    type="button"
                    onClick={() => setAttachments((v) => v.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend(e as unknown as FormEvent);
              }
            }}
            placeholder="Ask a clinical question…"
            className="min-h-[52px] resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
            disabled={streaming}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent">
              <Plus className="h-3.5 w-3.5" />
              <Paperclip className="h-3.5 w-3.5" />
              Documents
              <input type="file" multiple hidden onChange={handleFile} accept=".txt,.md,.csv,.json,.text" />
            </label>

            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs">
                  <BookMarked className="mr-1.5 h-3.5 w-3.5" />
                  Protocols
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-1">
                {protocolList.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => usePrompt(p.prompt)}
                  >
                    {p.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            <Popover onOpenChange={(o) => o && loadCases()}>
              <PopoverTrigger asChild>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs">
                  <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                  Cases
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-1">
                {caseList === null ? (
                  <div className="p-2 text-xs text-muted-foreground">Loading…</div>
                ) : caseList.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">No cases yet.</div>
                ) : (
                  caseList.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => linkCase(c.id, c.name)}
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </PopoverContent>
            </Popover>

            <div className="ml-auto flex items-center gap-2">
              <GroupedModelSelect
                size="sm"
                value={modelId}
                onValueChange={(v) => updateProfile.mutate({ ai_model: v })}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || streaming || !apiKey}
                className="h-8 w-8 rounded-full"
              >
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: string;
  content: string;
  streaming?: boolean;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-[95%]">
      <div
        className={
          "whitespace-pre-wrap text-[0.95rem] leading-relaxed text-foreground " +
          (streaming ? "assistant-streaming" : "")
        }
      >
        {content}
        {streaming && (
          <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-primary align-middle" />
        )}
      </div>
      {!streaming && content && (
        <p className="mt-2 text-[0.7rem] italic leading-relaxed text-muted-foreground/80">
          AI-generated. Review by a qualified healthcare professional required
          before any clinical use.
        </p>
      )}
    </div>
  );
}
