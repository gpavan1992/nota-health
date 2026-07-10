import { useState } from "react";
import { toast } from "sonner";
import { X, Plus, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CASE_TYPES,
  useCreateCase,
  type CaseType,
} from "@/hooks/use-cases";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateCaseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [caseRef, setCaseRef] = useState("");
  const [type, setType] = useState<CaseType>("patient");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [docInput, setDocInput] = useState("");
  const [docs, setDocs] = useState<string[]>([]);

  const create = useCreateCase();

  function reset() {
    setName("");
    setCaseRef("");
    setType("patient");
    setMemberInput("");
    setMembers([]);
    setDocInput("");
    setDocs([]);
  }

  function addMember() {
    const email = memberInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (members.includes(email)) {
      setMemberInput("");
      return;
    }
    setMembers((m) => [...m, email]);
    setMemberInput("");
  }

  function addDoc() {
    const value = docInput.trim();
    if (!value) return;
    if (value.length > 200) {
      toast.error("Document name too long");
      return;
    }
    if (docs.includes(value)) {
      setDocInput("");
      return;
    }
    setDocs((d) => [...d, value]);
    setDocInput("");
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const MAX_BYTES = 50 * 1024 * 1024;
    const ALLOWED = /\.(pdf|docx|txt)$/i;
    const accepted: string[] = [];
    for (const f of files) {
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} is larger than 50 MB — file rejected.`);
        continue;
      }
      if (!ALLOWED.test(f.name)) {
        toast.error(`${f.name} is not a supported format. Use PDF, DOCX, or TXT.`);
        continue;
      }
      accepted.push(f.name);
    }
    if (accepted.length) setDocs((d) => Array.from(new Set([...d, ...accepted])));
    e.target.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Case name is required");
      return;
    }
    if (trimmed.length > 160) {
      toast.error("Case name is too long");
      return;
    }
    try {
      await create.mutateAsync({
        name: trimmed,
        case_ref: caseRef.trim() || null,
        case_type: type,
        member_emails: members,
        document_names: docs,
      });
      toast.success("Case created");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create case");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            Create a new case
          </DialogTitle>
          <DialogDescription>
            Give this case a name and add anyone who should have access.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="case-name">Case name</Label>
            <Input
              id="case-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={160}
              placeholder="e.g. Patient — J. Doe, 2026 admission"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="case-ref">Case ID / reference</Label>
              <Input
                id="case-ref"
                value={caseRef}
                onChange={(e) => setCaseRef(e.target.value)}
                maxLength={80}
                placeholder="MRN-000123"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="case-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CaseType)}>
                <SelectTrigger id="case-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ChipField
            label="Care team (by email)"
            placeholder="colleague@hospital.org"
            inputValue={memberInput}
            setInputValue={setMemberInput}
            onAdd={addMember}
            items={members}
            onRemove={(email) => setMembers((m) => m.filter((x) => x !== email))}
            inputType="email"
            variant="secondary"
          />

          <div className="space-y-2">
            <ChipField
              label="Documents"
              placeholder="Discharge summary.pdf"
              inputValue={docInput}
              setInputValue={setDocInput}
              onAdd={addDoc}
              items={docs}
              onRemove={(name) => setDocs((d) => d.filter((x) => x !== name))}
              variant="outline"
              itemClassName="font-mono text-[11px]"
            />
            <div className="flex justify-start">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  className="hidden"
                  onChange={handleFilePick}
                />
                <Plus className="h-3.5 w-3.5" /> Or select files (PDF, DOCX, TXT — max 50 MB)
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create case
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChipField({
  label,
  placeholder,
  inputValue,
  setInputValue,
  onAdd,
  items,
  onRemove,
  inputType = "text",
  variant = "secondary",
  itemClassName,
}: {
  label: string;
  placeholder: string;
  inputValue: string;
  setInputValue: (v: string) => void;
  onAdd: () => void;
  items: string[];
  onRemove: (v: string) => void;
  inputType?: string;
  variant?: "secondary" | "outline";
  itemClassName?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type={inputType}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={onAdd}>
          Add
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge
              key={item}
              variant={variant}
              className={`gap-1 pr-1 ${itemClassName ?? ""}`}
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="rounded-full p-0.5 hover:bg-foreground/10"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
