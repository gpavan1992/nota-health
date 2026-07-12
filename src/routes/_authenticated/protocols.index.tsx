import { useMemo, useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import {
  BUILT_IN_PROTOCOLS,
  loadCustomProtocols,
  saveCustomProtocol,
  updateCustomProtocol,
  deleteCustomProtocol,
  loadDeactivatedIds,
  deactivateBuiltIn,
  activateBuiltIn,
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
  const [tab, setTab] = useState<"all" | "built-in" | "custom">("all");
  const [search, setSearch] = useState("");
  const [customs, setCustoms] = useState<CustomProtocol[]>([]);
  const [deactivatedIds, setDeactivatedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CustomProtocol | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCustoms(loadCustomProtocols());
    setDeactivatedIds(loadDeactivatedIds());
  }, []);

  function refreshCustoms() {
    setCustoms(loadCustomProtocols());
  }

  const rows: Row[] = useMemo(() => {
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
    let list: Row[] = [...builtIn, ...custom];
    if (tab === "built-in") list = builtIn;
    if (tab === "custom") list = custom;
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
  }, [customs, deactivatedIds, tab, search]);

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
    // Assistant protocol — create a new thread and seed the composer.
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

  function handleToggleActive(p: Row) {
    if (p.deactivated) {
      activateBuiltIn(p.id);
      toast.success("Protocol activated");
    } else {
      deactivateBuiltIn(p.id);
      toast.success("Protocol deactivated");
    }
    setDeactivatedIds(loadDeactivatedIds());
  }

  function handleEditCustom(p: Row) {
    const record = customs.find((c) => c.id === p.id);
    if (record) setEditing(record);
  }

  function toggleRow(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const visibleIds = rows.map((r) => r.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected = visibleIds.some((id) => selected.has(id));

  function toggleAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) visibleIds.forEach((id) => next.add(id));
      else visibleIds.forEach((id) => next.delete(id));
      return next;
    });
  }

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const selBuiltInActive = selectedRows.filter((r) => r.source === "Built-in" && !r.deactivated);
  const selBuiltInInactive = selectedRows.filter((r) => r.source === "Built-in" && r.deactivated);
  const selCustom = selectedRows.filter((r) => r.source === "Custom");

  function bulkDeactivate() {
    selBuiltInActive.forEach((r) => deactivateBuiltIn(r.id));
    setDeactivatedIds(loadDeactivatedIds());
    setSelected(new Set());
    toast.success(`Deactivated ${selBuiltInActive.length} protocol(s)`);
  }
  function bulkActivate() {
    selBuiltInInactive.forEach((r) => activateBuiltIn(r.id));
    setDeactivatedIds(loadDeactivatedIds());
    setSelected(new Set());
    toast.success(`Activated ${selBuiltInInactive.length} protocol(s)`);
  }
  function bulkDelete() {
    selCustom.forEach((r) => deleteCustomProtocol(r.id));
    refreshCustoms();
    setSelected(new Set());
    toast.success(`Deleted ${selCustom.length} protocol(s)`);
  }



  return (
    <AppShell user={user}>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Clinical Protocols"
          title="Pre-built workflows for the work you do every day."
          body="Reusable AI playbooks for prior auth review, discharge analysis, referrals, appeals, and structured extraction."
        />
        <Button onClick={() => setCreateOpen(true)} className="mt-2 shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Create Custom Protocol
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="built-in">Built-in</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="whitespace-nowrap text-xs text-muted-foreground">{selected.size} selected</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Actions
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {selBuiltInActive.length > 0 && (
                    <DropdownMenuItem onClick={bulkDeactivate}>
                      <Power className="mr-2 h-4 w-4" />
                      Deactivate ({selBuiltInActive.length})
                    </DropdownMenuItem>
                  )}
                  {selBuiltInInactive.length > 0 && (
                    <DropdownMenuItem onClick={bulkActivate}>
                      <Power className="mr-2 h-4 w-4" />
                      Activate ({selBuiltInInactive.length})
                    </DropdownMenuItem>
                  )}
                  {selCustom.length > 0 && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={bulkDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete ({selCustom.length})
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search protocols…"
            className="max-w-xs"
          />
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
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleAll(!!v)}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Protocol Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Clinical Area</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-muted/30 ${p.deactivated ? "opacity-50" : "cursor-pointer"}`}
                    onClick={() => void runProtocol(p)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(p.id)}
                        onCheckedChange={(v) => toggleRow(p.id, !!v)}
                        aria-label={`Select ${p.name}`}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{p.name}</span>
                        {p.deactivated && (
                          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {p.description}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={p.type} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.clinicalArea}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] uppercase tracking-wider"
                      >
                        {p.source}
                      </Badge>
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => void runProtocol(p)}
                          disabled={p.deactivated}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          Use
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {p.source === "Custom" ? (
                              <>
                                <DropdownMenuItem onClick={() => handleEditCustom(p)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteCustom(p.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem onClick={() => handleToggleActive(p)}>
                                <Power className="mr-2 h-4 w-4" />
                                {p.deactivated ? "Activate" : "Deactivate"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

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

function TypeBadge({ type }: { type: ProtocolType }) {
  if (type === "assistant") {
    return (
      <Badge variant="outline" className="gap-1.5 font-mono text-[10px]">
        <Sparkles className="h-3 w-3" />
        Assistant
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 font-mono text-[10px]">
      <TableIcon className="h-3 w-3" />
      Extraction
    </Badge>
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
