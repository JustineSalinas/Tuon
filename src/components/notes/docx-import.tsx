"use client";

import { useCallback, useRef, useState } from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import {
  DocxExtractError,
  extractDocxText,
  titleFromDocxFilename,
  type DocxExtractResult,
} from "@/lib/docx/extract";

export interface ImportedDocx {
  title: string;
  text: string;
  result: DocxExtractResult;
  /** True when the extracted text was clipped to fit the plan's note limit. */
  clipped: boolean;
}

/** Shaped like `usePdfImport` so the editor's import menu can treat both the
    same way — see that module for why the file never leaves the device. */
export function useDocxImport(
  onImported: (imported: ImportedDocx) => void,
  maxNoteChars: number,
) {
  const { t } = useI18n();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!/\.docx$/i.test(file.name)) {
        setError(t.docx.notADocx);
        return;
      }

      setError(null);
      setImporting(true);

      try {
        const result = await extractDocxText(file);
        const clipped = result.text.length > maxNoteChars;
        onImported({
          title: titleFromDocxFilename(file.name),
          text: clipped ? result.text.slice(0, maxNoteChars) : result.text,
          result,
          clipped,
        });
      } catch (err) {
        if (err instanceof DocxExtractError) {
          setError(
            err.code === "tooLarge" ? t.docx.tooLarge(err.sizeMb ?? "?") : t.docx[err.code],
          );
        } else {
          console.error("[docx-import]", err);
          setError(t.docx.unknown);
        }
      } finally {
        setImporting(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onImported, maxNoteChars, t],
  );

  return {
    importing,
    error,
    clearError: () => setError(null),
    openPicker: () => inputRef.current?.click(),
    inputElement: (
      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    ),
  };
}
