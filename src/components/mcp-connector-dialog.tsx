import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type McpConnector =
  Database["public"]["Tables"]["mcp_connectors"]["Row"];

type Header = { key: string; value: string };

export function McpConnectorDialog({
  open,
  onOpenChange,
  userId,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  existing?: McpConnector | null;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [headers, setHeaders] = useState<Header[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel(existing?.label ?? "");
    setUrl(existing?.url ?? "");
    setBearerToken(existing?.bearer_token ?? "");
    const rawHeaders = (existing?.headers ?? {}) as Record<string, string>;
    setHeaders(
      Object.entries(rawHeaders).map(([key, value]) => ({ key, value: String(value) })),
    );
    setAdvancedOpen(Object.keys(rawHeaders).length > 0);
  }, [open, existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedLabel = label.trim();
    const trimmedUrl = url.trim();
    if (!trimmedLabel) return toast.error("Add a label so you can identify this connector.");
    if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
      return toast.error("URL endpoint must start with http:// or https://");
    }

    const headersMap: Record<string, string> = {};
    for (const h of headers) {
      const k = h.key.trim();
      const v = h.value.trim();
      if (!k) continue;
      headersMap[k] = v;
    }

    const payload = {
      user_id: userId,
      label: trimmedLabel,
      url: trimmedUrl,
      bearer_token: bearerToken.trim() || null,
      headers: headersMap,
    };

    setBusy(true);
    try {
      if (existing) {
        const { error } = await supabase
          .from("mcp_connectors")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
        toast.success("Connector updated");
      } else {
        const { error } = await supabase.from("mcp_connectors").insert(payload);
        if (error) throw error;
        toast.success("Connector added");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save connector");
    } finally {
      setBusy(false);
    }
  }

  function updateHeader(i: number, patch: Partial<Header>) {
    setHeaders((h) => h.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function addHeader() {
    setHeaders((h) => [...h, { key: "", value: "" }]);
  }
  function removeHeader(i: number) {
    setHeaders((h) => h.filter((_, idx) => idx !== i));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">
            Connectors › {existing ? "Edit MCP connector" : "Add MCP connector"}
          </div>
          <DialogTitle className="sr-only">
            {existing ? "Edit MCP connector" : "Add MCP connector"}
          </DialogTitle>
          <DialogDescription className="text-sm text-foreground/80">
            The assistant will have access to this MCP server and its enabled tools.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <FieldRow label="Label" htmlFor="mcp-label">
            <Input
              id="mcp-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Connector label"
              maxLength={80}
              autoFocus
            />
          </FieldRow>

          <FieldRow label="URL endpoint" htmlFor="mcp-url">
            <Input
              id="mcp-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://mcp.example.com/mcp"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
            />
          </FieldRow>

          <FieldRow label="Bearer token" htmlFor="mcp-token">
            <div className="space-y-1">
              <Input
                id="mcp-token"
                type="password"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="Bearer token"
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-sm"
              />
              <p className="text-right text-[11px] text-muted-foreground">
                Tokens are stored encrypted.
              </p>
            </div>
          </FieldRow>

          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-1 text-sm font-medium text-foreground/80 hover:text-foreground"
          >
            Advanced
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")}
            />
          </button>

          {advancedOpen && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">Custom headers</p>
                <Button type="button" size="sm" variant="ghost" onClick={addHeader}>
                  + Add header
                </Button>
              </div>
              {headers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Optional. Add any extra headers the MCP server requires.
                </p>
              )}
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={h.key}
                    onChange={(e) => updateHeader(i, { key: e.target.value })}
                    placeholder="Header name"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={h.value}
                    onChange={(e) => updateHeader(i, { value: e.target.value })}
                    placeholder="Value"
                    className="h-8 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(i)}
                    className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                    aria-label="Remove header"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="rounded-full px-6">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existing ? "Save" : "Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-start gap-3">
      <Label htmlFor={htmlFor} className="pt-2 text-sm font-medium text-foreground">
        {label}
      </Label>
      <div>{children}</div>
    </div>
  );
}
