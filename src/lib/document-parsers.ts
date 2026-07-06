// Client-side parsers for the extraction dialog.
// Supports plain text, PDF (pdfjs-dist), Word (mammoth), and images
// (passed through as base64 for vision models).

import * as pdfjsLib from "pdfjs-dist";
// Vite worker import — bundles the pdf.js worker as a Web Worker.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - ?worker suffix is handled by Vite
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

export type ParsedDoc = {
  name: string;
  /** Extracted text (may be empty for images). */
  text: string;
  /** For images: base64-encoded data URL payload for vision models. */
  image?: { data: string; mediaType: string };
};

const TEXT_EXT = /\.(txt|md|csv|json|text|log|tsv|xml|html?|rtf)$/i;
const PDF_EXT = /\.pdf$/i;
const DOCX_EXT = /\.docx$/i;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i;

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
};

export const ACCEPTED_FILE_TYPES =
  ".txt,.md,.csv,.json,.text,.log,.tsv,.xml,.html,.htm,.rtf,.pdf,.docx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

export async function parseFile(file: File): Promise<ParsedDoc> {
  if (file.size > MAX_BYTES) {
    throw new Error(`${file.name} is too large (max 25MB)`);
  }
  const name = file.name;

  if (PDF_EXT.test(name)) return { name, text: await parsePdf(file) };
  if (DOCX_EXT.test(name)) return { name, text: await parseDocx(file) };

  if (IMAGE_EXT.test(name)) {
    const ext = name.split(".").pop()!.toLowerCase();
    const mediaType = IMAGE_MIME[ext] ?? file.type ?? "image/png";
    const data = await fileToBase64(file);
    return { name, text: "", image: { data, mediaType } };
  }

  if (TEXT_EXT.test(name) || file.type.startsWith("text/")) {
    const text = await file.text();
    return { name, text: text.slice(0, 200_000) };
  }

  throw new Error(`Unsupported file type: ${name}`);
}

async function parsePdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  const maxPages = Math.min(pdf.numPages, 100);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    parts.push(`[Page ${i}]\n${pageText}`);
  }
  return parts.join("\n\n").slice(0, 200_000);
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return (result.value ?? "").slice(0, 200_000);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result ?? "");
      const idx = s.indexOf(",");
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
