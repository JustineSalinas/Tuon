"use client";

/**
 * Managing semesters and the subjects in each.
 *
 * Switching the active term rewrites `courses` from that term's subject list,
 * which is what makes every other screen follow along without knowing
 * semesters exist. See lib/profile/semesters for why it is layered that way.
 *
 * Nothing here ever deletes a note, a study set or a card. Removing a subject
 * from a term removes the tag from a picker, not the material behind it —
 * "Manage subjects" further down the settings page is the surface that
 * actually reassigns content, and it stays the only one.
 */

import { useMemo, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Check, GraduationCap, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import {
  MAX_SEMESTERS,
  MAX_SEMESTER_NAME,
  MAX_SUBJECTS_PER_SEMESTER,
  activeSemester,
  dedupeSubjects,
  defaultSemesterName,
  isUsableSemesterName,
  newSemesterId,
  readSemesters,
  seedFromCourses,
  type Semester,
} from "@/lib/profile/semesters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Semesters() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const semesters = useMemo(
    () => readSemesters(profile?.semesters),
    [profile?.semesters],
  );
  const active = activeSemester(semesters, profile?.activeSemesterId);

  /**
   * Every write goes through here so `courses` and the active term can never
   * disagree — the moment they do, the subject pickers across the app show a
   * different list from the one settings claims is current.
   */
  async function save(next: Semester[], activeId: string | null) {
    if (!user) return;
    setBusy(true);
    try {
      const current = activeSemester(next, activeId);
      await updateDoc(doc(db, "users", user.uid), {
        semesters: next,
        activeSemesterId: current?.id ?? null,
        courses: current?.subjects ?? [],
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error(t.settingsPage.changeFailed);
    }
    setBusy(false);
  }

  /** First use: fold whatever subjects the account already has into term one. */
  async function begin() {
    await save(
      [seedFromCourses(profile?.courses ?? [], t.semesters.ordinal)],
      null,
    );
  }

  async function addSemester() {
    if (semesters.length >= MAX_SEMESTERS) {
      toast.info(t.semesters.atMost(MAX_SEMESTERS));
      return;
    }
    const created: Semester = {
      id: newSemesterId(),
      name: defaultSemesterName(semesters.length, t.semesters.ordinal),
      subjects: [],
    };
    await save([...semesters, created], created.id);
  }

  if (semesters.length === 0) {
    return (
      <div id="semesters" className="scroll-mt-20">
        <Heading t={t} />
        <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
          {t.semesters.firstRun}
        </p>
        <Button className="mt-3" variant="outline" size="sm" onClick={begin} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <GraduationCap />}
          {t.semesters.setUp}
        </Button>
      </div>
    );
  }

  return (
    <div id="semesters" className="scroll-mt-20">
      <Heading t={t} />
      <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
        {t.semesters.hint}
      </p>

      <div className="mt-3 space-y-3">
        {semesters.map((semester) => (
          <SemesterCard
            key={semester.id}
            semester={semester}
            isActive={semester.id === active?.id}
            busy={busy}
            t={t}
            onMakeActive={() => save(semesters, semester.id)}
            onRename={(name) =>
              save(
                semesters.map((s) => (s.id === semester.id ? { ...s, name } : s)),
                active?.id ?? null,
              )
            }
            onSubjects={(subjects) =>
              save(
                semesters.map((s) => (s.id === semester.id ? { ...s, subjects } : s)),
                active?.id ?? null,
              )
            }
            onDelete={() => {
              const next = semesters.filter((s) => s.id !== semester.id);
              save(next, active?.id === semester.id ? null : (active?.id ?? null));
            }}
          />
        ))}
      </div>

      <Button
        className="mt-3"
        variant="outline"
        size="sm"
        onClick={addSemester}
        disabled={busy || semesters.length >= MAX_SEMESTERS}
      >
        <Plus />
        {t.semesters.addSemester}
      </Button>
    </div>
  );
}

function Heading({ t }: { t: Messages }) {
  return (
    <p className="flex items-center gap-2 text-sm font-medium">
      <GraduationCap className="text-muted-foreground size-4" />
      {t.semesters.title}
    </p>
  );
}

function SemesterCard({
  semester,
  isActive,
  busy,
  onMakeActive,
  onRename,
  onSubjects,
  onDelete,
  t,
}: {
  semester: Semester;
  isActive: boolean;
  busy: boolean;
  t: Messages;
  onMakeActive: () => void;
  onRename: (name: string) => void;
  onSubjects: (subjects: string[]) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(semester.name);
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);

  function addSubject() {
    const next = dedupeSubjects([...semester.subjects, draft]);
    if (next.length === semester.subjects.length) {
      // Either blank, a duplicate, or the term is full — all three are better
      // said than silently ignored.
      if (semester.subjects.length >= MAX_SUBJECTS_PER_SEMESTER) {
        toast.info(t.semesters.termFull(MAX_SUBJECTS_PER_SEMESTER));
      }
      setDraft("");
      return;
    }
    onSubjects(next);
    setDraft("");
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isActive ? "border-primary/50 bg-accent/30" : "bg-card",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {renaming ? (
          <>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_SEMESTER_NAME}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && isUsableSemesterName(name)) {
                  onRename(name.trim());
                  setRenaming(false);
                }
                if (e.key === "Escape") {
                  setName(semester.name);
                  setRenaming(false);
                }
              }}
              className="h-8 max-w-56"
            />
            <Button
              size="sm"
              disabled={!isUsableSemesterName(name) || busy}
              onClick={() => {
                onRename(name.trim());
                setRenaming(false);
              }}
            >
              <Check />
            </Button>
            <button
              type="button"
              aria-label={t.common.cancel}
              onClick={() => {
                setName(semester.name);
                setRenaming(false);
              }}
              className="text-muted-foreground hover:text-foreground grid size-8 place-items-center rounded-md"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setRenaming(true)}
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              {semester.name}
            </button>
            {isActive ? (
              <Badge variant="secondary" className="text-primary">
                {t.semesters.current}
              </Badge>
            ) : (
              <Button variant="ghost" size="sm" onClick={onMakeActive} disabled={busy}>
                {t.semesters.makeCurrent}
              </Button>
            )}
            <button
              type="button"
              aria-label={t.semesters.deleteTerm(semester.name)}
              onClick={onDelete}
              disabled={busy}
              className="text-muted-foreground hover:text-destructive ml-auto grid size-7 place-items-center rounded-md transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {semester.subjects.map((subject) => (
          <span
            key={subject}
            className="border-border flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-3 text-[13px]"
          >
            {subject}
            <button
              type="button"
              aria-label={t.semesters.removeSubject(subject)}
              onClick={() =>
                onSubjects(semester.subjects.filter((s) => s !== subject))
              }
              disabled={busy}
              className="text-muted-foreground hover:text-destructive grid size-5 place-items-center rounded-full"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {semester.subjects.length === 0 ? (
          <span className="text-muted-foreground text-xs">
            {t.semesters.noSubjectsYet}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSubject();
            }
          }}
          placeholder={t.semesters.addASubject}
          aria-label={t.semesters.addSubjectTo(semester.name)}
          maxLength={80}
          className="h-8 max-w-56"
        />
        <Button size="sm" variant="outline" onClick={addSubject} disabled={!draft.trim() || busy}>
          <Plus />
          {t.common.add}
        </Button>
      </div>

      {/* Said once per card, because removing a subject looks destructive and
          is not. */}
      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
        {t.semesters.removalNote}
      </p>
    </div>
  );
}
