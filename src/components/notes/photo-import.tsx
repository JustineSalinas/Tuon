"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Loader2 } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { PhotoPrepareError, preparePhoto } from "@/lib/photo/prepare";
import { cn } from "@/lib/utils";

export interface ImportedPhoto {
  text: string;
}

/**
 * The one importer here that is not purely client-side: reading handwriting
 * needs the model's vision, so the (downscaled, see lib/photo/prepare.ts)
 * image genuinely has to reach the server. Shaped like `usePdfImport` and
 * `useDocxImport` regardless — same `openPicker`/`importing`/`error`
 * contract — so the editor's import menu can treat all three the same way.
 */
export function usePhotoImport(
  onImported: (imported: ImportedPhoto) => void,
  maxNoteChars: number,
) {
  const { t } = useI18n();
  const { authedFetch } = useAuth();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;

      setError(null);
      setImporting(true);

      try {
        const prepared = await preparePhoto(file);

        const response = await authedFetch("/api/notes/transcribe-photo", {
          method: "POST",
          body: JSON.stringify({
            base64: prepared.base64,
            mediaType: prepared.mediaType,
          }),
        });
        const body = (await response.json().catch(() => null)) as
          | { text?: string; error?: string; code?: string }
          | null;

        if (!response.ok || !body?.text) {
          throw new Error(
            body?.code === "EMAIL_NOT_VERIFIED"
              ? t.photo.verifyEmail
              : (body?.error ?? t.photo.unknown),
          );
        }

        onImported({ text: body.text.slice(0, maxNoteChars) });
      } catch (err) {
        if (err instanceof PhotoPrepareError) {
          setError(
            err.code === "tooLarge"
              ? t.photo.tooLarge(err.sizeMb ?? "?")
              : t.photo[err.code],
          );
        } else {
          console.error("[photo-import]", err);
          setError(err instanceof Error ? err.message : t.photo.unknown);
        }
      } finally {
        setImporting(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onImported, maxNoteChars, authedFetch, t],
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
        accept="image/*"
        // Offers the camera directly on a phone, without blocking a desktop
        // file picker — the attribute is simply ignored where there is no
        // camera to open.
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    ),
  };
}

/** Shown over the editor while a photo is being read. */
export function PhotoImportOverlay({ importing }: { importing: boolean }) {
  const { t } = useI18n();

  return (
    <AnimatePresence>
      {importing ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "bg-background/85 pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-xl backdrop-blur-sm",
          )}
        >
          <div className="text-center">
            <Loader2 className="text-primary mx-auto size-7 animate-spin" />
            <p className="mt-3 font-medium">{t.photo.reading}</p>
            <p className="text-muted-foreground mt-1 text-sm">{t.photo.canTakeAMoment}</p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export { Camera as PhotoImportIcon };
