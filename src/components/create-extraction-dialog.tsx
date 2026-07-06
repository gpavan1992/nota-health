import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, FileText, X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { PROTOCOLS, getProtocol } from "@/lib/protocols";
import { runExtraction } from "@/lib/run-extraction";
import { parseFile, ACCEPTED_FILE_TYPES, type ParsedDoc } from "@/lib/document-parsers";

type Doc = ParsedDoc & { parsing?: boolean; error?: string };

export function CreateExtractionDialog({
  open,
  onOpenChange,
  userId,
  onCreated,
  initialProtocol,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  onCreated: (id: string) => void;
  initialProtocol?: string;
}) {
  const { data: profile } = useProfile(userId);
  const [name, setName] = useState("");
  const [protocolId, setProtocolId] = useState("medication_list");
  const [customInstruction, setCustomInstruction] = useState("");
  const [linkCase, setLinkCase] = useState(false);
  const [caseId, setCaseId] = useState<string>("");
  const [cases, setCases] = useState<{ id: string; name: string }[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setProtocolId(initialProtocol ?? "medication_list");
    setCustomInstruction("");
    setLinkCase(false);
    setCaseId("");
    setDocs([]);
    supabase
      .from("cases")
      .select("id, name")
      .order("updated_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setCases(data ?? []));
  }, [open, initialProtocol]);


  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const list = Array.from(files);
    e.target.value = "";
    // Add placeholders immediately so the UI shows progress
    setDocs((d) => [...d, ...list.map((f) => ({ name: f.name, text: "", parsing: true }))]);
    for (const f of list) {
      try {
        const parsed = await parseFile(f);
        setDocs((d) =>
          d.map((doc) =>
            doc.name === f.name && doc.parsing ? { ...parsed, parsing: false } : doc,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to parse";
        toast.error(msg);
        setDocs((d) =>
          d.map((doc) =>
            doc.name === f.name && doc.parsing
              ? { name: f.name, text: "", parsing: false, error: msg }
              : doc,
          ),
        );
      }
    }
  }

  async function loadCaseDocs() {
    if (!caseId) return;
    const { data } = await supabase.from("case_documents").select("name").eq("case_id", caseId);
    if (data) {
      setDocs((d) => [...d, ...data.map((x) => ({ name: x.name, text: "" }))]);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return toast.error("Give it a name.");
    if (!profile?.anthropic_api_key) return toast.error("Add your API key in Settings.");
    if (docs.length === 0) return toast.error("Add at least one document.");
    if (docs.some((d) => d.parsing)) return toast.error("Wait for documents to finish parsing.");
    const usable = docs.filter((d) => d.text.trim().length > 0 || d.image);
    if (usable.length === 0) return toast.error("No readable content in the attached files.");

    setBusy(true);
    const proto = getProtocol(protocolId);

    // Insert as processing
    const { data: inserted, error: insertErr } = await supabase
      .from("extractions")
      .insert({
        user_id: userId,
        name: name.trim(),
        protocol: protocolId,
        case_id: linkCase && caseId ? caseId : null,
        source_documents: docs.map((d) => ({ name: d.name })),
        status: "processing",
        columns: proto.columns as unknown as never,
        rows: [],
      })
      .select()
      .single();
    if (insertErr || !inserted) {
      setBusy(false);
      return toast.error(insertErr?.message ?? "Failed to create");
    }

    try {
      const result = await runExtraction({
        apiKey: profile.anthropic_api_key,
        modelId: profile.ai_model ?? "claude-sonnet",
        protocolName: proto.name,
        columns: proto.columns as unknown as never,
        customInstruction: protocolId === "custom" ? customInstruction : undefined,
        documents: usable,
      });
      await supabase
        .from("extractions")
        .update({
          status: "ready",
          columns: result.columns as unknown as never,
          rows: result.rows as unknown as never,
        })
        .eq("id", inserted.id);
      toast.success("Extraction ready");
      onOpenChange(false);
      onCreated(inserted.id);
    } catch (err) {
      const msg = (err as Error).message;
      await supabase.from("extractions").update({ status: "failed", error: msg }).eq("id", inserted.id);
      toast.error(msg);
      onCreated(inserted.id);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Extraction</DialogTitle>
          <DialogDescription>
            Choose a protocol and add documents. Nota Health fills in the structured fields.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="ext-name">Name</Label>
            <Input
              id="ext-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Discharge medications — Room 402"
              maxLength={120}
            />
          </div>

          <div className="grid gap-2">
            <Label>Clinical Protocol</Label>
            <Select value={protocolId} onValueChange={setProtocolId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROTOCOLS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getProtocol(protocolId).description}
            </p>
          </div>

          {protocolId === "custom" && (
            <div className="grid gap-2">
              <Label htmlFor="ext-instr">What should we extract?</Label>
              <Textarea
                id="ext-instr"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Describe the table you want (e.g., All imaging studies with modality, date, findings)."
                rows={3}
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label htmlFor="link-case">Link to a Case</Label>
              <p className="text-xs text-muted-foreground">
                Attach this extraction to an existing case.
              </p>
            </div>
            <Switch id="link-case" checked={linkCase} onCheckedChange={setLinkCase} />
          </div>

          {linkCase && (
            <div className="grid gap-2">
              <Label>Case</Label>
              <div className="flex gap-2">
                <Select value={caseId} onValueChange={setCaseId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a case…" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={loadCaseDocs} disabled={!caseId}>
                  Pull docs
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Documents</Label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border py-4 text-sm text-muted-foreground hover:bg-accent/50">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Upload PDF, Word, images, or text
              </div>
              <span className="text-[11px]">
                PDF · DOCX · PNG/JPG/WEBP · TXT/MD/CSV/JSON — up to 25MB each
              </span>
              <input
                type="file"
                hidden
                multiple
                onChange={handleFile}
                accept={ACCEPTED_FILE_TYPES}
              />
            </label>
            {docs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {docs.map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    <FileText className="h-3 w-3" />
                    {d.name}
                    {d.parsing && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                    {!d.parsing && d.error && (
                      <span className="text-destructive">({d.error})</span>
                    )}
                    {!d.parsing && !d.error && d.image && (
                      <span className="text-muted-foreground">(image)</span>
                    )}
                    {!d.parsing && !d.error && !d.image && !d.text && (
                      <span className="text-muted-foreground">(name only)</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setDocs((v) => v.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
