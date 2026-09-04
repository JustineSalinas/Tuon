"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ArrowLeft, Check, FileUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useNotes, useStudySets } from "@/lib/hooks/use-firestore";
import { useLinkAutocomplete } from "@/components/notes/link-autocomplete";
import { NoteLinksPanel } from "@/components/notes/note-links-panel";
import { GenerateStudySetButton } from "@/components/notes/generate-button";
import {
  PdfImportOverlay,
  usePdfImport,
  type ImportedPdf,
} from "@/components/notes/pdf-import";
import { isSeniorHigh } from "@/lib/curriculum";
import { normaliseTitle, parseWikiLinks } from "@/lib/notes/links";
import { MIN_NOTE_CHARS, maxNoteCharsFor } from "@/lib/ai/config";
import type { Messages } from "@/lib/i18n/en";
import type { Note } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const AUTOSAVE_DELAY_MS = 1200;
const NO_TAG = "__none__";

type SaveState = "idle" | "saving" | "saved" | "error";

export function NoteEditor({ note }: { note?: Note }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { t } = useI18n();

  const searchParams = useSearchParams();
  const { data: allNotes } = useNotes(user?.uid);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [noteId, setNoteId] = useState<string | null>(note?.id ?? null);
  // A [[link]] to a note that does not exist yet lands here with ?title=
  const [title, setTitle] = useState(
    note?.title ?? searchParams.get("title") ?? "",
  );
  const [content, setContent] = useState(note?.content ?? "");
  const [courseTag, setCourseTag] = useState<string>(note?.courseTag ?? "");
  // The set this note already produced, if any. Drives "update" versus
  // "generate" on the button below.
  const { data: allSets } = useStudySets(user?.uid);
  const existingSetId =
    noteId ? (allSets.find((set) => set.noteId === noteId)?.id ?? null) : null;

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [deleting, setDeleting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  // Avoids a second create if autosave fires while the first is in flight.
  const creatingRef = useRef(false);

  // The server enforces this too; showing it here just avoids surprises.
  const maxNoteChars = maxNoteCharsFor(profile?.plan ?? "free");
  const seniorHigh = isSeniorHigh(profile?.educationLevel ?? null);
  const subjectOptions = profile?.courses ?? [];

  const trimmedContent = content.trim();
  const canGenerate = Boolean(noteId) && trimmedContent.length >= MIN_NOTE_CHARS;

  const persist = useCallback(async () => {
    if (!user) return;
    if (!title.trim() && !content.trim()) return;

    setSaveState("saving");
    const payload = {
      title: title.trim() || t.notes.untitled,
      content,
      courseTag: courseTag.trim() || null,
      // Persisted so backlinks are an array-contains query rather than a
      // re-parse of every note's full text on every lookup. Capped to match
      // the rules; a note with 200 distinct links is already pathological.
      linkedTitles: parseWikiLinks(content).map(normaliseTitle).slice(0, 200),
      updatedAt: serverTimestamp(),
    };

    try {
      if (noteId) {
        await updateDoc(doc(db, "users", user.uid, "notes", noteId), payload);
      } else {
        if (creatingRef.current) return;
        creatingRef.current = true;
        const created = await addDoc(collection(db, "users", user.uid, "notes"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setNoteId(created.id);
        // Swap the URL to the real note without pushing a history entry, so
        // Back still returns to wherever the student came from.
        window.history.replaceState(null, "", `/app/notes/${created.id}`);
        creatingRef.current = false;
      }
      dirtyRef.current = false;
      setSaveState("saved");
    } catch {
      creatingRef.current = false;
      setSaveState("error");
    }
  }, [user, noteId, title, content, courseTag, t]);

  const handlePdfImported = useCallback(
    ({ title: pdfTitle, text, result, clipped }: ImportedPdf) => {
      // Never silently discard what the student already typed: append instead
      // of replacing, and only borrow the PDF title if the note has none.
      setContent((prev) => {
        const next = prev.trim() ? `${prev.trim()}

${text}` : text;
        return next.slice(0, maxNoteChars);
      });
      setTitle((prev) => prev.trim() || pdfTitle);
      dirtyRef.current = true;
      setSaveState("idle");

      const parts = [t.pdf.imported(result.pagesRead)];
      if (result.truncated) parts.push(t.pdf.onlyFirst(result.pagesRead, result.pageCount));
      if (clipped) parts.push(t.pdf.clipped);
      toast.success(parts.join(" — "));
    },
    [maxNoteChars, t],
  );

  const pdf = usePdfImport(handlePdfImported, maxNoteChars);

  const linkAutocomplete = useLinkAutocomplete({
    setContent: (next) => {
      setContent(next);
      markDirty();
    },
    textareaRef,
    notes: allNotes,
    currentNoteId: noteId,
  });

  // Debounced autosave.
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void persist(), AUTOSAVE_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [title, content, courseTag, persist]);

  // Warn before losing unsaved edits on a hard navigation.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (dirtyRef.current) event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  function markDirty() {
    dirtyRef.current = true;
    setSaveState("idle");
  }

  async function handleDelete() {
    if (!user || !noteId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid, "notes", noteId));
      toast.success(t.notes.deleted);
      router.replace("/app/notes");
    } catch {
      toast.error(t.notes.deleteFailed);
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/app/notes" />}>
            <ArrowLeft />
            {t.nav.notes}
          </Button>

        <SaveIndicator state={saveState} t={t} className="ml-auto" />

        {noteId ? (
          <Dialog>
            <DialogTrigger render={<Button variant="ghost" size="icon" aria-label={t.notes.deleteNote} />}>
                <Trash2 className="text-muted-foreground size-4" />
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.notes.deleteTitle}</DialogTitle>
                <DialogDescription>
                  {t.notes.deleteBody}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  {t.notes.deleteNote}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="mt-4 space-y-5">
        <div>
          <Label htmlFor="title" className="sr-only">
            {t.notes.titlePlaceholder}
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            placeholder={t.notes.titlePlaceholder}
            maxLength={140}
            autoFocus={!note}
            className="font-display h-auto border-0 bg-transparent px-0 py-1 text-3xl font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-4xl"
          />
        </div>

        <div className="max-w-sm space-y-2">
          <Label htmlFor="courseTag" className="text-muted-foreground text-xs">
            {seniorHigh ? t.notes.subject : t.notes.subjectOptional}
          </Label>

          {seniorHigh && subjectOptions.length > 0 ? (
            <Select
              value={courseTag || NO_TAG}
              onValueChange={(value) => {
                // Base UI's Select can emit null when the selection is cleared.
                const next = typeof value === "string" ? value : NO_TAG;
                setCourseTag(next === NO_TAG ? "" : next);
                markDirty();
              }}
            >
              <SelectTrigger id="courseTag" className="w-full">
                {/* Base UI renders the raw VALUE unless given a formatter —
                    unlike Radix, which rendered the item's children. Without
                    this the trigger literally read "__none__". */}
                <SelectValue placeholder={t.notes.noSubject}>
                  {(value: string | null) =>
                    !value || value === NO_TAG ? t.notes.noSubject : value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TAG}>{t.notes.noSubject}</SelectItem>
                {subjectOptions.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              {/* College subjects vary too much by program and year to
                  pre-populate, so this is free text. */}
              <Input
                id="courseTag"
                value={courseTag}
                onChange={(e) => {
                  setCourseTag(e.target.value);
                  markDirty();
                }}
                placeholder={t.notes.subjectExample}
                maxLength={80}
                list="tuon-course-suggestions"
              />
              <datalist id="tuon-course-suggestions">
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject} />
                ))}
              </datalist>
            </>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="content" className="sr-only">
              {t.notes.contentLabel}
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={pdf.openPicker}
              disabled={pdf.importing}
            >
              {pdf.importing ? <Loader2 className="animate-spin" /> : <FileUp />}
              {t.pdf.importPdf}
            </Button>
            <span className="text-muted-foreground text-xs">
              {t.pdf.orDrop}
            </span>
          </div>

          <div className="relative" {...pdf.dragHandlers}>
            <Textarea
              ref={textareaRef}
              id="content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value.slice(0, maxNoteChars));
                markDirty();
                linkAutocomplete.syncFromCaret();
              }}
              onKeyDown={(e) => {
                linkAutocomplete.handleKeyDown(e);
              }}
              onKeyUp={linkAutocomplete.syncFromCaret}
              onClick={linkAutocomplete.syncFromCaret}
              placeholder={t.notes.contentPlaceholder}
              className="min-h-[45vh] resize-y text-base leading-relaxed"
            />
            {linkAutocomplete.popover}
            <PdfImportOverlay
              isDragging={pdf.isDragging}
              importing={pdf.importing}
              progress={pdf.progress}
            />
          </div>

          {pdf.inputElement}

          {pdf.error ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center gap-x-2">
                <span>{pdf.error}</span>
                <button
                  type="button"
                  onClick={pdf.clearError}
                  className="font-medium underline underline-offset-4"
                >
                  {t.notes.dismiss}
                </button>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span className="tabular-nums">
              {trimmedContent.length.toLocaleString()}
              {trimmedContent.length > maxNoteChars * 0.7
                ? ` / ${maxNoteChars.toLocaleString()}`
                : ""}{" "}
              {t.notes.charactersUnit}
            </span>
            {trimmedContent.length > 0 && trimmedContent.length < MIN_NOTE_CHARS ? (
              <span>
                {t.notes.moreNeeded(MIN_NOTE_CHARS - trimmedContent.length)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <NoteLinksPanel note={note ?? null} content={content} allNotes={allNotes} />

      <div className="bg-background/85 sticky bottom-0 -mx-4 mt-6 border-t px-4 py-4 backdrop-blur-md md:-mx-8 md:px-8">
        <GenerateStudySetButton
          noteId={noteId}
          existingSetId={existingSetId}
          disabled={!canGenerate}
          onBeforeGenerate={async () => {
            if (dirtyRef.current) await persist();
          }}
          hint={
            !noteId
              ? t.notes.startTyping
              : trimmedContent.length < MIN_NOTE_CHARS
                ? t.notes.addMoreToGenerate(MIN_NOTE_CHARS - trimmedContent.length)
                : null
          }
        />
      </div>
    </main>
  );
}

function SaveIndicator({
  state,
  t,
  className,
}: {
  state: SaveState;
  t: Messages;
  className?: string;
}) {
  if (state === "idle") return <span className={className} />;

  return (
    <span
      className={cn(
        "text-muted-foreground flex items-center gap-1.5 text-xs",
        state === "error" && "text-destructive",
        className,
      )}
    >
      {state === "saving" ? (
        <>
          <Loader2 className="size-3 animate-spin" />
          {t.notes.saving}
        </>
      ) : state === "saved" ? (
        <>
          <Check className="size-3" />
          {t.notes.saved}
        </>
      ) : (
        t.notes.saveFailed
      )}
    </span>
  );
}
