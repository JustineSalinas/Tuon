"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { Layers, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { AnkiImportError, parseApkg, type AnkiParseResult } from "@/lib/anki/import";
import { chunk } from "@/lib/organiser/subject-cleanup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Brings an existing Anki deck in as a Tuón study set.
 *
 * Writes `source: "manual"` and never touches the AI quota — nothing was
 * generated, the cards already existed. See `lib/anki/import.ts` for what
 * is and is not reconstructed from the `.apkg`.
 */
export function AnkiImport() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<AnkiParseResult | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setParsing(true);
    try {
      const parsed = await parseApkg(file);
      setResult(parsed);
      setTitle(parsed.title);
    } catch (error) {
      if (error instanceof AnkiImportError) {
        toast.error(
          error.code === "tooLarge"
            ? t.anki.tooLarge(error.sizeMb ?? "?")
            : t.anki[error.code],
        );
      } else {
        console.error("[anki-import]", error);
        toast.error(t.anki.unknown);
      }
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function confirmImport() {
    if (!user || !result || result.cards.length === 0) return;
    setSaving(true);

    try {
      const setRef = doc(collection(db, "users", user.uid, "studySets"));
      const setupBatch = writeBatch(db);
      setupBatch.set(setRef, {
        noteId: null,
        title: title.trim().slice(0, 140) || t.anki.untitledDeck,
        courseTag: null,
        flashcardCount: result.cards.length,
        quizQuestionCount: 0,
        source: "manual",
        isShared: false,
        createdAt: serverTimestamp(),
      });
      await setupBatch.commit();

      // Chunked for the same reason the Markdown importer is: Firestore
      // refuses a batch over 500 writes, and a refused batch would leave the
      // set half-stocked with no way to tell which half.
      for (const group of chunk(result.cards.map((card, i) => ({ card, i })), 450)) {
        const batch = writeBatch(db);
        for (const { card, i } of group) {
          batch.set(doc(collection(db, "users", user.uid, "studySets", setRef.id, "flashcards")), {
            front: card.front,
            back: card.back,
            order: i,
            ownerId: user.uid,
          });
        }
        await batch.commit();
      }

      toast.success(t.anki.imported(result.cards.length));
      setResult(null);
      router.push(`/app/sets/${setRef.id}`);
    } catch (error) {
      console.error("[anki-import] write failed", error);
      toast.error(t.anki.importFailed);
    }
    setSaving(false);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".apkg"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={parsing}
      >
        {parsing ? <Loader2 className="animate-spin" /> : <Upload />}
        {t.anki.importAction}
      </Button>

      <Dialog
        open={result !== null}
        onOpenChange={(next) => (next ? null : setResult(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Layers className="text-primary mr-1.5 inline size-4" />
              {t.anki.cardsFound(result?.cards.length ?? 0)}
            </DialogTitle>
            <DialogDescription>
              {result?.skipped
                ? t.anki.someSkipped(result.skipped)
                : t.anki.readyToImport}
              {result?.truncated ? ` ${t.anki.truncated(result.totalFound)}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="anki-deck-title">{t.anki.deckTitle}</Label>
            <Input
              id="anki-deck-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {t.common.cancel}
            </DialogClose>
            <Button
              onClick={confirmImport}
              disabled={saving || !result || result.cards.length === 0}
            >
              {saving ? <Loader2 className="animate-spin" /> : <Upload />}
              {t.anki.importAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
