import { useMemo, useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  Sparkles,
  Table as TableIcon,
  MoreHorizontal,
  Trash2,
  Play,
  Pencil,
  Power,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
  X,
  HelpCircle,
  Upload,
  Search,
  Star,
  User as UserIcon,
  ExternalLink,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { callProviderText, keyForModel } from "@/lib/ai-text";
import { parseMarkdownColumns, MARKDOWN_FORMAT_EXAMPLE } from "@/lib/markdown-schema";
import { FORMAT_ICONS, areaColor } from "@/lib/protocol-icons";
import {
  BUILT_IN_PROTOCOLS,
  loadCustomProtocols,
  saveCustomProtocol,
  updateCustomProtocol,
  deleteCustomProtocol,
  loadDeactivatedIds,
  COLUMN_FORMAT_OPTIONS,
  EXTRACTION_TEMPLATES,
  formatLabel,
  newColumnId,
  type ClinicalProtocol,
  type CustomProtocol,
  type ProtocolType,
  type ExtractionColumnDef,
  type ColumnFormat,
} from "@/lib/clinical-protocols";


export const Route = createFileRoute("/_authenticated/protocols/")({
  head: () => ({ meta: [{ title: "Protocols — Nota Health" }] }),
  component: ProtocolsPage,
});

type Row = ClinicalProtocol & { source: "Built-in" | "Custom"; deactivated: boolean };

function ProtocolsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "user" | "system">("all");
  const [search, setSearch] = useState("");
  const [customs, setCustoms] = useState<CustomProtocol[]>([]);
  const [deactivatedIds, setDeactivatedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CustomProtocol | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    setCustoms(loadCustomProtocols());
    setDeactivatedIds(loadDeactivatedIds());
  }, []);

  function refreshCustoms() {
    setCustoms(loadCustomProtocols());
  }

  const allRows: Row[] = useMemo(() => {
    const deactSet = new Set(deactivatedIds);
    const builtIn: Row[] = BUILT_IN_PROTOCOLS.map((p) => ({
      ...p,
      source: "Built-in",
      deactivated: deactSet.has(p.id),
    }));
    const custom: Row[] = customs.map((p) => ({
      ...p,
      source: "Custom",
      deactivated: false,
    }));
    return [...builtIn, ...custom];
  }, [customs, deactivatedIds]);

  const rows: Row[] = useMemo(() => {
    let list = allRows;
    if (tab === "system") list = list.filter((p) => p.source === "Built-in");
    if (tab === "user") list = list.filter((p) => p.source === "Custom");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.clinicalArea.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allRows, tab, search]);

  async function runProtocol(p: Row) {
    if (p.deactivated) return;
    if (p.type === "extraction") {
      const target = p.extractionProtocolId ?? "custom";
      navigate({
        to: "/extract",
        search: {
          new: true,
          protocol: target,
          ...(p.source === "Custom" ? { customProtocolId: p.id } : {}),
        },
      });
      return;
    }
    const { data: thread, error } = await supabase
      .from("chat_threads")
      .insert({ user_id: user.id, title: p.name })
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
      search: { seed: p.seedPrompt ?? "" },
    });
  }

  function handleDeleteCustom(id: string) {
    deleteCustomProtocol(id);
    refreshCustoms();
    toast.success("Custom protocol deleted");
  }

  function handleEditCustom(p: Row) {
    const record = customs.find((c) => c.id === p.id);
    if (record) setEditing(record);
  }

  function handleDuplicate(p: Row) {
    const copy = {
      name: `${p.name} (copy)`,
      type: p.type,
      clinicalArea: p.clinicalArea,
      description: p.description,
      seedPrompt: p.seedPrompt,
      extractionProtocolId: p.extractionProtocolId,
      extractionColumns: p.extractionColumns?.map((c) => ({ ...c, id: newColumnId() })),
    };
    saveCustomProtocol(copy);
    refreshCustoms();
    toast.success("Protocol duplicated");
  }

  return (
    <AppShell user={user}>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Clinical Protocols"
          title="Pre-built workflows for the work you do every day."
          body="Reusable AI playbooks for prior auth review, discharge analysis, referrals, appeals, and structured extraction."
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="user">User</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search protocols…"
              className="w-64 pl-8"
            />
          </div>
          <Button size="icon" onClick={() => setCreateOpen(true)} aria-label="Create protocol">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>


      <Card className="mt-4">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-serif text-xl text-foreground">No protocols to show</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Try a different filter, or create a custom protocol tailored to your team's workflow.
              </p>
              <Button className="mt-5" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Custom Protocol
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Clinical Area</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-muted/30 ${p.deactivated ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setPreviewId(p.id)}
                        className="text-left font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {p.name}
                      </button>
                      {p.deactivated && (
                        <Badge variant="outline" className="ml-2 font-mono text-[10px] uppercase tracking-wider">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <TypeCell type={p.type} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: areaColor(p.clinicalArea) }}
                        />
                        <span>{p.clinicalArea}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SourceCell source={p.source} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to="/protocols/$protocolId" params={{ protocolId: p.id }}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Page
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void runProtocol(p)} disabled={p.deactivated}>
                            <Play className="mr-2 h-4 w-4" />
                            Use
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(p)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={p.source !== "Custom"}
                            onClick={() => p.source === "Custom" && handleDeleteCustom(p.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <PreviewModal
        rows={allRows}
        openId={previewId}
        onOpenChange={(id) => setPreviewId(id)}
        onUse={(p) => {
          setPreviewId(null);
          void runProtocol(p);
        }}
      />

      <CreateCustomProtocolDialog
        open={createOpen || editing !== null}
        initial={editing}
        userId={user.id}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false);
            setEditing(null);
          } else if (!editing) {
            setCreateOpen(true);
          }
        }}
        onSaved={(mode) => {
          refreshCustoms();
          toast.success(mode === "edit" ? "Protocol updated" : "Custom protocol saved");
        }}
      />

    </AppShell>
  );
}

function TypeCell({ type }: { type: ProtocolType }) {
  const Icon = type === "assistant" ? Sparkles : TableIcon;
  return (
    <div className="flex items-center gap-2 text-foreground">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{type === "assistant" ? "Assistant" : "Extraction"}</span>
    </div>
  );
}

function SourceCell({ source }: { source: "Built-in" | "Custom" }) {
  const Icon = source === "Built-in" ? Star : UserIcon;
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span>{source === "Built-in" ? "System" : "User"}</span>
    </div>
  );
}

function PreviewModal({
  rows,
  openId,
  onOpenChange,
  onUse,
}: {
  rows: Row[];
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  onUse: (p: Row) => void;
}) {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (openId) setSelectedId(openId);
  }, [openId]);

  const open = openId !== null;
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((p) => p.name.toLowerCase().includes(s));
  }, [q, rows]);
  const selected = rows.find((p) => p.id === selectedId) ?? null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(null)}>
      <DialogContent className="h-[80vh] max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Protocol preview</DialogTitle>
        </DialogHeader>
        <div className="flex h-full min-h-0">
          {/* LEFT */}
          <div className="flex w-[35%] min-w-0 flex-col border-r border-border">
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…"
                  className="h-8 pl-8"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {filtered.map((p) => {
                const Icon = p.type === "assistant" ? Sparkles : TableIcon;
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      active ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* RIGHT */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="min-w-0">
                {selected && (
                  <>
                    <h2 className="truncate font-serif text-lg text-foreground">{selected.name}</h2>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{selected.type === "assistant" ? "Assistant" : "Extraction"}</span>
                      <span>·</span>
                      <span>{selected.clinicalArea}</span>
                    </div>
                  </>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => onOpenChange(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {selected && <PreviewBody protocol={selected} />}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              {selected && (
                <>
                  <Button variant="outline" asChild>
                    <Link
                      to="/protocols/$protocolId"
                      params={{ protocolId: selected.id }}
                      onClick={() => onOpenChange(null)}
                    >
                      View Page
                    </Link>
                  </Button>
                  <Button onClick={() => onUse(selected)} disabled={selected.deactivated}>
                    Use
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewBody({ protocol }: { protocol: ClinicalProtocol }) {
  if (protocol.type === "extraction") {
    const cols = protocol.extractionColumns ?? [];
    if (cols.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          This extraction uses a built-in schema. Open the full page to see column details.
        </p>
      );
    }
    return (
      <ul className="divide-y divide-border rounded-md border border-border">
        {cols.map((c) => {
          const Icon = FORMAT_ICONS[c.format] ?? FORMAT_ICONS.free_text;
          return (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-foreground">{c.title}</span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatLabel(c.format)}</span>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <div className="prose prose-sm max-w-none text-foreground prose-headings:font-serif prose-headings:font-medium">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {protocol.seedPrompt ?? protocol.description ?? ""}
      </ReactMarkdown>
    </div>
  );
}

function CreateCustomProtocolDialog({
  open,
  initial,
  userId,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  initial?: CustomProtocol | null;
  userId: string;
  onOpenChange: (o: boolean) => void;
  onSaved: (mode: "create" | "edit") => void;
}) {
  const { data: profile } = useProfile(userId);
  const [name, setName] = useState("");
  const [type, setType] = useState<ProtocolType>("assistant");
  const [clinicalArea, setClinicalArea] = useState("");
  const [description, setDescription] = useState("");
  const [seedPrompt, setSeedPrompt] = useState("");
  const [columns, setColumns] = useState<ExtractionColumnDef[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setType(initial?.type ?? "assistant");
    setClinicalArea(initial?.clinicalArea ?? "");
    setDescription(initial?.description ?? "");
    setSeedPrompt(initial?.seedPrompt ?? "");
    setColumns(initial?.extractionColumns ?? []);
    setImportOpen(false);
    setImportText("");
  }, [open, initial]);

  function handleSave() {
    if (!name.trim()) {
      toast.error("Give the protocol a name");
      return;
    }
    if (type === "assistant" && !seedPrompt.trim()) {
      toast.error("Add a starter prompt for the assistant");
      return;
    }
    if (type === "extraction") {
      if (columns.length === 0) {
        toast.error("Add at least one extraction column");
        return;
      }
      if (columns.some((c) => !c.title.trim())) {
        toast.error("Every column needs a title");
        return;
      }
    }
    const payload = {
      name: name.trim(),
      type,
      clinicalArea: clinicalArea.trim() || "General",
      description: description.trim() || "Custom protocol",
      seedPrompt: seedPrompt.trim() || undefined,
      extractionProtocolId: type === "extraction" ? "custom" : undefined,
      extractionColumns:
        type === "extraction"
          ? columns.map((c) => ({ ...c, title: c.title.trim(), prompt: c.prompt.trim() }))
          : undefined,
    };
    if (initial) {
      updateCustomProtocol(initial.id, payload);
      onOpenChange(false);
      onSaved("edit");
    } else {
      saveCustomProtocol(payload);
      onOpenChange(false);
      onSaved("create");
    }
  }

  function addColumn() {
    setColumns((cs) => [
      ...cs,
      { id: newColumnId(), title: "", format: "free_text", prompt: "" },
    ]);
  }
  function updateColumn(id: string, patch: Partial<ExtractionColumnDef>) {
    setColumns((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeColumn(id: string) {
    setColumns((cs) => cs.filter((c) => c.id !== id));
  }
  function loadTemplate(templateId: string) {
    const t = EXTRACTION_TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;
    setColumns(
      t.columns.map((c) => ({
        id: newColumnId(),
        title: c.title,
        format: c.format,
        prompt: "",
      })),
    );
    toast.success(`${t.name} loaded`);
  }

  function handleImport() {
    const parsed = parseMarkdownColumns(importText);
    if (!parsed.ok) {
      toast.error("Could not parse markdown. Check the table format and try again.");
      return;
    }
    setColumns(parsed.columns);
    toast.success(`${parsed.columns.length} columns imported successfully`);
    setImportText("");
    setImportOpen(false);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const text = await f.text();
    setImportText(text);
  }

  const modelId = profile?.ai_model ?? "claude-sonnet";
  const aiKey = keyForModel(modelId, profile);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setColumns((cs) => {
      const from = cs.findIndex((c) => c.id === active.id);
      const to = cs.findIndex((c) => c.id === over.id);
      if (from === -1 || to === -1) return cs;
      return arrayMove(cs, from, to);
    });
  }

  const isEdit = !!initial;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit custom protocol" : "Create custom protocol"}</DialogTitle>
          <DialogDescription>
            Save a reusable workflow. Choose Assistant to pre-seed a chat, or Extraction to route into a structured table.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="cp-name">Name</Label>
            <Input
              id="cp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cardiology admit checklist"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ProtocolType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assistant">Assistant</SelectItem>
                  <SelectItem value="extraction">Extraction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cp-area">Clinical area</Label>
              <Input
                id="cp-area"
                value={clinicalArea}
                onChange={(e) => setClinicalArea(e.target.value)}
                placeholder="e.g. Cardiology"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cp-desc">Description</Label>
            <Input
              id="cp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this protocol does"
            />
          </div>
          {type === "assistant" && (
            <div className="grid gap-2">
              <Label htmlFor="cp-seed">Starter prompt</Label>
              <Textarea
                id="cp-seed"
                value={seedPrompt}
                onChange={(e) => setSeedPrompt(e.target.value)}
                placeholder="What should the assistant do when this protocol is launched?"
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                This prompt is pre-filled in the composer when the user starts a conversation from the protocol.
              </p>
            </div>
          )}

          {type === "extraction" && (
            <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-medium text-foreground">Extraction Columns</h4>
                  {columns.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {columns.length} column{columns.length === 1 ? "" : "s"} defined
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Define what structured data to extract from each document. Each column becomes a field in the output table.
                </p>
              </div>

              {columns.length === 0 && (
                <div className="grid gap-2 rounded-md border border-dashed border-border bg-background/60 p-3">
                  <div className="text-xs font-medium text-muted-foreground">Start from a template:</div>
                  <div className="grid gap-1.5">
                    {EXTRACTION_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => loadTemplate(t.id)}
                        className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span className="font-medium text-foreground">{t.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.columns.length} columns
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {columns.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid gap-2">
                      {columns.map((c) => (
                        <ColumnCard
                          key={c.id}
                          column={c}
                          modelId={modelId}
                          apiKey={aiKey}
                          onChange={(patch) => updateColumn(c.id, patch)}
                          onRemove={() => removeColumn(c.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addColumn}
                className="justify-center"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add column
              </Button>

              {/* Advanced — Import from Markdown */}
              <div className="mt-1 rounded-md border border-border bg-background/60">
                <button
                  type="button"
                  onClick={() => setImportOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    {importOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    Advanced — Import schema from Markdown
                  </span>
                </button>
                {importOpen && (
                  <div className="grid gap-3 border-t border-border px-3 py-3">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Paste markdown table</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                              >
                                <HelpCircle className="h-3 w-3" />
                                See expected format →
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-md">
                              <pre className="whitespace-pre-wrap text-[10px] leading-relaxed">
                                {MARKDOWN_FORMAT_EXAMPLE}
                              </pre>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Textarea
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder={"| Column Title | Format | Prompt |\n|---|---|---|\n| Primary Diagnosis | ICD-10 Code | ... |"}
                        className="min-h-[100px] font-mono text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".md,.txt"
                        hidden
                        onChange={handleImportFile}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-1 h-3.5 w-3.5" />
                        Upload .md / .txt
                      </Button>
                      <div className="flex-1" />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleImport}
                        disabled={!importText.trim()}
                      >
                        Import Columns
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{isEdit ? "Save changes" : "Save protocol"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColumnCard({
  column,
  modelId,
  apiKey,
  onChange,
  onRemove,
}: {
  column: ExtractionColumnDef;
  modelId: string;
  apiKey: string | null;
  onChange: (patch: Partial<ExtractionColumnDef>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });
  const [generating, setGenerating] = useState(false);

  async function autoGenerate() {
    if (!apiKey) {
      toast.error("Add an AI key in Settings to use Auto-Generate");
      return;
    }
    if (!column.title.trim()) {
      toast.error("Give the column a title first");
      return;
    }
    setGenerating(true);
    try {
      const prompt = `Generate a precise clinical extraction prompt for a column titled '${column.title.trim()}' with format '${formatLabel(column.format)}'. The prompt should instruct an AI to extract this specific information accurately from any clinical document. Return only the prompt text, nothing else.`;
      const out = await callProviderText(apiKey, modelId, prompt);
      onChange({ prompt: out.replace(/^["']|["']$/g, "").trim() });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid gap-2 rounded-md border border-border bg-background p-3"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1.5 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="grid flex-1 gap-2">
          <div className="grid grid-cols-[1fr,180px] gap-2">
            <Input
              value={column.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="e.g. Primary Diagnosis, Discharge Medications"
              className="h-8 text-sm"
            />
            <Select
              value={column.format}
              onValueChange={(v) => onChange({ format: v as ColumnFormat })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_FORMAT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Textarea
              value={column.prompt}
              onChange={(e) => onChange({ prompt: e.target.value })}
              placeholder="What should be extracted for this column?"
              className="min-h-[64px] text-xs"
            />
            <div className="flex items-center justify-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs"
                        onClick={autoGenerate}
                        disabled={generating || !apiKey}
                      >
                        {generating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Auto-Generate
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!apiKey && (
                    <TooltipContent>Add an AI key in Settings to use Auto-Generate</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 text-muted-foreground hover:text-destructive"
          aria-label="Remove column"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
