"use client";

/**
 * What the week actually cost.
 *
 * The number here has exactly one job: to be believed. A student who studied
 * two hours offline, or on paper, or in a group, and opens this to a blank
 * week will decide the log is broken — and they will be right. That is why
 * every row is editable and why time can be added by hand, even though a
 * hand-typed hour is worth less as evidence than a timed one. A log people
 * correct is a log people keep; a log that argues with them is deleted.
 *
 * No target here, and no streak in this view. A target invented by an app is a
 * number to feel bad about rather than a plan. The streak lives on the
 * dashboard's heatmap, where it is a record of days that happened rather than
 * a counter this week's total is being measured against - see lib/stats/heatmap
 * for why that distinction is the whole design.
 */

import { useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useStudySessions } from "@/lib/hooks/use-firestore";
import {
  MAX_SESSION_MINUTES,
  clampMinutes,
  formatMinutes,
  minutesByDay,
  minutesBySubject,
  sessionsInWeek,
  totalMinutes,
  weekDayKeys,
} from "@/lib/organiser/sessions";
import { formatDayKey } from "@/lib/organiser/plan-items";
import type { StudySession } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StudyLog({ todayKey, subjects }: { todayKey: string; subjects: string[] }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { sessions, loading } = useStudySessions(user?.uid);

  // Every date on this screen is written in the reader's language.
  const locale = t.common.dateLocale;

  const [weekOffset, setWeekOffset] = useState(0);
  const days = useMemo(() => weekDayKeys(todayKey, weekOffset), [todayKey, weekOffset]);
  const week = useMemo(() => sessionsInWeek(sessions, days), [sessions, days]);

  const byDay = useMemo(() => minutesByDay(week), [week]);
  const bySubject = useMemo(() => minutesBySubject(week), [week]);
  const total = totalMinutes(week);

  // Scales the bars to the busiest day rather than to a fixed ceiling, so a
  // quiet week still reads as a shape instead of seven stubs.
  const peak = Math.max(1, ...days.map((day) => byDay.get(day) ?? 0));

  if (loading) return <Skeleton className="h-56 w-full rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-semibold tabular-nums">
            {formatMinutes(total)}
          </p>
          <p className="text-muted-foreground text-xs">
            {weekOffset === 0
              ? t.studyLog.thisWeek
              : `${formatDayKey(days[0], locale)} – ${formatDayKey(days[6], locale)}`}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.studyLog.previousWeek}
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeft />
          </Button>
          {weekOffset !== 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
              {t.studyLog.thisWeek}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.studyLog.nextWeek}
            disabled={weekOffset >= 0}
            onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {/* The week at a glance. Bars, not a line: seven discrete days are not
          a continuous quantity, and a line implies a trend between them. */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const minutes = byDay.get(day) ?? 0;
          const isToday = day === todayKey;
          return (
            <div key={day} className="flex flex-col items-center gap-1.5">
              <div className="flex h-20 w-full items-end">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all",
                    minutes > 0 ? "bg-primary/70" : "bg-muted",
                    isToday && minutes > 0 && "bg-primary",
                  )}
                  style={{ height: `${Math.max(minutes > 0 ? 6 : 2, (minutes / peak) * 100)}%` }}
                  title={`${formatDayKey(day, locale)} — ${formatMinutes(minutes)}`}
                />
              </div>
              <span
                className={cn(
                  "text-[11px]",
                  isToday ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {t.common.weekdaysShort[index]}
              </span>
            </div>
          );
        })}
      </div>

      {bySubject.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {bySubject.map((row) => (
            <Badge key={row.subject} variant="secondary" className="tabular-nums">
              {row.subject} · {formatMinutes(row.minutes)}
            </Badge>
          ))}
        </div>
      ) : null}

      <AddSession todayKey={todayKey} subjects={subjects} />

      {week.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm leading-relaxed">
          {t.studyLog.nothingLogged}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {week.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: StudySession }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);

  const day = formatDayKey(session.day, t.common.dateLocale);
  const SOURCES = {
    pomodoro: t.studyLog.sourcePomodoro,
    review: t.studyLog.sourceReview,
    manual: t.studyLog.sourceManual,
  } as const;
  const [minutes, setMinutes] = useState(String(session.minutes));

  async function save() {
    if (!user) return;
    const value = clampMinutes(Number(minutes));
    setEditing(false);
    try {
      await updateDoc(doc(db, "users", user.uid, "studySessions", session.id), {
        minutes: value,
        // An edited session is no longer what the timer recorded, and saying
        // so is the honest thing — the log should not claim a hand-corrected
        // row was measured.
        source: "manual",
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error(t.organiser.changeFailed);
      setMinutes(String(session.minutes));
    }
  }

  async function remove() {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "studySessions", session.id));
    } catch {
      toast.error(t.organiser.deleteFailed);
    }
  }

  return (
    <li className="flex items-center gap-3 p-3.5">
      <span className="text-muted-foreground w-16 shrink-0 text-xs tabular-nums">
        {day}
      </span>

      {editing ? (
        <>
          <Input
            type="number"
            min={0}
            max={MAX_SESSION_MINUTES}
            value={minutes}
            autoFocus
            onChange={(e) => setMinutes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") {
                setMinutes(String(session.minutes));
                setEditing(false);
              }
            }}
            className="w-24 tabular-nums"
            aria-label={t.studyLog.minutesStudied}
          />
          <span className="text-muted-foreground text-xs">{t.studyLog.minutes}</span>
          <Button size="sm" onClick={save}>
            {t.common.save}
          </Button>
          <button
            type="button"
            aria-label={t.common.cancel}
            onClick={() => {
              setMinutes(String(session.minutes));
              setEditing(false);
            }}
            className="text-muted-foreground hover:text-foreground grid size-7 place-items-center rounded-md"
          >
            <X className="size-3.5" />
          </button>
        </>
      ) : (
        <>
          <span className="w-20 shrink-0 text-sm font-medium tabular-nums">
            {formatMinutes(session.minutes)}
          </span>
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
            {SOURCES[session.source]}
            {session.cardsReviewed
              ? ` · ${t.studyLog.cardsReviewed(session.cardsReviewed)}`
              : ""}
          </span>
          {session.courseTag ? (
            <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
              {session.courseTag}
            </Badge>
          ) : null}
          <button
            type="button"
            aria-label={t.studyLog.editSession(day)}
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring grid size-7 shrink-0 place-items-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <Pencil className="size-3.5" />
          </button>
        </>
      )}

      <button
        type="button"
        aria-label={t.studyLog.deleteSession(day)}
        onClick={remove}
        className="text-muted-foreground hover:text-destructive focus-visible:ring-ring grid size-7 shrink-0 place-items-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}

function AddSession({ todayKey, subjects }: { todayKey: string; subjects: string[] }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(todayKey);
  const [minutes, setMinutes] = useState("30");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);

  const value = clampMinutes(Number(minutes));

  async function save() {
    if (!user || value <= 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "users", user.uid, "studySessions"), {
        source: "manual",
        day,
        minutes: value,
        courseTag: subject || null,
        startedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      setOpen(false);
      setMinutes("30");
    } catch {
      toast.error(t.studyLog.saveSessionFailed);
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        {t.studyLog.addElsewhere}
      </Button>
    );
  }

  return (
    <div className="bg-card flex flex-wrap items-end gap-2 rounded-xl border p-4">
      <Input
        type="date"
        value={day}
        max={todayKey}
        onChange={(e) => setDay(e.target.value)}
        aria-label={t.studyLog.day}
        className="w-40"
      />
      <Input
        type="number"
        min={1}
        max={MAX_SESSION_MINUTES}
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        aria-label={t.studyLog.minutesStudied}
        className="w-24 tabular-nums"
      />
      <span className="text-muted-foreground pb-2 text-xs">{t.studyLog.minutes}</span>
      {subjects.length > 0 ? (
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-label={t.organiser.subject}
          className="border-input bg-background focus-visible:ring-ring h-9 max-w-44 rounded-md border px-3 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <option value="">{t.organiser.noSubject}</option>
          {subjects.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : null}
      <Button onClick={save} disabled={saving || value <= 0}>
        {saving ? <Loader2 className="animate-spin" /> : <Plus />}
        {t.common.add}
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        {t.common.cancel}
      </Button>
    </div>
  );
}
