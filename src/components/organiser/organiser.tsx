"use client";

/**
 * The organiser, under the calendar.
 *
 * The month grid above answers "when do my cards come back?". This answers
 * "what is actually due of me this week?" — the deadlines, the todos, and the
 * classes that decide when a student has time to study at all. They belong on
 * the same screen because a student planning their week is asking both
 * questions at once, and having to hold half the answer in their head is how
 * planning stops happening.
 *
 * Everything here is one student's own data. No sharing, no server, no sync
 * with a school system.
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
import {
  CalendarClock,
  Check,
  Clock,
  ListTodo,
  Loader2,
  Plus,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { usePlanItems } from "@/lib/hooks/use-firestore";
import {
  MAX_LOCATION_CHARS,
  MAX_TITLE_CHARS,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  classesOn,
  daysBetween,
  describeDueDate,
  formatMinute,
  isUsableTitle,
  orderTodos,
  overlappingClassIds,
  parseTimeValue,
  upcomingDeadlines,
} from "@/lib/organiser/plan-items";
import type { PlanItem, PlanItemKind } from "@/lib/types";
import { StudyLog } from "@/components/organiser/study-log";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function Organiser({ todayKey }: { todayKey: string }) {
  const { user, profile } = useAuth();
  const { items, loading } = usePlanItems(user?.uid);

  const subjects = useMemo(() => profile?.courses ?? [], [profile?.courses]);

  const deadlines = useMemo(() => upcomingDeadlines(items, todayKey), [items, todayKey]);
  const todos = useMemo(() => orderTodos(items), [items]);
  const openTodos = todos.filter((todo) => todo.done !== true).length;
  const classes = useMemo(() => items.filter((item) => item.kind === "class"), [items]);

  return (
    <section className="mt-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Your week</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Deadlines, what you owe, and when you are in class. Only you see any
            of this.
          </p>
        </div>
      </div>

      <Tabs defaultValue="deadlines" className="mt-5">
        <TabsList>
          <TabsTrigger value="deadlines">
            <CalendarClock className="size-3.5" />
            Deadlines
            {deadlines.length > 0 ? <Count value={deadlines.length} /> : null}
          </TabsTrigger>
          <TabsTrigger value="todos">
            <ListTodo className="size-3.5" />
            To do
            {openTodos > 0 ? <Count value={openTodos} /> : null}
          </TabsTrigger>
          <TabsTrigger value="timetable">
            <Table2 className="size-3.5" />
            Timetable
          </TabsTrigger>
          <TabsTrigger value="time">
            <Clock className="size-3.5" />
            Time
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <Skeleton className="mt-4 h-40 w-full rounded-2xl" />
        ) : (
          <>
            <TabsContent value="deadlines" className="mt-4">
              <DeadlineList items={deadlines} todayKey={todayKey} subjects={subjects} />
            </TabsContent>
            <TabsContent value="todos" className="mt-4">
              <TodoList items={todos} todayKey={todayKey} subjects={subjects} />
            </TabsContent>
            <TabsContent value="timetable" className="mt-4">
              <Timetable items={classes} subjects={subjects} />
            </TabsContent>
            <TabsContent value="time" className="mt-4">
              <StudyLog todayKey={todayKey} subjects={subjects} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </section>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="bg-foreground/10 ml-1 rounded-full px-1.5 text-[11px] tabular-nums">
      {value}
    </span>
  );
}

/* -------------------------------------------------------------------------
   Writing
   ------------------------------------------------------------------------- */

function useItemWriter() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  async function add(fields: Partial<PlanItem> & { kind: PlanItemKind; title: string }) {
    if (!user) return false;
    setBusy(true);
    try {
      await addDoc(collection(db, "users", user.uid, "planItems"), {
        ...fields,
        title: fields.title.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch {
      toast.error("Could not save that. Check your connection.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, fields: Partial<PlanItem>) {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "planItems", id), {
        ...fields,
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error("Could not save that change.");
    }
  }

  async function remove(id: string) {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "planItems", id));
    } catch {
      toast.error("Could not delete that.");
    }
  }

  return { add, patch, remove, busy };
}

/* -------------------------------------------------------------------------
   Deadlines
   ------------------------------------------------------------------------- */

function DeadlineList({
  items,
  todayKey,
  subjects,
}: {
  items: PlanItem[];
  todayKey: string;
  subjects: string[];
}) {
  const { add, remove, busy } = useItemWriter();

  return (
    <div className="space-y-3">
      <AddRow
        placeholder="Thesis draft, problem set, presentation…"
        subjects={subjects}
        withDate
        dateRequired
        busy={busy}
        onAdd={({ title, courseTag, dueDate }) =>
          add({ kind: "deadline", title, courseTag, dueDate: dueDate! })
        }
      />

      {items.length === 0 ? (
        <Empty>
          Nothing due. When you add a deadline here, it also becomes what your
          readiness on the dashboard is measured against.
        </Empty>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((item) => {
            const days = daysBetween(todayKey, item.dueDate!);
            const overdue = days < 0;
            const urgent = days >= 0 && days <= 2;

            return (
              <li key={item.id} className="flex items-center gap-3 p-3.5">
                <span
                  className={cn(
                    "w-24 shrink-0 text-xs font-medium tabular-nums",
                    overdue
                      ? "text-destructive"
                      : urgent
                        ? "text-warning-text"
                        : "text-muted-foreground",
                  )}
                >
                  {describeDueDate(item.dueDate!, todayKey)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                {item.courseTag ? (
                  <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                    {item.courseTag}
                  </Badge>
                ) : null}
                <DeleteButton label={`Delete ${item.title}`} onDelete={() => remove(item.id)} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Todos
   ------------------------------------------------------------------------- */

function TodoList({
  items,
  todayKey,
  subjects,
}: {
  items: PlanItem[];
  todayKey: string;
  subjects: string[];
}) {
  const { add, patch, remove, busy } = useItemWriter();

  return (
    <div className="space-y-3">
      <AddRow
        placeholder="Read chapter 4, email Ms. Reyes…"
        subjects={subjects}
        withDate
        busy={busy}
        onAdd={({ title, courseTag, dueDate }) =>
          add({ kind: "todo", title, courseTag, dueDate: dueDate ?? null, done: false })
        }
      />

      {items.length === 0 ? (
        <Empty>
          Small things that are not flashcards. They stay on the list once
          ticked, so you can see what the week actually cost you.
        </Empty>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((item) => {
            const done = item.done === true;
            return (
              <li key={item.id} className="flex items-center gap-3 p-3.5">
                <Checkbox
                  checked={done}
                  aria-label={done ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`}
                  onCheckedChange={(next) => void patch(item.id, { done: next === true })}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    done && "text-muted-foreground line-through",
                  )}
                >
                  {item.title}
                </span>
                {item.dueDate ? (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {describeDueDate(item.dueDate, todayKey)}
                  </span>
                ) : null}
                {item.courseTag ? (
                  <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                    {item.courseTag}
                  </Badge>
                ) : null}
                <DeleteButton label={`Delete ${item.title}`} onDelete={() => remove(item.id)} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Timetable
   ------------------------------------------------------------------------- */

function Timetable({ items, subjects }: { items: PlanItem[]; subjects: string[] }) {
  const { add, remove, busy } = useItemWriter();
  const clashing = useMemo(() => overlappingClassIds(items), [items]);

  // Weekdays first: a timetable that opens on Sunday wastes the top of the
  // screen on the two days nobody has class.
  const order = [1, 2, 3, 4, 5, 6, 0];
  const populated = order.filter((weekday) => classesOn(items, weekday).length > 0);

  return (
    <div className="space-y-3">
      <AddClassRow subjects={subjects} busy={busy} onAdd={add} />

      {clashing.size > 0 ? (
        <p className="border-warning/40 bg-warning/10 rounded-xl border px-3 py-2 text-sm">
          Two classes overlap. Left as you entered it — a real clash is
          something to sort out with your school, not something this should
          quietly refuse to save.
        </p>
      ) : null}

      {populated.length === 0 ? (
        <Empty>
          Add your class times and the week has a shape. It is also how you spot
          the free afternoon you keep forgetting about.
        </Empty>
      ) : (
        <div className="space-y-4">
          {populated.map((weekday) => (
            <div key={weekday}>
              <h3 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                {WEEKDAY_NAMES[weekday]}
              </h3>
              <ul className="mt-2 divide-y rounded-xl border">
                {classesOn(items, weekday).map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-3.5",
                      clashing.has(item.id) && "bg-warning/10",
                    )}
                  >
                    <span className="text-muted-foreground w-36 shrink-0 text-xs tabular-nums">
                      {formatMinute(item.startMinute ?? 0)} –{" "}
                      {formatMinute(item.endMinute ?? 0)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                    {item.location ? (
                      <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
                        {item.location}
                      </span>
                    ) : null}
                    <DeleteButton
                      label={`Delete ${item.title}`}
                      onDelete={() => remove(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Shared pieces
   ------------------------------------------------------------------------- */

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm leading-relaxed">
      {children}
    </p>
  );
}

/**
 * Delete is immediate and there is no confirm.
 *
 * These are one-line notes a student typed; a dialog for every one would make
 * the list annoying to keep tidy, which is worse than losing a row. The
 * data-loss surface that DOES need a confirmation is deleting a subject, and
 * that one has one.
 */
function DeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onDelete}
      className="text-muted-foreground hover:text-destructive focus-visible:ring-ring grid size-7 shrink-0 place-items-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

interface AddPayload {
  title: string;
  courseTag: string | null;
  dueDate?: string | null;
}

function AddRow({
  placeholder,
  subjects,
  withDate,
  dateRequired,
  busy,
  onAdd,
}: {
  placeholder: string;
  subjects: string[];
  withDate?: boolean;
  dateRequired?: boolean;
  busy: boolean;
  onAdd: (payload: AddPayload) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [courseTag, setCourseTag] = useState("");

  const ready = isUsableTitle(title) && (!dateRequired || dueDate !== "");

  async function submit() {
    if (!ready || busy) return;
    const saved = await onAdd({
      title,
      courseTag: courseTag || null,
      dueDate: dueDate || null,
    });
    if (saved) {
      setTitle("");
      setDueDate("");
      // Subject is deliberately kept: someone adding three deadlines is
      // usually adding three for the same class.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={placeholder}
        maxLength={MAX_TITLE_CHARS}
        aria-label={placeholder}
        className="min-w-48 flex-1"
      />
      {withDate ? (
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-label={dateRequired ? "Due date" : "Due date (optional)"}
          className="w-40"
        />
      ) : null}
      <SubjectPicker subjects={subjects} value={courseTag} onChange={setCourseTag} />
      <Button onClick={submit} disabled={!ready || busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Plus />}
        Add
      </Button>
    </div>
  );
}

function AddClassRow({
  subjects,
  busy,
  onAdd,
}: {
  subjects: string[];
  busy: boolean;
  onAdd: (fields: Partial<PlanItem> & { kind: PlanItemKind; title: string }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:30");
  const [location, setLocation] = useState("");
  const [courseTag, setCourseTag] = useState("");

  const startMinute = parseTimeValue(start);
  const endMinute = parseTimeValue(end);
  const ready =
    isUsableTitle(title) &&
    startMinute !== null &&
    endMinute !== null &&
    endMinute > startMinute;

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus />
        Add a class
      </Button>
    );
  }

  async function submit() {
    if (!ready || busy) return;
    const saved = await onAdd({
      kind: "class",
      title,
      courseTag: courseTag || null,
      weekday,
      startMinute: startMinute!,
      endMinute: endMinute!,
      location: location.trim() || null,
    });
    if (saved) {
      setTitle("");
      setLocation("");
    }
  }

  return (
    <div className="bg-card space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">New class</p>
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring grid size-7 place-items-center rounded-md focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <X className="size-4" />
        </button>
      </div>

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="General Biology lecture"
        maxLength={MAX_TITLE_CHARS}
        aria-label="Class name"
      />

      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_SHORT.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setWeekday(index)}
            aria-pressed={weekday === index}
            className={cn(
              "focus-visible:ring-ring rounded-lg border px-3 py-1.5 text-xs transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
              weekday === index
                ? "border-primary bg-accent/60"
                : "hover:border-primary/50 hover:bg-accent/30",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="class-start" className="text-xs">
            Starts
          </Label>
          <Input
            id="class-start"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-32"
          />
        </div>
        <div>
          <Label htmlFor="class-end" className="text-xs">
            Ends
          </Label>
          <Input
            id="class-end"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-32"
          />
        </div>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Room 204 (optional)"
          maxLength={MAX_LOCATION_CHARS}
          aria-label="Location"
          className="min-w-40 flex-1"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SubjectPicker subjects={subjects} value={courseTag} onChange={setCourseTag} />
        <Button onClick={submit} disabled={!ready || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Check />}
          Save class
        </Button>
        {startMinute !== null && endMinute !== null && endMinute <= startMinute ? (
          <span className="text-destructive text-xs">Ends before it starts.</span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A plain select over the subjects already on the profile.
 *
 * Not free text: a tag typed as "Gen Bio" here and "General Biology 1" on a
 * note is two subjects as far as every total in the app is concerned, and the
 * student would never find out why their study time looked split.
 */
function SubjectPicker({
  subjects,
  value,
  onChange,
}: {
  subjects: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  if (subjects.length === 0) return null;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Subject"
      className="border-input bg-background focus-visible:ring-ring h-9 max-w-44 rounded-md border px-3 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
    >
      <option value="">No subject</option>
      {subjects.map((subject) => (
        <option key={subject} value={subject}>
          {subject}
        </option>
      ))}
    </select>
  );
}
