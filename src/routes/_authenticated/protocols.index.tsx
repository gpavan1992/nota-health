import { useMemo, useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
  Copy as CopyIcon,
  X,
  Search,
  Star,
  User as UserIcon,
  ExternalLink,
} from "lucide-react";

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FORMAT_ICONS, areaColor } from "@/lib/protocol-icons";
import { getProtocol } from "@/lib/protocols";
import { UseProtocolDialog } from "@/components/use-protocol-dialog";
import {
  BUILT_IN_PROTOCOLS,
  loadCustomProtocols,
  saveCustomProtocol,
  deleteCustomProtocol,
  renameCustomProtocol,
  duplicateProtocol,
  deactivateBuiltIn,
  activateBuiltIn,
  loadDeactivatedIds,
  formatLabel,
  type ClinicalProtocol,
  type CustomProtocol,
  type ProtocolType,
} from "@/lib/clinical-protocols";

export const Route = createFileRoute("/_authenticated/protocols/")({
  head: () => ({ meta: [{ title: "Protocols — Nota Health" }] }),
  component: ProtocolsPage,
});

type Row = ClinicalProtocol & { source: "Built-in" | "Custom"; deactivated: boolean };

function ProtocolsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "user" | "system">("all");
  const [search, setSearch] = useState("");
  const [customs, setCustoms] = useState<CustomProtocol[]>([]);
  const [deactivatedIds, setDeactivatedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [useProtocol, setUseProtocol] = useState<ClinicalProtocol | null>(null);

  useEffect(() => {
    setCustoms(loadCustomProtocols());
    setDeactivatedIds(loadDeactivatedIds());
  }, []);

  function refresh() {
    setCustoms(loadCustomProtocols());
    setDeactivatedIds(loadDeactivatedIds());
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

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const allBuiltIn = selectedRows.length > 0 && selectedRows.every((r) => r.source === "Built-in");
  const allCustom = selectedRows.length > 0 && selectedRows.every((r) => r.source === "Custom");
  const anyActive = selectedRows.some((r) => !r.deactivated);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function handleDelete(ids: string[]) {
    ids.forEach((id) => deleteCustomProtocol(id));
    setSelected(new Set());
    refresh();
    toast.success(`${ids.length} protocol${ids.length === 1 ? "" : "s"} deleted`);
  }

  function handleDuplicate(rows: ClinicalProtocol[]) {
    rows.forEach((r) => duplicateProtocol(r));
    setSelected(new Set());
    refresh();
    toast.success(`${rows.length} protocol${rows.length === 1 ? "" : "s"} duplicated`);
  }

  function handleDeactivate(ids: string[], activate = false) {
    ids.forEach((id) => (activate ? activateBuiltIn(id) : deactivateBuiltIn(id)));
    setSelected(new Set());
    refresh();
    toast.success(activate ? "Activated" : "Deactivated");
  }

  function openUse(p: Row) {
    if (p.deactivated) return;
    setUseProtocol(p);
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

      {selectedRows.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="whitespace-nowrap font-medium">
            {selectedRows.length} selected
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDuplicate(selectedRows)}
          >
            <CopyIcon className="mr-1.5 h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!(allCustom && selectedRows.length === 1)}
            onClick={() => {
              const r = selectedRows[0];
              setRenaming({ id: r.id, name: r.name });
            }}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Rename
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!allBuiltIn}
            onClick={() =>
              handleDeactivate(
                selectedRows.map((r) => r.id),
                !anyActive,
              )
            }
          >
            <Power className="mr-1.5 h-3.5 w-3.5" />
            {anyActive ? "Deactivate" : "Activate"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={!allCustom}
            onClick={() => handleDelete(selectedRows.map((r) => r.id))}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

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
                  <th className="w-10 px-3 py-3">
                    <Checkbox
                      checked={selected.size === rows.length && rows.length > 0}
                      onCheckedChange={() => toggleAll()}
                      aria-label="Select all"
                    />
                  </th>
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
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={selected.has(p.id)}
                        onCheckedChange={() => toggle(p.id)}
                        aria-label={`Select ${p.name}`}
                      />
                    </td>
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
                      <RowMenu
                        row={p}
                        onUse={() => openUse(p)}
                        onDuplicate={() => handleDuplicate([p])}
                        onEdit={() => {
                          if (p.source === "Custom") {
                            navigate({ to: "/protocols/$protocolId", params: { protocolId: p.id } });
                          } else {
                            const copy = duplicateProtocol(p);
                            refresh();
                            navigate({ to: "/protocols/$protocolId", params: { protocolId: copy.id } });
                          }
                        }}
                        onRename={() => setRenaming({ id: p.id, name: p.name })}
                        onDelete={() => handleDelete([p.id])}
                        onDeactivate={() =>
                          handleDeactivate([p.id], p.deactivated)
                        }
                      />
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
          openUse(p);
        }}
      />

      <CreateProtocolDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          refresh();
          setCreateOpen(false);
          navigate({ to: "/protocols/$protocolId", params: { protocolId: id } });
        }}
      />

      <RenameDialog
        state={renaming}
        onOpenChange={(o) => !o && setRenaming(null)}
        onSaved={() => {
          setRenaming(null);
          setSelected(new Set());
          refresh();
        }}
      />

      <UseProtocolDialog
        open={useProtocol !== null}
        onOpenChange={(o) => !o && setUseProtocol(null)}
        protocol={useProtocol}
        userId={user.id}
      />
    </AppShell>
  );
}

function RowMenu({
  row,
  onUse,
  onDuplicate,
  onEdit,
  onRename,
  onDelete,
  onDeactivate,
}: {
  row: Row;
  onUse: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDeactivate: () => void;
}) {
  const isCustom = row.source === "Custom";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onUse} disabled={row.deactivated}>
          <Play className="mr-2 h-4 w-4" />
          Use
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/protocols/$protocolId" params={{ protocolId: row.id }}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View Page
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isCustom && (
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onDuplicate}>
          <CopyIcon className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        {isCustom ? (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onDeactivate}>
            <Power className="mr-2 h-4 w-4" />
            {row.deactivated ? "Activate" : "Deactivate"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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

function CreateProtocolDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProtocolType>("assistant");
  const [clinicalArea, setClinicalArea] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setType("assistant");
    setClinicalArea("");
    setDescription("");
  }, [open]);

  function handleSave() {
    if (!name.trim()) return toast.error("Give the protocol a name");
    const record = saveCustomProtocol({
      name: name.trim(),
      type,
      clinicalArea: clinicalArea.trim() || "General",
      description: description.trim() || "Custom protocol",
      seedPrompt: type === "assistant" ? "" : undefined,
      extractionProtocolId: type === "extraction" ? "custom" : undefined,
      extractionColumns: type === "extraction" ? [] : undefined,
    });
    onCreated(record.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New protocol</DialogTitle>
          <DialogDescription>
            Start with the basics. You'll add columns or a starter prompt on the next screen.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="np-name">Title</Label>
            <Input
              id="np-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cardiology admit checklist"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("assistant")}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  type === "assistant"
                    ? "border-primary bg-accent"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                Assistant
              </button>
              <button
                type="button"
                onClick={() => setType("extraction")}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  type === "extraction"
                    ? "border-primary bg-accent"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <TableIcon className="h-4 w-4" />
                Extraction
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="np-area">Clinical area</Label>
              <Input
                id="np-area"
                value={clinicalArea}
                onChange={(e) => setClinicalArea(e.target.value)}
                placeholder="e.g. Cardiology"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="np-desc">Description</Label>
              <Input
                id="np-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this protocol does"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({
  state,
  onOpenChange,
  onSaved,
}: {
  state: { id: string; name: string } | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  useEffect(() => {
    if (state) setValue(state.name);
  }, [state]);
  if (!state) return null;
  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename protocol</DialogTitle>
        </DialogHeader>
        <Input value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!value.trim()) return toast.error("Give it a name");
              renameCustomProtocol(state.id, value.trim());
              toast.success("Renamed");
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
    let cols: { key: string; title: string; format: string; prompt: string }[] = [];
    if (protocol.extractionColumns && protocol.extractionColumns.length > 0) {
      cols = protocol.extractionColumns.map((c) => ({
        key: c.id,
        title: c.title,
        format: c.format,
        prompt: c.prompt,
      }));
    } else if (protocol.extractionProtocolId) {
      const target = getProtocol(protocol.extractionProtocolId);
      cols = target.columns.map((c) => ({
        key: c.key,
        title: c.label,
        format: c.format ?? "free_text",
        prompt: c.prompt ?? c.description ?? "",
      }));
    }
    if (cols.length === 0) {
      return <p className="text-sm text-muted-foreground">No columns defined.</p>;
    }
    return (
      <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
        {cols.map((c) => {
          const Icon =
            FORMAT_ICONS[c.format as keyof typeof FORMAT_ICONS] ?? FORMAT_ICONS.free_text;
          return (
            <li key={c.key} className="flex items-start gap-3 px-3 py-2.5 text-sm">
              <div className="flex min-w-[40%] items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium text-foreground">{c.title}</span>
              </div>
              <span className="w-28 shrink-0 text-xs text-muted-foreground">
                {formatLabel(c.format as never)}
              </span>
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {c.prompt || "—"}
              </span>
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
