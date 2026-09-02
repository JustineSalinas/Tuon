"use client";

/**
 * A door in and a door out.
 *
 * The ask was "local files, like Obsidian". A web page cannot watch a folder —
 * the File System Access API is Chrome-only, needs permission re-granted every
 * session, and does not exist on iOS Safari, which is a large share of the
 * audience. So this is the achievable half, and the half that matters: drop a
 * folder of Markdown in, take the whole library back out.
 *
 * `[[wiki links]]` need no translation in either direction — Tuón resolves
 * them by title exactly as Obsidian does, so a note makes the round trip with
 * its graph intact.
 */

import { useRef, useState } from "react";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { Check, Download, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useNotes } from "@/lib/hooks/use-firestore";
import {
  MAX_CONTENT_CHARS,
  noteFilename,
  parseMarkdown,
  toMarkdown,
  type ParseProblem,
  type ParsedNote,
} from "@/lib/notes/markdown";
import { downloadZip } from "@/lib/notes/zip";
import { chunk } from "@/lib/organiser/subject-cleanup";
import { Button } from "@/components/ui/button";
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
 * A ceiling on one import.
 *
 * Not a technical limit — it is a guard against someone dropping a whole vault
 * of several thousand files and creating a mess they then have to delete one
 * note at a time. The message says the number rather than silently truncating.
 */
const MAX_FILES = 200;

export function MarkdownTransfer() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ImportButton />
      <ExportButton />
    </div>
  );
}

function ImportButton() {
  const { user } = useAuth();
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState<ParsedNote[]>([]);
  const [problems, setProblems] = useState<ParseProblem[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function readFiles(files: FileList) {
    const picked = [...files].slice(0, MAX_FILES);
    if (files.length > MAX_FILES) {
      toast.info(t.markdown.readingFirst(MAX_FILES, files.length));
    }

    const parsed: ParsedNote[] = [];
    const failed: ParseProblem[] = [];

    for (const file of picked) {
      let text: string;
      try {
        text = await file.text();
      } catch {
        failed.push({ filename: file.name, reason: "unreadable" });
        continue;
      }
      const result = parseMarkdown(file.name, text);
      if ("note" in result) parsed.push(result.note);
      else failed.push(result.problem);
    }

    setNotes(parsed);
    setProblems(failed);
    setOpen(true);
  }

  async function confirmImport() {
    if (!user || notes.length === 0) return;
    setSaving(true);

    try {
      // Chunked for the same reason the subject retag is: Firestore refuses a
      // batch over 500, and a refused batch would import half a folder.
      for (const group of chunk(notes, 400)) {
        const batch = writeBatch(db);
        for (const note of group) {
          batch.set(doc(collection(db, "users", user.uid, "notes")), {
            title: note.title,
            content: note.content,
            courseTag: note.courseTag,
            linkedTitles: note.linkedTitles,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }

      toast.success(t.markdown.imported(notes.length));
      setOpen(false);
      setNotes([]);
      setProblems([]);
    } catch {
      toast.error(t.markdown.importFailed);
    }
    setSaving(false);
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void readFiles(e.target.files);
          // Cleared so picking the same folder twice still fires a change.
          e.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => input.current?.click()}>
        <Upload />
        {t.markdown.importAction}
      </Button>

      <Dialog open={open} onOpenChange={(next) => (next ? null : setOpen(false))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {notes.length === 0
                ? t.markdown.nothingToImport
                : t.markdown.importCount(notes.length)}
            </DialogTitle>
            <DialogDescription>
              {notes.length === 0
                ? t.markdown.noneReadable
                : t.markdown.titleRule}
            </DialogDescription>
          </DialogHeader>

          {notes.length > 0 ? (
            <ul className="max-h-48 divide-y overflow-y-auto rounded-xl border text-sm">
              {notes.map((note, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-2">
                  <Check className="text-success size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{note.title}</span>
                  {note.courseTag ? (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {note.courseTag}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {problems.length > 0 ? (
            <div>
              <p className="text-sm font-medium">
                {t.markdown.skipped(problems.length)}
              </p>
              <ul className="text-muted-foreground mt-1.5 max-h-32 space-y-1 overflow-y-auto text-xs">
                {problems.map((problem, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <X className="mt-0.5 size-3 shrink-0" />
                    <span className="min-w-0">
                      <span className="font-medium">{problem.filename}</span> —{" "}
                      {problem.reason === "tooLong"
                        ? t.markdown.tooLong(
                            (problem.length ?? 0).toLocaleString(),
                            MAX_CONTENT_CHARS.toLocaleString(),
                          )
                        : t.markdown[problem.reason]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="ghost" disabled={saving} />}>
              {t.common.cancel}
            </DialogClose>
            {notes.length > 0 ? (
              <Button onClick={confirmImport} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Upload />}
                {t.markdown.importShort}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExportButton() {
  const { user } = useAuth();
  const { t } = useI18n();
  // The full library, not the paged view: an export that silently stops at the
  // first page would be the worst possible bug in a feature whose entire
  // promise is that nothing is trapped.
  const { data: notes, loading } = useNotes(user?.uid);
  const [working, setWorking] = useState(false);

  function exportAll() {
    if (notes.length === 0) {
      toast.info(t.markdown.nothingToExport);
      return;
    }
    setWorking(true);
    try {
      const taken = new Set<string>();
      downloadZip(
        `tuon-notes-${new Date().toISOString().slice(0, 10)}.zip`,
        notes.map((note) => ({
          name: noteFilename(note.title, taken),
          text: toMarkdown(note),
        })),
      );
      toast.success(t.markdown.exported(notes.length));
    } catch {
      toast.error(t.markdown.exportFailed);
    }
    setWorking(false);
  }

  return (
    <Button variant="ghost" onClick={exportAll} disabled={loading || working}>
      {working ? <Loader2 className="animate-spin" /> : <Download />}
      {t.markdown.exportAll}
    </Button>
  );
}
