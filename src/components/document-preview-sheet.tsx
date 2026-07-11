import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
// @ts-expect-error - Vite bundles the pdf.js worker from the package.
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

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
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    setRenderUrl(null);
    setFileError(null);
    if (!open || !source?.url) return;

    if (source.url.startsWith("blob:") || source.url.startsWith("data:")) {
      setRenderUrl(source.url);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoadingFile(true);
    (async () => {
      try {
        const res = await fetch(source.url!);
        if (!res.ok) throw new Error(`Failed to load document (${res.status})`);
        const rawBlob = await res.blob();
        const blob = source.mime && rawBlob.type !== source.mime
          ? new Blob([rawBlob], { type: source.mime })
          : rawBlob;
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setRenderUrl(objectUrl);
      } catch (err) {
        if (!cancelled) setFileError((err as Error).message);
      } finally {
        if (!cancelled) setLoadingFile(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, source?.url, source?.mime]);

  useEffect(() => {
    setDocxHtml(null);
    setDocxError(null);
    if (!open || !renderUrl || !isDocx) return;
    let cancelled = false;
    setLoadingDocx(true);
    (async () => {
      try {
        const res = await fetch(renderUrl);
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
  }, [open, renderUrl, isDocx]);

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
          ) : fileError ? (
            <div className="p-6 text-sm text-destructive">Failed to load preview: {fileError}</div>
          ) : loadingFile && source.url && !renderUrl ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading document…
            </div>
          ) : isImage && renderUrl ? (
            <img src={renderUrl} alt={source.name} className="mx-auto max-w-full" />
          ) : isPdf && renderUrl ? (
            <PdfInlinePreview url={renderUrl} name={source.name} />
          ) : isDocx && renderUrl ? (
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
          ) : renderUrl ? (
            <iframe
              src={renderUrl}
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

function PdfInlinePreview({ url, name }: { url: string; name: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | null = null;

    setLoading(true);
    setError(null);
    if (hostRef.current) hostRef.current.innerHTML = "";

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`);
        const data = await res.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        const host = hostRef.current;
        if (!host || cancelled) return;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const availableWidth = Math.min(host.clientWidth || 760, 980) - 32;
          const scale = Math.max(0.8, Math.min(1.8, availableWidth / baseViewport.width));
          const viewport = page.getViewport({ scale });

          const pageShell = document.createElement("section");
          pageShell.className = "mx-auto mb-4 w-fit max-w-full overflow-hidden rounded-sm border border-border bg-white shadow-sm";
          pageShell.setAttribute("aria-label", `${name} page ${pageNumber}`);

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Could not create PDF canvas");
          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

          pageShell.appendChild(canvas);
          host.appendChild(pageShell);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (hostRef.current) hostRef.current.innerHTML = "";
      void loadingTask?.destroy();
    };
  }, [url, name]);

  return (
    <div className="min-h-[80vh] p-4">
      {loading && (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Rendering PDF…
        </div>
      )}
      {error && <div className="p-6 text-sm text-destructive">Failed to render PDF: {error}</div>}
      <div ref={hostRef} aria-label={`${name} PDF preview`} className={loading ? "hidden" : "space-y-4"} />
    </div>
  );
}
