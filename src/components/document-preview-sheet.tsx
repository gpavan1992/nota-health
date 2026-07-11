import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export type PreviewSource = {
  name: string;
  /** Object URL (for pdf/image) or storage URL. */
  url?: string;
  /** MIME type when known. */
  mime?: string;
  /** Extracted text fallback (for txt/docx or when no url). */
  text?: string;
};

export function DocumentPreviewSheet({
  source,
  open,
  onOpenChange,
}: {
  source: PreviewSource | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const lower = source?.name.toLowerCase() ?? "";
  const isImage = source?.mime?.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(lower);
  const isPdf = source?.mime === "application/pdf" || lower.endsWith(".pdf");
  const isDocx = lower.endsWith(".docx") || source?.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isPlainText = /\.(txt|md|csv|json|log|tsv|xml|html?|rtf)$/i.test(lower) || source?.mime?.startsWith("text/");

  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [loadingDocx, setLoadingDocx] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);

  useEffect(() => {
    setDocxHtml(null);
    setDocxError(null);
    if (!open || !source?.url || !isDocx) return;
    let cancelled = false;
    setLoadingDocx(true);
    (async () => {
      try {
        const res = await fetch(source.url!);
        if (!res.ok) throw new Error(`Failed to fetch document (${res.status})`);
        const buf = await res.arrayBuffer();
        // @ts-expect-error - no types for browser entry
        const mammoth = await import("mammoth/mammoth.browser");
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        if (!cancelled) setDocxHtml(result.value || "<p><em>(empty document)</em></p>");
      } catch (err) {
        if (!cancelled) setDocxError((err as Error).message);
      } finally {
        if (!cancelled) setLoadingDocx(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, source?.url, isDocx]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b border-border px-4 py-3">
          <SheetTitle className="flex items-center gap-2 truncate text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" />
            <span className="truncate">{source?.name ?? "Preview"}</span>
          </SheetTitle>
          {source?.url && (
            <Button asChild size="sm" variant="outline" className="h-7">
              <a href={source.url} download={source.name} target="_blank" rel="noreferrer">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </a>
            </Button>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-auto bg-muted/30">
          {!source ? (
            <div className="p-6 text-sm text-muted-foreground">No document selected.</div>
          ) : isImage && source.url ? (
            <img src={source.url} alt={source.name} className="mx-auto max-w-full" />
          ) : isPdf && source.url ? (
            <iframe
              src={`${source.url}#toolbar=1&view=FitH`}
              title={source.name}
              className="h-full min-h-[80vh] w-full border-0"
            />
          ) : isDocx && source.url ? (
            loadingDocx ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Rendering document…
              </div>
            ) : docxError ? (
              <div className="p-6 text-sm text-destructive">Failed to render: {docxError}</div>
            ) : docxHtml ? (
              <div
                className="prose prose-sm mx-auto max-w-none bg-white p-8 text-foreground shadow-sm dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            ) : null
          ) : isPlainText && source.text ? (
            <pre className="whitespace-pre-wrap p-4 text-xs leading-relaxed text-foreground">{source.text}</pre>
          ) : source.url ? (
            <iframe
              src={source.url}
              title={source.name}
              className="h-full min-h-[80vh] w-full border-0 bg-white"
            />
          ) : source.text ? (
            <pre className="whitespace-pre-wrap p-4 text-xs leading-relaxed text-foreground">{source.text}</pre>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              Preview isn&apos;t available for this document. Try downloading it instead.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
