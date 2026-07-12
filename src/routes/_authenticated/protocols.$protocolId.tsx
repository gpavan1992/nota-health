import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronRight,
  MoreHorizontal,
  Play,
  Pencil,
  Trash2,
  Copy as CopyIcon,
  Sparkles,
  Table as TableIcon,
  Star,
  User as UserIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import {
  BUILT_IN_PROTOCOLS,
  loadCustomProtocols,
  deleteCustomProtocol,
  saveCustomProtocol,
  formatLabel,
  newColumnId,
  type ClinicalProtocol,
} from "@/lib/clinical-protocols";
import { FORMAT_ICONS, areaColor } from "@/lib/protocol-icons";
import { getProtocol } from "@/lib/protocols";

export const Route = createFileRoute("/_authenticated/protocols/$protocolId")({
  head: () => ({ meta: [{ title: "Protocol — Nota Health" }] }),
  component: ProtocolDetailPage,
});

type ResolvedProtocol = ClinicalProtocol & { source: "Built-in" | "Custom" };

function resolve(id: string): ResolvedProtocol | null {
  const bi = BUILT_IN_PROTOCOLS.find((p) => p.id === id);
  if (bi) return { ...bi, source: "Built-in" };
  const cu = loadCustomProtocols().find((p) => p.id === id);
  if (cu) return { ...cu, source: "Custom" };
  return null;
}

function ProtocolDetailPage() {
  const { protocolId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [protocol, setProtocol] = useState<ResolvedProtocol | null>(() => resolve(protocolId));

  useEffect(() => {
    setProtocol(resolve(protocolId));
  }, [protocolId]);

  if (!protocol) {
    return (
      <AppShell user={user}>
        <div className="mx-auto max-w-xl py-16 text-center">
          <h2 className="font-serif text-2xl text-foreground">Protocol not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have been deleted or the link is invalid.
          </p>
          <Button asChild className="mt-6">
            <Link to="/protocols">Back to protocols</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const isCustom = protocol.source === "Custom";
  const TypeIcon = protocol.type === "assistant" ? Sparkles : TableIcon;
  const SourceIcon = protocol.source === "Built-in" ? Star : UserIcon;

  async function useProtocol() {
    if (!protocol) return;
    if (protocol.type === "extraction") {
      const target = protocol.extractionProtocolId ?? "custom";
      navigate({
        to: "/extract",
        search: {
          new: true,
          protocol: target,
          ...(isCustom ? { customProtocolId: protocol.id } : {}),
        },
      });
      return;
    }
    const { data: thread, error } = await supabase
      .from("chat_threads")
      .insert({ user_id: user.id, title: protocol.name })
      .select()
      .single();
    if (error || !thread) {
      toast.error(error?.message ?? "Could not start conversation");
      return;
    }
    qc.invalidateQueries({ queryKey: ["chat_threads", user.id] });
    navigate({
      to: "/assistant/$threadId",
      params: { threadId: thread.id },
      search: { seed: protocol.seedPrompt ?? "" },
    });
  }

  function duplicate() {
    if (!protocol) return;
    saveCustomProtocol({
      name: `${protocol.name} (copy)`,
      type: protocol.type,
      clinicalArea: protocol.clinicalArea,
      description: protocol.description,
      seedPrompt: protocol.seedPrompt,
      extractionProtocolId: protocol.extractionProtocolId,
      extractionColumns: protocol.extractionColumns?.map((c) => ({ ...c, id: newColumnId() })),
    });
    toast.success("Duplicated to your protocols");
    navigate({ to: "/protocols" });
  }

  function handleDelete() {
    if (!protocol) return;
    deleteCustomProtocol(protocol.id);
    toast.success("Protocol deleted");
    navigate({ to: "/protocols" });
  }

  function handleEdit() {
    // Edit uses the create dialog on the list page.
    navigate({ to: "/protocols" });
  }

  return (
    <AppShell user={user}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/protocols" className="hover:text-foreground">
          Clinical Protocols
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{protocol.name}</span>
      </nav>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            {protocol.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <TypeIcon className="h-3.5 w-3.5" />
              {protocol.type === "assistant" ? "Assistant" : "Extraction"}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <SourceIcon className="h-3.5 w-3.5" />
              {protocol.source === "Built-in" ? "System" : "User"}
            </span>
            <span>·</span>
            <span>Version 1.0.0</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: areaColor(protocol.clinicalArea) }}
              />
              {protocol.clinicalArea}
            </span>
            {!isCustom && (
              <>
                <span>·</span>
                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                  Read-only
                </Badge>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button onClick={() => void useProtocol()}>
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Use
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={duplicate}>
                <CopyIcon className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!isCustom} onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!isCustom}
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-8">
        {protocol.type === "extraction" ? (
          <ExtractionTable protocol={protocol} />
        ) : (
          <AssistantInstructions protocol={protocol} />
        )}
      </div>
    </AppShell>
  );
}

function ExtractionTable({ protocol }: { protocol: ResolvedProtocol }) {
  const rows = useMemo(() => {
    if (protocol.extractionColumns && protocol.extractionColumns.length > 0) {
      return protocol.extractionColumns.map((c) => ({
        key: c.id,
        title: c.title,
        format: c.format,
        prompt: c.prompt,
      }));
    }
    // Built-in extraction — pull from the runner schema.
    const target = protocol.extractionProtocolId
      ? getProtocol(protocol.extractionProtocolId)
      : null;
    if (!target) return [];
    return target.columns.map((c) => ({
      key: c.key,
      title: c.label,
      format: c.format ?? ("free_text" as const),
      prompt: c.prompt ?? c.description ?? "",
    }));
  }, [protocol]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(k: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No columns defined for this protocol.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2.5" />
            <th className="px-3 py-2.5 font-medium">Column Title</th>
            <th className="px-3 py-2.5 font-medium">Format</th>
            <th className="px-3 py-2.5 font-medium">Prompt</th>
            <th className="w-10 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const Icon = FORMAT_ICONS[r.format] ?? FORMAT_ICONS.free_text;
            const isOpen = expanded.has(r.key);
            return (
              <>
                <tr key={r.key} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5">
                    <Checkbox aria-label={`Select ${r.title}`} />
                  </td>
                  <td className="px-3 py-2.5 font-medium text-foreground">{r.title}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      <span>{formatLabel(r.format)}</span>
                    </div>
                  </td>
                  <td className="max-w-0 px-3 py-2.5 text-muted-foreground">
                    {isOpen ? (
                      <span className="whitespace-pre-wrap">{r.prompt || "—"}</span>
                    ) : (
                      <span className="block truncate">{r.prompt || "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggle(r.key)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={isOpen ? "Collapse" : "Expand"}
                    >
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      />
                    </button>
                  </td>
                </tr>
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AssistantInstructions({ protocol }: { protocol: ResolvedProtocol }) {
  const content = protocol.seedPrompt?.trim() || protocol.description || "";
  return (
    <div className="prose prose-sm max-w-none text-foreground prose-headings:font-serif prose-headings:font-medium prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
