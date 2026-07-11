import { Download, FileText } from "lucide-react";
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
  const isImage = source?.mime?.startsWith("image/");
  const isPdf = source?.mime === "application/pdf" || source?.name.toLowerCase().endsWith(".pdf");

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
            <iframe src={source.url} title={source.name} className="h-full min-h-[80vh] w-full border-0" />
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
