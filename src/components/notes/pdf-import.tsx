"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileUp, Loader2 } from "lucide-react";

import {
  MAX_PDF_PAGES,
  PdfExtractError,
  extractPdfText,
  titleFromFilename,
  type PdfExtractResult,
} from "@/lib/pdf/extract";
import { MAX_NOTE_CHARS } from "@/lib/ai/config";
import { cn } from "@/lib/utils";

export interface ImportedPdf {
  title: string;
  text: string;
  result: PdfExtractResult;
  /** True when the extracted text was clipped to fit MAX_NOTE_CHARS. */
  clipped: boolean;
}

export function usePdfImport(onImported: (imported: ImportedPdf) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave fire for every child element; count depth instead of
  // toggling a boolean, or the overlay flickers as the cursor crosses nodes.
  const dragDepth = useRef(0);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
        setError("That is not a PDF. Only PDF files can be imported right now.");
        return;
      }

      setError(null);
      setImporting(true);
      setProgress(0);

      try {
        const result = await extractPdfText(file, setProgress);
        const clipped = result.text.length > MAX_NOTE_CHARS;
        onImported({
          title: result.title ?? titleFromFilename(file.name),
          text: clipped ? result.text.slice(0, MAX_NOTE_CHARS) : result.text,
          result,
          clipped,
        });
      } catch (err) {
        if (err instanceof PdfExtractError) {
          setError(err.userMessage);
        } else {
          console.error("[pdf-import]", err);
          setError("Something went wrong reading that PDF. Please try another file.");
        }
      } finally {
        setImporting(false);
        setProgress(0);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onImported],
  );

  const dragHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      dragDepth.current += 1;
      setIsDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setIsDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      void handleFile(e.dataTransfer.files?.[0]);
    },
  };

  return {
    isDragging,
    importing,
    progress,
    error,
    clearError: () => setError(null),
    dragHandlers,
    openPicker: () => inputRef.current?.click(),
    inputElement: (
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    ),
  };
}

/** Overlay shown while a file is hovering the editor, and during extraction. */
export function PdfImportOverlay({
  isDragging,
  importing,
  progress,
}: {
  isDragging: boolean;
  importing: boolean;
  progress: number;
}) {
  const visible = isDragging || importing;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "bg-background/85 pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-xl backdrop-blur-sm",
            "border-primary border-2 border-dashed",
          )}
        >
          <div className="text-center">
            {importing ? (
              <>
                <Loader2 className="text-primary mx-auto size-7 animate-spin" />
                <p className="mt-3 font-medium">Reading your PDF…</p>
                <div className="bg-secondary mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full">
                  <motion.div
                    className="bg-primary h-full"
                    animate={{ width: `${Math.round(progress * 100)}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <p className="text-muted-foreground mt-2 text-xs tabular-nums">
                  {Math.round(progress * 100)}%
                </p>
              </>
            ) : (
              <>
                <FileUp className="text-primary mx-auto size-7" />
                <p className="mt-3 font-medium">Drop your PDF here</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Up to {MAX_PDF_PAGES} pages · stays on your device
                </p>
              </>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
