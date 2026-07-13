import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Play,
  Pencil,
  Trash2,
  Copy as CopyIcon,
  Sparkles,
  Table as TableIcon,
  Star,
  User as UserIcon,
  Plus,
  X,
  Loader2,
  Power,
  Upload,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BUILT_IN_PROTOCOLS,
  loadCustomProtocols,
  loadDeactivatedIds,
  deleteCustomProtocol,
  updateCustomProtocol,
  deactivateBuiltIn,
  activateBuiltIn,
  duplicateProtocol,
  renameCustomProtocol,
  formatLabel,
  newColumnId,
  COLUMN_FORMAT_OPTIONS,
  EXTRACTION_TEMPLATES,
  type ClinicalProtocol,
  type ExtractionColumnDef,
  type ColumnFormat,
} from "@/lib/clinical-protocols";
import { FORMAT_ICONS, areaColor } from "@/lib/protocol-icons";
import { getProtocol } from "@/lib/protocols";
import { useProfile } from "@/hooks/use-profile";
import { callProviderText, keyForModel } from "@/lib/ai-text";
import { parseMarkdownColumns } from "@/lib/markdown-schema";
import { UseProtocolDialog } from "@/components/use-protocol-dialog";

export const Route = createFileRoute("/_authenticated/protocols/$protocolId")({
  head: () => ({ meta: [{ title: "Protocol — Nota Health" }] }),
  component: ProtocolDetailPage,
});

type ResolvedProtocol = ClinicalProtocol & { source: "Built-in" | "Custom"; deactivated: boolean };

function resolve(id: string): ResolvedProtocol | null {
  const deact = new Set(loadDeactivatedIds());
  const bi = BUILT_IN_PROTOCOLS.find((p) => p.id === id);
  if (bi) return { ...bi, source: "Built-in", deactivated: deact.has(bi.id) };
  const cu = loadCustomProtocols().find((p) => p.id === id);
  if (cu) return { ...cu, source: "Custom", deactivated: false };
  return null;
}

function ProtocolDetailPage() {
  const { protocolId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [protocol, setProtocol] = useState<ResolvedProtocol | null>(() => resolve(protocolId));
  const [useOpen, setUseOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingBasics, setEditingBasics] = useState(false);

  useEffect(() => {
    setProtocol(resolve(protocolId));
  }, [protocolId]);

  function refresh() {
    setProtocol(resolve(protocolId));
  }

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

  function updateColumns(cols: ExtractionColumnDef[]) {
    if (!isCustom) return;
    updateCustomProtocol(protocol!.id, { extractionColumns: cols });
    refresh();
  }

  function appendColumns(cols: ExtractionColumnDef[]) {
    const existing = protocol!.extractionColumns ?? [];
    updateColumns([...existing, ...cols]);
  }

  function handleDelete() {
    deleteCustomProtocol(protocol!.id);
    toast.success("Protocol deleted");
    navigate({ to: "/protocols" });
  }

  return (
    <AppShell user={user}>
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/protocols" className="hover:text-foreground">
          Protocols
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
            {protocol.deactivated && (
              <>
                <span>·</span>
                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                  Inactive
                </Badge>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button onClick={() => setUseOpen(true)} disabled={protocol.deactivated}>
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
              {isCustom && (
                <DropdownMenuItem onClick={() => setEditingBasics(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit basics
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  const copy = duplicateProtocol(protocol);
                  toast.success("Duplicated");
                  navigate({ to: "/protocols/$protocolId", params: { protocolId: copy.id } });
                }}
              >
                <CopyIcon className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              {!isCustom && (
                <DropdownMenuItem
                  onClick={() => {
                    if (protocol.deactivated) activateBuiltIn(protocol.id);
                    else deactivateBuiltIn(protocol.id);
                    refresh();
                    toast.success(protocol.deactivated ? "Activated" : "Deactivated");
                  }}
                >
                  <Power className="mr-2 h-4 w-4" />
                  {protocol.deactivated ? "Activate" : "Deactivate"}
                </DropdownMenuItem>
              )}
              {isCustom && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-8">
        {protocol.type === "extraction" ? (
          <ExtractionEditor
            protocol={protocol}
            isCustom={isCustom}
            onAdd={() => setAddOpen(true)}
            onImport={() => setImportOpen(true)}
            onLoadTemplate={(t) => {
              const cols: ExtractionColumnDef[] = t.columns.map((c) => ({
                id: newColumnId(),
                title: c.title,
                format: c.format,
                prompt: "",
              }));
              appendColumns(cols);
              toast.success(`${t.name} added`);
            }}
            onUpdate={updateColumns}
          />
        ) : (
          <AssistantEditor protocol={protocol} isCustom={isCustom} onSaved={refresh} />
        )}
      </div>

      <UseProtocolDialog
        open={useOpen}
        onOpenChange={setUseOpen}
        protocol={protocol}
        userId={user.id}
      />

      <AddColumnsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={user.id}
        onAdd={(cols) => {
          appendColumns(cols);
          setAddOpen(false);
          toast.success(`${cols.length} column${cols.length === 1 ? "" : "s"} added`);
        }}
      />

      <ImportMarkdownDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={(cols) => {
          appendColumns(cols);
          setImportOpen(false);
          toast.success(`${cols.length} columns imported`);
        }}
      />

      <EditBasicsDialog
        state={editingBasics ? protocol : null}
        onOpenChange={(o) => setEditingBasics(o)}
        onSaved={() => {
          setEditingBasics(false);
          refresh();
        }}
      />
    </AppShell>
  );
}

/* ------------------------------ Extraction ------------------------------ */

function ExtractionEditor({
  protocol,
  isCustom,
  onAdd,
  onImport,
  onLoadTemplate,
  onUpdate,
}: {
  protocol: ResolvedProtocol;
  isCustom: boolean;
  onAdd: () => void;
  onImport: () => void;
  onLoadTemplate: (t: (typeof EXTRACTION_TEMPLATES)[number]) => void;
  onUpdate: (cols: ExtractionColumnDef[]) => void;
}) {
  const rows = useMemo<ExtractionColumnDef[]>(() => {
    if (protocol.extractionColumns && protocol.extractionColumns.length > 0) {
      return protocol.extractionColumns;
    }
    if (protocol.extractionProtocolId && !isCustom) {
      const target = getProtocol(protocol.extractionProtocolId);
      return target.columns.map((c) => ({
        id: c.key,
        title: c.label,
        format: (c.format ?? "free_text") as ColumnFormat,
        prompt: c.prompt ?? c.description ?? "",
      }));
    }
    return [];
  }, [protocol, isCustom]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggle(k: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function updateOne(id: string, patch: Partial<ExtractionColumnDef>) {
    onUpdate(rows.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeOne(id: string) {
    onUpdate(rows.filter((c) => c.id !== id));
  }

  return (
    <div className="grid gap-3">
      {isCustom && (
        <div className="flex items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                From template
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {EXTRACTION_TEMPLATES.map((t) => (
                <DropdownMenuItem key={t.id} onClick={() => onLoadTemplate(t)}>
                  {t.name} ({t.columns.length})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={onImport}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import markdown
          </Button>
          <Button size="sm" onClick={onAdd}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Column
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Plus className="h-5 w-5" />
          </div>
          <h3 className="mt-3 font-serif text-lg text-foreground">Columns</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Add columns to define what this tabular protocol extracts from each document.
          </p>
          {isCustom && (
            <Button className="mt-4" onClick={onAdd}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Column
            </Button>
          )}
        </div>
      ) : (
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
                const isOpen = expanded.has(r.id);
                return (
                  <tr key={r.id} className="align-top hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggle(r.id)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-foreground">
                      {isCustom && isOpen ? (
                        <Input
                          value={r.title}
                          onChange={(e) => updateOne(r.id, { title: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        r.title
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {isCustom && isOpen ? (
                        <Select
                          value={r.format}
                          onValueChange={(v) => updateOne(r.id, { format: v as ColumnFormat })}
                        >
                          <SelectTrigger className="h-8">
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
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{formatLabel(r.format)}</span>
                        </div>
                      )}
                    </td>
                    <td className="max-w-0 px-3 py-2.5 text-muted-foreground">
                      {isCustom && isOpen ? (
                        <Textarea
                          value={r.prompt}
                          onChange={(e) => updateOne(r.id, { prompt: e.target.value })}
                          className="min-h-[70px] text-xs"
                        />
                      ) : isOpen ? (
                        <span className="whitespace-pre-wrap">{r.prompt || "—"}</span>
                      ) : (
                        <span className="block truncate">{r.prompt || "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => removeOne(r.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive"
                          aria-label="Remove column"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Assistant ------------------------------ */

function AssistantEditor({
  protocol,
  isCustom,
  onSaved,
}: {
  protocol: ResolvedProtocol;
  isCustom: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(protocol.seedPrompt ?? "");
  useEffect(() => {
    setValue(protocol.seedPrompt ?? "");
  }, [protocol]);

  const content = protocol.seedPrompt?.trim() || protocol.description || "";

  if (!isCustom || !editing) {
    return (
      <div className="grid gap-3">
        {isCustom && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit prompt
            </Button>
          </div>
        )}
        <div className="prose prose-sm max-w-none rounded-lg border border-border p-5 text-foreground prose-headings:font-serif prose-headings:font-medium prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2">
          {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">No starter prompt yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <Label>Starter prompt</Label>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-[240px]"
        placeholder="What should the assistant do when this protocol is launched?"
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setValue(protocol.seedPrompt ?? "");
            setEditing(false);
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            updateCustomProtocol(protocol.id, { seedPrompt: value });
            toast.success("Prompt saved");
            setEditing(false);
            onSaved();
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

/* ------------------------- Add Columns dialog ------------------------- */

interface DraftColumn {
  id: string;
  title: string;
  format: ColumnFormat;
  prompt: string;
  open: boolean;
}

function AddColumnsDialog({
  open,
  onOpenChange,
  userId,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  onAdd: (cols: ExtractionColumnDef[]) => void;
}) {
  const { data: profile } = useProfile(userId);
  const modelId = profile?.ai_model ?? "claude-sonnet";
  const apiKey = keyForModel(modelId, profile);
  const [drafts, setDrafts] = useState<DraftColumn[]>([]);

  useEffect(() => {
    if (open) {
      setDrafts([
        { id: newColumnId(), title: "", format: "free_text", prompt: "", open: true },
      ]);
    }
  }, [open]);

  function update(id: string, patch: Partial<DraftColumn>) {
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
  function remove(id: string) {
    setDrafts((ds) => ds.filter((d) => d.id !== id));
  }
  function addMore() {
    setDrafts((ds) => [
      ...ds,
      { id: newColumnId(), title: "", format: "free_text", prompt: "", open: true },
    ]);
  }

  const canSubmit = drafts.length > 0 && drafts.every((d) => d.title.trim().length > 0);

  function submit() {
    onAdd(
      drafts.map((d) => ({
        id: d.id,
        title: d.title.trim(),
        format: d.format,
        prompt: d.prompt.trim(),
      })),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New column</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          {drafts.map((d, i) => (
            <DraftColumnCard
              key={d.id}
              index={i + 1}
              draft={d}
              modelId={modelId}
              apiKey={apiKey}
              onChange={(patch) => update(d.id, patch)}
              onRemove={() => remove(d.id)}
            />
          ))}
          <Button variant="outline" size="sm" onClick={addMore} className="justify-center">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add another column
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            Add columns
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DraftColumnCard({
  index,
  draft,
  modelId,
  apiKey,
  onChange,
  onRemove,
}: {
  index: number;
  draft: DraftColumn;
  modelId: string;
  apiKey: string | null;
  onChange: (patch: Partial<DraftColumn>) => void;
  onRemove: () => void;
}) {
  const [generating, setGenerating] = useState(false);

  async function autoGenerate() {
    if (!apiKey) return toast.error("Add an AI key in Settings to use Auto-Generate");
    if (!draft.title.trim()) return toast.error("Give the column a title first");
    setGenerating(true);
    try {
      const prompt = `Generate a precise clinical extraction prompt for a column titled '${draft.title.trim()}' with format '${formatLabel(draft.format)}'. The prompt should instruct an AI to extract this specific information accurately from any clinical document. Return only the prompt text, nothing else.`;
      const out = await callProviderText(apiKey, modelId, prompt);
      onChange({ prompt: out.replace(/^["']|["']$/g, "").trim() });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange({ open: !draft.open })}
          className="flex items-center gap-1.5 font-serif text-lg text-foreground"
        >
          {draft.open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Column {index}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Remove column"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {draft.open && (
        <div className="mt-3 grid gap-3">
          <div className="grid gap-1.5">
            <Label>Column title</Label>
            <Input
              value={draft.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Column name"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Format</Label>
            <Select
              value={draft.format}
              onValueChange={(v) => onChange({ format: v as ColumnFormat })}
            >
              <SelectTrigger>
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
            <div className="flex items-center justify-between">
              <Label>Prompt</Label>
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
                Auto-Generate Prompt
              </Button>
            </div>
            <Textarea
              value={draft.prompt}
              onChange={(e) => onChange({ prompt: e.target.value })}
              placeholder="What should be extracted for this column?"
              className="min-h-[100px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------- Import Markdown dialog ------------------------- */

function ImportMarkdownDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImport: (cols: ExtractionColumnDef[]) => void;
}) {
  const [text, setText] = useState("");
  const fileInput = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (open) setText("");
  }, [open]);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setText(await f.text());
  }

  function handleImport() {
    const parsed = parseMarkdownColumns(text);
    if (!parsed.ok) return toast.error(parsed.error);
    onImport(parsed.columns);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import columns from markdown</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"| Column Title | Format | Prompt |\n|---|---|---|\n| Primary Diagnosis | ICD-10 Code | ... |"}
            className="min-h-[160px] font-mono text-xs"
          />
          <div className="flex items-center gap-2">
            <input ref={fileInput} type="file" accept=".md,.txt" hidden onChange={pickFile} />
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Upload .md / .txt
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!text.trim()}>
            Import columns
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- Edit Basics dialog ------------------------- */

function EditBasicsDialog({
  state,
  onOpenChange,
  onSaved,
}: {
  state: ResolvedProtocol | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [desc, setDesc] = useState("");
  useEffect(() => {
    if (state) {
      setName(state.name);
      setArea(state.clinicalArea);
      setDesc(state.description);
    }
  }, [state]);
  if (!state) return null;
  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit basics</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Clinical area</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) return toast.error("Give it a name");
              renameCustomProtocol(state.id, name.trim());
              updateCustomProtocol(state.id, {
                clinicalArea: area.trim() || "General",
                description: desc.trim() || "Custom protocol",
              });
              toast.success("Updated");
              onSaved();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
