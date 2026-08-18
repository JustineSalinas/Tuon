"use client";

/**
 * Client-side PDF text extraction.
 *
 * Deliberately never uploads the file. Students on Philippine mobile data
 * should not spend 20MB of their load sending us a document whose text they
 * already have locally — and it keeps us off Firebase Storage entirely.
 *
 * pdfjs is imported lazily so its ~1MB bundle only loads when someone
 * actually drops a PDF.
 */

export const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25MB
export const MAX_PDF_PAGES = 80;

export interface PdfExtractResult {
  text: string;
  pageCount: number;
  pagesRead: number;
  /** True when we stopped early at MAX_PDF_PAGES. */
  truncated: boolean;
  title: string | null;
}

export class PdfExtractError extends Error {
  constructor(
    message: string,
    /** Shown to the student verbatim. */
    public readonly userMessage: string,
  ) {
    super(message);
    this.name = "PdfExtractError";
  }
}

let workerConfigured = false;

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerConfigured) {
    // Served from our own origin (see scripts/copy-pdf-worker.mjs) rather than
    // a CDN: one less third-party request to fail on a bad connection, and no
    // bundler-specific `?url` import to break when the toolchain changes.
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerConfigured = true;
  }
  return pdfjs;
}

export async function extractPdfText(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<PdfExtractResult> {
  if (file.size > MAX_PDF_BYTES) {
    throw new PdfExtractError(
      "file too large",
      `That PDF is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${
        MAX_PDF_BYTES / 1024 / 1024
      }MB — try splitting it into chapters.`,
    );
  }

  let pdfjs: Awaited<ReturnType<typeof loadPdfjs>>;
  try {
    pdfjs = await loadPdfjs();
  } catch (error) {
    throw new PdfExtractError(
      `pdfjs failed to load: ${String(error)}`,
      "Could not start the PDF reader. Please refresh and try again.",
    );
  }

  const buffer = await file.arrayBuffer();

  // In pdfjs v6 `destroy()` lives on the loading task, not the document, so
  // hold onto the task in order to release the worker afterwards.
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  let doc: Awaited<typeof loadingTask.promise>;
  try {
    doc = await loadingTask.promise;
  } catch (error) {
    await loadingTask.destroy().catch(() => {});
    const message = String(error);
    if (message.includes("PasswordException") || message.includes("password")) {
      throw new PdfExtractError(
        "password protected",
        "That PDF is password-protected. Remove the password and try again.",
      );
    }
    throw new PdfExtractError(
      `getDocument failed: ${message}`,
      "That file could not be read as a PDF. It may be corrupted.",
    );
  }

  const pageCount = doc.numPages;
  const pagesRead = Math.min(pageCount, MAX_PDF_PAGES);
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pagesRead; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    // pdfjs hands back positioned text runs, not lines. Re-introduce line
    // breaks using the EOL flag so the model sees paragraphs rather than one
    // long smear of words.
    let pageText = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      pageText += item.str;
      if (item.hasEOL) pageText += "\n";
      else if (item.str && !item.str.endsWith(" ")) pageText += " ";
    }

    chunks.push(pageText.trim());
    page.cleanup();
    onProgress?.(pageNumber / pagesRead);
  }

  const metadata = await doc.getMetadata().catch(() => null);
  const rawTitle =
    (metadata?.info as { Title?: string } | undefined)?.Title?.trim() || null;

  await loadingTask.destroy().catch(() => {});

  const text = normalise(chunks.join("\n\n"));

  if (text.length < 80) {
    throw new PdfExtractError(
      "no text layer",
      "No readable text found. This looks like a scanned PDF or images of pages — Tuón cannot read those yet. Try a PDF exported from a document.",
    );
  }

  return {
    text,
    pageCount,
    pagesRead,
    truncated: pageCount > pagesRead,
    // Some exporters put junk like "Microsoft Word - doc1" in the title.
    title: rawTitle && rawTitle.length > 2 && !/^untitled$/i.test(rawTitle) ? rawTitle : null,
  };
}

/** Cleans up the artefacts of positioned-text extraction. */
function normalise(text: string): string {
  return (
    text
      // Words split across a line break by hyphenation.
      .replace(/(\w)-\n(\w)/g, "$1$2")
      // Collapse runs of spaces, but keep newlines.
      .replace(/[ \t]{2,}/g, " ")
      // Collapse 3+ blank lines to a paragraph break.
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim()
  );
}

/** A readable note title from the filename, when the PDF has no metadata. */
export function titleFromFilename(filename: string): string {
  return (
    filename
      .replace(/\.pdf$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 140) || "Imported PDF"
  );
}
