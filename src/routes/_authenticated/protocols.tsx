import { useMemo, useState, useEffect } from "react";
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
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import {
  BUILT_IN_PROTOCOLS,
  loadCustomProtocols,
  saveCustomProtocol,
  updateCustomProtocol,
  deleteCustomProtocol,
  loadDeactivatedIds,
  deactivateBuiltIn,
  activateBuiltIn,
  type ClinicalProtocol,
  type CustomProtocol,
  type ProtocolType,
} from "@/lib/clinical-protocols";


export const Route = createFileRoute("/_authenticated/protocols")({
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
      navigate({ to: "/extract", search: { new: true, protocol: target } });
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
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search protocols…"
          className="max-w-xs"
        />
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
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  initial?: CustomProtocol | null;
  onOpenChange: (o: boolean) => void;
  onSaved: (mode: "create" | "edit") => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProtocolType>("assistant");
  const [clinicalArea, setClinicalArea] = useState("");
  const [description, setDescription] = useState("");
  const [seedPrompt, setSeedPrompt] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setType(initial?.type ?? "assistant");
    setClinicalArea(initial?.clinicalArea ?? "");
    setDescription(initial?.description ?? "");
    setSeedPrompt(initial?.seedPrompt ?? "");
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
    const payload = {
      name: name.trim(),
      type,
      clinicalArea: clinicalArea.trim() || "General",
      description: description.trim() || "Custom protocol",
      seedPrompt: seedPrompt.trim() || undefined,
      // Custom extraction protocols fall back to "start from scratch" in Extract.
      extractionProtocolId: type === "extraction" ? "custom" : undefined,
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

  const isEdit = !!initial;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
