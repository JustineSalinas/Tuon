"use client";

/**
 * Removing a subject, safely.
 *
 * Subject editing was half-built: you could add one, and you could untick one,
 * and unticking silently orphaned every note, study set, deadline and logged
 * hour tagged with it. Nothing was deleted, but nothing could be found either
 * — the tag stopped matching anything on the profile, so a term's work
 * vanished from every per-subject total while still sitting in the database.
 * That is worse than deletion: it looks like a bug, and the student cannot
 * undo it.
 *
 * So this screen is built around one promise, stated on it in those words:
 * nothing is deleted. Removing a subject moves its material somewhere else or
 * leaves it untagged, and the student picks which before agreeing.
 */

import { useMemo, useState } from "react";
import { doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { AlertTriangle, Loader2, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useNotes,
  usePlanItems,
  useStudySessions,
  useStudySets,
} from "@/lib/hooks/use-firestore";
import {
  chunk,
  describeContents,
  planRetag,
  summariseSubject,
  type SubjectContents,
} from "@/lib/organiser/subject-cleanup";
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
import { Skeleton } from "@/components/ui/skeleton";

export function ManageSubjects({ courses }: { courses: string[] }) {
  const { user } = useAuth();
  const { data: notes, loading: notesLoading } = useNotes(user?.uid);
  const { data: sets, loading: setsLoading } = useStudySets(user?.uid);
  const { items: planItems, loading: planLoading } = usePlanItems(user?.uid);
  const { sessions, loading: sessionsLoading } = useStudySessions(user?.uid);

  const loading = notesLoading || setsLoading || planLoading || sessionsLoading;

  const contents: SubjectContents = useMemo(
    () => ({ notes, sets, planItems, sessions }),
    [notes, sets, planItems, sessions],
  );

  /**
   * Tags on real material that are not on the profile any more.
   *
   * These are the orphans the old untick-to-remove path created, plus the ones
   * a college student makes by switching programmes. Listing them is the only
   * way a student can ever get that material back under a subject — otherwise
   * it is invisible everywhere except the note itself.
   */
  const orphans = useMemo(() => {
    const known = new Set(courses.map((c) => c.trim().toLowerCase()));
    const found = new Map<string, string>();
    for (const doc of [...notes, ...sets, ...planItems, ...sessions]) {
      const tag = doc.courseTag?.trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (known.has(key) || found.has(key)) continue;
      found.set(key, tag);
    }
    return [...found.values()].sort();
  }, [courses, notes, sets, planItems, sessions]);

  const [removing, setRemoving] = useState<string | null>(null);

  if (courses.length === 0 && orphans.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <Tags className="text-muted-foreground size-4" />
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {courses.length === 1 ? "Your subject" : "Your subjects"}
        </h2>
      </div>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        What each one holds, and how to remove one without losing it. Removing a
        subject never deletes a note, a card, or an hour you logged.
      </p>

      {loading ? (
        <Skeleton className="mt-4 h-32 w-full rounded-xl" />
      ) : (
        <ul className="mt-4 divide-y rounded-xl border">
          {courses.map((subject) => {
            const summary = summariseSubject(contents, subject);
            return (
              <li key={subject} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{subject}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {describeContents(summary)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemoving(subject)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 />
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && orphans.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-medium">Not on your profile any more</h3>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Work tagged with a subject you no longer have. It is all still in
            your library and still comes up for review — it just is not counted
            under any subject. Move it somewhere, or clear the label.
          </p>
          <ul className="mt-3 divide-y rounded-xl border border-dashed">
            {orphans.map((subject) => (
              <li key={subject} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{subject}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {describeContents(summariseSubject(contents, subject))}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setRemoving(subject)}>
                  Sort out
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {removing ? (
        <RemoveDialog
          subject={removing}
          courses={courses}
          contents={contents}
          onClose={() => setRemoving(null)}
        />
      ) : null}
    </section>
  );
}

function RemoveDialog({
  subject,
  courses,
  contents,
  onClose,
}: {
  subject: string;
  courses: string[];
  contents: SubjectContents;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const summary = useMemo(() => summariseSubject(contents, subject), [contents, subject]);
  const others = courses.filter((c) => c !== subject);

  /** "" means leave it untagged, which is a real choice rather than a default. */
  const [moveTo, setMoveTo] = useState("");
  const [working, setWorking] = useState(false);

  async function confirm() {
    if (!user || working) return;
    setWorking(true);

    const plan = planRetag(contents, subject);
    const target = moveTo || null;

    try {
      // Retag the material FIRST, and only drop the subject from the profile
      // once every document is rewritten. The other order would leave a
      // student whose connection dropped mid-way with orphaned material and
      // no subject to find it under — exactly the state this replaces.
      const writes: { path: string[]; id: string }[] = [
        ...plan.notes.map((id) => ({ path: ["notes"], id })),
        ...plan.sets.map((id) => ({ path: ["studySets"], id })),
        ...plan.planItems.map((id) => ({ path: ["planItems"], id })),
        ...plan.sessions.map((id) => ({ path: ["studySessions"], id })),
      ];

      for (const group of chunk(writes)) {
        const batch = writeBatch(db);
        for (const write of group) {
          batch.update(doc(db, "users", user.uid, ...write.path, write.id), {
            courseTag: target,
          });
        }
        await batch.commit();
      }

      await updateDoc(doc(db, "users", user.uid), {
        courses: courses.filter((c) => c !== subject),
        updatedAt: serverTimestamp(),
      });

      toast.success(
        plan.total === 0
          ? `${subject} removed.`
          : target
            ? `${subject} removed. Everything moved to ${target}.`
            : `${subject} removed. Its ${plan.total === 1 ? "item is" : "items are"} now untagged.`,
      );
      onClose();
    } catch {
      toast.error("Could not remove that subject. Nothing was changed.");
      setWorking(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {subject}?</DialogTitle>
          <DialogDescription>
            {summary.isEmpty
              ? "Nothing is tagged with this subject, so there is nothing to move."
              : `This subject has ${describeContents(summary)}.`}
          </DialogDescription>
        </DialogHeader>

        {summary.isEmpty ? null : (
          <div className="space-y-3">
            <div className="border-primary/30 bg-accent/40 rounded-xl border p-3">
              <p className="text-sm leading-relaxed">
                <strong>None of it is deleted.</strong> Your notes, cards,
                review history and logged hours all stay exactly as they are —
                only the label on them changes.
              </p>
            </div>

            <div>
              <label htmlFor="move-to" className="text-sm font-medium">
                Where should it go?
              </label>
              <select
                id="move-to"
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
                className="border-input bg-background focus-visible:ring-ring mt-2 h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
              >
                <option value="">Leave it untagged</option>
                {others.map((other) => (
                  <option key={other} value={other}>
                    Move to {other}
                  </option>
                ))}
              </select>
              {moveTo === "" ? (
                <p className="text-muted-foreground mt-2 flex items-start gap-1.5 text-xs leading-relaxed">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  Untagged material still appears in your library and still
                  comes up for review. It just will not be counted under any
                  subject on the dashboard.
                </p>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost" disabled={working}>
                Cancel
              </Button>
            }
          />
          <Button onClick={confirm} disabled={working}>
            {working ? <Loader2 className="animate-spin" /> : null}
            Remove {subject}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
