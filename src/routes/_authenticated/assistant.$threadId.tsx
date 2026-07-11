import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  BookMarked,
  Check,
  Copy,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useChatMessages, type ChatMessage } from "@/hooks/use-chat-threads";
import { streamChat, getModelChoice, type WireMessage } from "@/lib/chat-stream";
import { GroupedModelSelect } from "@/components/grouped-model-select";
import { MessageSteps, type ChatStep } from "@/components/message-steps";
import {
  DocumentPreviewSheet,
  type PreviewSource,
} from "@/components/document-preview-sheet";
import { parseFile, ACCEPTED_FILE_TYPES } from "@/lib/document-parsers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  validateSearch: (search: Record<string, unknown>) => ({
    seed: typeof search.seed === "string" ? (search.seed as string) : undefined,
  }),
  component: AssistantThread,
});

type Attachment = {
  id: string;
  name: string;
  text: string;
  mime?: string;
  /** Blob URL for preview; local session only. */
  url?: string;
  /** True when the parser returned no extractable text (e.g. scanned PDF). */
  empty?: boolean;
};

const NO_TEXT_NOTE =
  "One or more attached documents appear to be scanned images with no extractable text. I can describe what's readable but cannot summarise their full contents. Try uploading a text-based PDF or run OCR first.";

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
  const [liveSteps, setLiveSteps] = useState<ChatStep[]>([]);
  const [atBottom, setAtBottom] = useState(true);
  const [preview, setPreview] = useState<PreviewSource | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Session-scoped map of attachment id -> preview source (blob url + text)
  const previewMapRef = useRef<Map<string, PreviewSource>>(new Map());

  const [caseList, setCaseList] = useState<{ id: string; name: string }[] | null>(null);
  const [protocolList] = useState([
    { id: "soap", name: "SOAP note", prompt: "Draft a SOAP note from the attached documents." },
    { id: "discharge", name: "Discharge summary", prompt: "Draft a discharge summary from the attached documents." },
    { id: "medrec", name: "Medication reconciliation", prompt: "Perform a medication reconciliation across the attached documents." },
  ]);

  // Auto-scroll to bottom on new content, but only if user is already near bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (atBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [savedMessages, streamText, pendingUser, liveSteps, atBottom]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.clientHeight - el.scrollTop;
    setAtBottom(distance < 40);
  }

  function scrollToBottom() {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  // Reset transient state when switching threads
  useEffect(() => {
    setPendingUser(null);
    setStreamText("");
    setLiveSteps([]);
    setAttachments([]);
    setPreview(null);
    abortRef.current?.abort();
  }, [threadId]);

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

  const savedModel = profile?.ai_model ?? null;
  const savedProvider = savedModel ? getModelChoice(savedModel).provider ?? null : null;
  const hasKeyFor = {
    google: !!profile?.google_api_key,
    openai: !!profile?.openai_api_key,
    anthropic: !!profile?.anthropic_api_key,
  } as const;
  const fallbackModel = hasKeyFor.google
    ? "gemini-2-5-flash"
    : hasKeyFor.openai
      ? "gpt-5-5"
      : hasKeyFor.anthropic
        ? "claude-fable-5"
        : "gemini-2-5-flash";
  const modelId =
    savedModel && savedProvider && hasKeyFor[savedProvider as "google" | "openai" | "anthropic"]
      ? savedModel
      : fallbackModel;
  const provider = (getModelChoice(modelId).provider ?? "google") as "anthropic" | "openai" | "google";
  const apiKey =
    provider === "google"
      ? (profile?.google_api_key ?? "")
      : provider === "openai"
        ? (profile?.openai_api_key ?? "")
        : (profile?.anthropic_api_key ?? "");
  const displayName = profile?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";
  const providerLabel = provider === "google" ? "Google Gemini" : provider === "openai" ? "OpenAI" : "Anthropic";

  useEffect(() => {
    if (profile && modelId !== profile.ai_model) {
      updateProfile.mutate({ ai_model: modelId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, modelId]);

  async function loadCases() {
    if (caseList) return;
    const { data } = await supabase.from("cases").select("id, name").order("updated_at", { ascending: false }).limit(20);
    setCaseList(data ?? []);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const f of Array.from(files)) {
      const id = crypto.randomUUID();
      try {
        const parsed = await parseFile(f);
        const url = URL.createObjectURL(f);
        const mime = f.type || undefined;
        const att: Attachment = {
          id,
          name: parsed.name,
          text: parsed.text,
          mime,
          url,
          empty: !parsed.text && !parsed.image,
        };
        previewMapRef.current.set(id, {
          name: parsed.name,
          url,
          mime,
          text: parsed.text || undefined,
        });
        // Also key by name for citations rendered from persisted messages
        previewMapRef.current.set(parsed.name, {
          name: parsed.name,
          url,
          mime,
          text: parsed.text || undefined,
        });
        setAttachments((a) => [...a, att]);
        if (att.empty && /\.pdf$/i.test(att.name)) {
          toast.warning(`"${att.name}": PDF text extraction not supported (scanned image). Upload a text-based PDF or run OCR first.`);
        }
      } catch (err) {
        toast.error((err as Error).message);
      }
    }
    e.target.value = "";
  }

  async function linkCase(caseId: string, name: string) {
    const { error } = await supabase.from("chat_threads").update({ case_id: caseId }).eq("id", threadId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["chat_threads", user.id] });
    toast.success(`Linked to ${name}`);
    const { data: docs } = await supabase
      .from("case_documents")
      .select("name")
      .eq("case_id", caseId);
    if (docs && docs.length > 0) {
      setAttachments((a) => [
        ...a,
        ...docs.map((d) => ({ id: crypto.randomUUID(), name: d.name, text: "" })),
      ]);
    }
  }

  function usePrompt(text: string) {
    setInput((v) => (v ? v + "\n\n" + text : text));
  }

  function openCitation(name: string) {
    const src = previewMapRef.current.get(name);
    if (src) {
      setPreview(src);
    } else {
      setPreview({ name, text: "Document not available in this session. Re-upload to preview." });
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    if (!apiKey) {
      toast.error("Add your API key in Settings first.");
      return;
    }

    const currentAttachments = attachments;
    let content = trimmed;
    if (currentAttachments.length > 0) {
      const docsBlock = currentAttachments
        .map((a) =>
          a.text
            ? `--- Document: ${a.name} ---\n${a.text}`
            : `--- Document: ${a.name} (no extractable text) ---`,
        )
        .join("\n\n");
      content = `Attached documents:\n\n${docsBlock}\n\nQuestion:\n${trimmed}`;
    }

    // Build standardized execution steps (Mike-style)
    const steps: ChatStep[] = [];
    const readableDocs = currentAttachments.filter((a) => a.text && a.text.trim().length > 0);
    const emptyDocs = currentAttachments.filter((a) => a.empty);

    for (const a of currentAttachments) {
      const isPdf = /\.pdf$/i.test(a.name);
      steps.push({
        kind: "read",
        label: `Read ${a.name}`,
        status: a.empty ? "warn" : "ok",
        detail: a.empty
          ? isPdf
            ? "PDF text extraction not supported — this file appears to be a scanned image with no selectable text layer. Upload a text-based PDF or run OCR first."
            : "No extractable text found in this file."
          : `Extracted ~${a.text.length.toLocaleString()} characters across ${Math.max(1, Math.ceil(a.text.length / 3000))} section(s).`,
      });
    }

    if (currentAttachments.length > 0) {
      const analyzeDetail = [
        `**Analyzing Document Structure**`,
        `Reviewing ${currentAttachments.length} attached document${currentAttachments.length === 1 ? "" : "s"} (${readableDocs.length} readable, ${emptyDocs.length} without extractable text) to answer:`,
        `"${trimmed}"`,
      ].join("\n");
      steps.push({ kind: "thought", label: "Thought process", status: "ok", detail: analyzeDetail });

      const keywords = trimmed
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((w) => w.length > 3)
        .slice(0, 3);
      for (const kw of keywords) {
        for (const a of readableDocs) {
          const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
          const matches = a.text.match(re)?.length ?? 0;
          steps.push({
            kind: "search",
            label: `Found "${kw}" (${matches} match${matches === 1 ? "" : "es"}) in ${a.name}`,
            status: matches > 0 ? "ok" : "warn",
          });
        }
      }

      const synthDetail = emptyDocs.length && !readableDocs.length
        ? `**Confirming Lack of Text**\nAll attached files returned no extractable text. Preparing a message that OCR or a text-based PDF is required.`
        : `**Synthesizing Answer**\nGrounding response strictly in the extracted document text and preparing structured output with citations.`;
      steps.push({ kind: "thought", label: "Thought process", status: "ok", detail: synthDetail });
    }

    const { data: userMsg, error: userErr } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: threadId,
        user_id: user.id,
        role: "user",
        content,
        attachments: currentAttachments.map((a) => ({ name: a.name })),
      })
      .select()
      .single();
    if (userErr || !userMsg) {
      toast.error(userErr?.message ?? "Failed to save message");
      return;
    }

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
    setLiveSteps(
      steps.length
        ? [...steps.map((s, i) => (i === steps.length - 1 ? { ...s, status: "running" as const, label: "Generating answer" } : s))]
        : [{ kind: "answer", label: "Generating answer", status: "running" }],
    );
    setStreaming(true);

    const anyEmpty = currentAttachments.some((a) => a.empty);
    const systemPrefix = anyEmpty ? `NOTE: ${NO_TEXT_NOTE}\n\n` : "";

    const history: WireMessage[] = [
      ...(savedMessages ?? []).map((m) => ({ role: m.role as WireMessage["role"], content: m.content })),
      { role: "user", content: systemPrefix + content },
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

      const finalSteps: ChatStep[] = steps.length
        ? steps.map((s) => ({ ...s, status: s.status ?? "ok" }))
        : [];
      finalSteps.push({
        kind: "answer",
        label: acc.trim() ? "Answer ready" : "No answer produced",
        status: acc.trim() ? "ok" : "warn",
      });

      const DISCLAIMER = "For clinical review only. Not a substitute for professional medical judgment.";
      let finalText = acc.trim();
      if (!finalText && anyEmpty) {
        finalText = NO_TEXT_NOTE;
      }
      if (!finalText) {
        finalText = "The model returned no content. Try rephrasing your question or check your API key.";
      }
      if (!finalText.includes(DISCLAIMER)) {
        finalText = finalText.trimEnd() + `\n\n${DISCLAIMER}`;
      }

      await supabase.from("chat_messages").insert({
        thread_id: threadId,
        user_id: user.id,
        role: "assistant",
        content: finalText,
        attachments: currentAttachments.map((a) => ({ name: a.name })),
        steps: finalSteps,
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
      setLiveSteps([]);
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
              No {providerLabel} API key saved. Add one in Settings to use this model.
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/settings">Open Settings</Link>
            </Button>
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto pr-2"
        >
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
                <MessageBubble
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  steps={(m as unknown as { steps?: ChatStep[] }).steps ?? []}
                  attachments={
                    (m.attachments as { name: string }[] | null | undefined) ?? []
                  }
                  onOpenCitation={openCitation}
                />
              ))}
              {pendingUser && (
                <MessageBubble
                  role="user"
                  content={pendingUser.content}
                  attachments={
                    (pendingUser.attachments as { name: string }[] | null | undefined) ?? []
                  }
                  onOpenCitation={openCitation}
                />
              )}
              {streaming && (
                <MessageBubble
                  role="assistant"
                  content={streamText || "Thinking…"}
                  steps={liveSteps}
                  streaming={!streamText}
                  running
                  onOpenCitation={openCitation}
                />
              )}
            </div>
          )}
        </div>

        <div className="relative">
          {!atBottom && hasMessages && (
            <button
              type="button"
              onClick={scrollToBottom}
              aria-label="Scroll to latest"
              className="absolute -top-12 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md transition-colors hover:bg-accent"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}

          <form onSubmit={handleSend} className="mt-4 rounded-2xl border border-border bg-card p-3 shadow-sm">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((a) => (
                  <span
                    key={a.id}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
                      a.empty
                        ? "bg-warning/15 text-warning-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    <FileText className="h-3 w-3" />
                    <button
                      type="button"
                      className="underline-offset-2 hover:underline"
                      onClick={() =>
                        setPreview(previewMapRef.current.get(a.id) ?? previewMapRef.current.get(a.name) ?? { name: a.name, text: a.text })
                      }
                    >
                      {a.name}
                    </button>
                    {a.empty && <span className="text-[0.65rem] opacity-80">no text</span>}
                    <button
                      type="button"
                      onClick={() => setAttachments((v) => v.filter((x) => x.id !== a.id))}
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
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={handleFile}
                  accept={ACCEPTED_FILE_TYPES}
                />
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
      </div>

      <DocumentPreviewSheet
        source={preview}
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
      />
    </AppShell>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
  running,
  steps,
  attachments,
  onOpenCitation,
}: {
  role: string;
  content: string;
  streaming?: boolean;
  running?: boolean;
  steps?: ChatStep[];
  attachments?: { name: string }[];
  onOpenCitation?: (name: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const uniqueAttachments = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of attachments ?? []) {
      map.set(a.name, (map.get(a.name) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [attachments]);

  async function handleCopyCitations() {
    if (uniqueAttachments.length === 0) {
      toast.info("No citations to copy");
      return;
    }
    const text = uniqueAttachments
      .map((a, i) => `${i + 1}. ${a.name}${a.count > 1 ? ` (×${a.count})` : ""}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Citations copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1.5">
          <div className="whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            {content.replace(/^Attached documents:[\s\S]*?Question:\n/, "")}
          </div>
          {uniqueAttachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {uniqueAttachments.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => onOpenCitation?.(a.name)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[0.7rem] text-foreground hover:bg-accent"
                >
                  <FileText className="h-3 w-3 text-primary" />
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-[95%]">
      {steps && steps.length > 0 && <MessageSteps steps={steps} running={running} />}
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

      {!streaming && content && uniqueAttachments.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="mb-1.5 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Citations
          </div>
          <ul className="space-y-1">
            {uniqueAttachments.map((a) => (
              <li key={a.name}>
                <button
                  type="button"
                  onClick={() => onOpenCitation?.(a.name)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent"
                >
                  <span className="flex items-center gap-2 truncate">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate">{a.name}</span>
                  </span>
                  <span className="rounded-full bg-background px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
                    {a.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!streaming && content && (
        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy response"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {!streaming && content && (
        <p className="mt-2 text-[0.7rem] italic leading-relaxed text-muted-foreground/80">
          AI-generated. Review by a qualified healthcare professional required
          before any clinical use.
        </p>
      )}
    </div>
  );
}
