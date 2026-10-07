"use client";

/**
 * Client-side Word (.docx) text extraction.
 *
 * Same reasoning as `lib/pdf/extract.ts`: the file never leaves the device,
 * and the library is loaded lazily so its bundle only ships to a student who
 * actually drops a Word file.
 *
 * `.doc` (the pre-2007 binary format) is deliberately not supported — it has
 * no practical browser-side reader, and every exporter still producing it
 * also offers "Save As .docx".
 */

export const MAX_DOCX_BYTES = 25 * 1024 * 1024; // 25MB

export interface DocxExtractResult {
  text: string;
  /** True when mammoth reported it skipped or substituted something. */
  hadWarnings: boolean;
}

export type DocxErrorCode = "tooLarge" | "readerFailed" | "unreadable" | "empty";

export class DocxExtractError extends Error {
  constructor(
    message: string,
    public readonly code: DocxErrorCode,
    public readonly sizeMb?: string,
  ) {
    super(message);
    this.name = "DocxExtractError";
  }
}

export async function extractDocxText(file: File): Promise<DocxExtractResult> {
  if (file.size > MAX_DOCX_BYTES) {
    throw new DocxExtractError(
      "file too large",
      "tooLarge",
      (file.size / 1024 / 1024).toFixed(1),
    );
  }

  let mammoth: typeof import("mammoth");
  try {
    mammoth = await import("mammoth");
  } catch (error) {
    throw new DocxExtractError(`mammoth failed to load: ${String(error)}`, "readerFailed");
  }

  const arrayBuffer = await file.arrayBuffer();

  let result: { value: string; messages: { type: string }[] };
  try {
    result = await mammoth.extractRawText({ arrayBuffer });
  } catch (error) {
    throw new DocxExtractError(`extractRawText failed: ${String(error)}`, "unreadable");
  }

  const text = normalise(result.value);
  if (text.length < 40) {
    throw new DocxExtractError("document had no readable text", "empty");
  }

  return {
    text,
    hadWarnings: result.messages.some((m) => m.type === "warning" || m.type === "error"),
  };
}

function normalise(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** A readable note title from the filename. */
export function titleFromDocxFilename(filename: string): string {
  return (
    filename
      .replace(/\.docx$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 140) || "Imported document"
  );
}
