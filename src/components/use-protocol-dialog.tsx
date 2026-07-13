import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare, FolderOpen, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCases, useCaseDocuments } from "@/hooks/use-cases";
import type { ClinicalProtocol } from "@/lib/clinical-protocols";

type UseTarget = "assistant" | "case";

export function UseProtocolDialog({
  open,
  onOpenChange,
  protocol,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  protocol: ClinicalProtocol | null;
  userId: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [target, setTarget] = useState<UseTarget>("assistant");
  const [additional, setAdditional] = useState("");
  const [caseId, setCaseId] = useState<string>("");
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTarget("assistant");
    setAdditional("");
    setCaseId("");
    setSelectedDocs(new Set());
  }, [open]);

  const { data: cases } = useCases();
  const { data: caseDocs } = useCaseDocuments(target === "case" ? caseId : undefined);

  const canConfirm = useMemo(() => {
    if (!protocol) return false;
    if (target === "case" && !caseId) return false;
    return true;
  }, [protocol, target, caseId]);

  async function handleConfirm() {
    if (!protocol) return;
    setBusy(true);
    try {
      const extra = additional.trim();
      if (protocol.type === "assistant") {
        const seed = [protocol.seedPrompt ?? "", extra].filter(Boolean).join("\n\n");
        const { data: thread, error } = await supabase
          .from("chat_threads")
          .insert({ user_id: userId, title: protocol.name })
          .select()
          .single();
        if (error || !thread) throw new Error(error?.message ?? "Could not start conversation");

        if (target === "case" && caseId) {
          await supabase
            .from("case_conversations")
            .insert({ case_id: caseId, thread_id: thread.id, added_by: userId });
        }
        qc.invalidateQueries({ queryKey: ["chat_threads", userId] });
        onOpenChange(false);
        navigate({
          to: "/assistant/$threadId",
          params: { threadId: thread.id },
          search: { seed },
        });
        return;
      }

      // Extraction
      const targetProto = protocol.extractionProtocolId ?? "custom";
      const docNames = target === "case" ? Array.from(selectedDocs) : [];
      onOpenChange(false);
      navigate({
        to: "/extract",
        search: {
          new: true,
          protocol: targetProto,
          ...(protocol.id.startsWith("custom_") ? { customProtocolId: protocol.id } : {}),
          ...(extra ? { instruction: extra } : {}),
          ...(target === "case" && caseId ? { caseId } : {}),
          ...(docNames.length ? { preselectedDocs: docNames.join("||") } : {}),
        },
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!protocol) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Use “{protocol.name}”</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label>Use in</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTarget("assistant")}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  target === "assistant"
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Assistant
              </button>
              <button
                type="button"
                onClick={() => setTarget("case")}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  target === "case"
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                Case
              </button>
            </div>
          </div>

          {target === "case" && (
            <div className="grid gap-2">
              <Label>Select case</Label>
              <Select value={caseId} onValueChange={setCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a case…" />
                </SelectTrigger>
                <SelectContent>
                  {(cases ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {target === "case" && caseId && protocol.type === "extraction" && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Documents from case</Label>
                {caseDocs && caseDocs.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (selectedDocs.size === caseDocs.length) setSelectedDocs(new Set());
                      else setSelectedDocs(new Set(caseDocs.map((d) => d.name)));
                    }}
                  >
                    {selectedDocs.size === caseDocs.length ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                {!caseDocs || caseDocs.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-muted-foreground">
                    No documents in this case yet. You can still upload files in the next step.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {caseDocs.map((d) => {
                      const checked = selectedDocs.has(d.name);
                      return (
                        <li key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setSelectedDocs((prev) => {
                                const next = new Set(prev);
                                if (v) next.add(d.name);
                                else next.delete(d.name);
                                return next;
                              });
                            }}
                          />
                          <span className="truncate">{d.name}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="up-add">Additional message (optional)</Label>
            <Textarea
              id="up-add"
              value={additional}
              onChange={(e) => setAdditional(e.target.value)}
              placeholder="Add any additional instructions…"
              className="min-h-[90px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Next
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
