"use client";

/**
 * One study group.
 *
 * Three things, which is what the plan asked for and no more: what the group
 * is studying, when their deadline is, and who is at it right now.
 *
 * There IS a leaderboard, and the axis it ranks on is the whole argument.
 * Hours would reward whoever leaves a timer running and turn a review batch
 * into a contest about endurance; XP earned from recall can only be moved by
 * remembering cards when they come back due. See lib/groups/scoring.
 *
 * Presence stays separate and says "here now" and nothing else — it is company,
 * not a score.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Copy,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useStudySets } from "@/lib/hooks/use-firestore";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { useNow } from "@/lib/hooks/use-now";
import { dayKey } from "@/lib/hooks/use-review-cards";
import { callGroups } from "@/lib/groups/client";
import { GroupStandings } from "@/components/groups/group-standings";
import { describeDueDate, isUsableTitle } from "@/lib/organiser/plan-items";
import type {
  GroupDeadline,
  GroupMember,
  GroupPresence,
  GroupSharedSet,
  StudyGroup,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function GroupPage() {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { timeZone } = usePreferences();
  const groupId = params.groupId;

  const group = useDoc<StudyGroup>(`studyGroups/${groupId}`);
  const members = useSub<GroupMember>(`studyGroups/${groupId}/members`);
  const sharedSets = useSub<GroupSharedSet>(`studyGroups/${groupId}/sharedSets`);
  const deadlines = useSub<GroupDeadline>(`studyGroups/${groupId}/deadlines`);
  const presence = useSub<GroupPresence>(`studyGroups/${groupId}/presence`);

  // Ticked rather than read during render: presence entries expire on their
  // own, and `Date.now()` in a useMemo is both impure and never re-evaluated,
  // so someone who stopped studying would stay lit until the next unrelated
  // render.
  const now = useNow(30_000);
  const todayKey = dayKey(new Date(now), timeZone);
  const isOwner = group.data?.ownerId === user?.uid;

  // Presence entries carry their own expiry, so a member whose tab was closed
  // mid-session disappears on their own rather than lingering as fake company.
  const here = useMemo(
    () => presence.data.filter((p) => (p.until?.toDate?.().getTime() ?? 0) > now),
    [presence.data, now],
  );

  const upcoming = useMemo(
    () =>
      deadlines.data
        .filter((d) => d.dueDate >= todayKey)
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)),
    [deadlines.data, todayKey],
  );

  if (group.loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
      </main>
    );
  }

  if (!group.data) {
    return (
      <main className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            You are not in this group
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Groups are invite-only, so a link on its own is not enough. Ask
            someone inside for a code.
          </p>
          <Button className="mt-6" render={<Link href="/app/groups" />}>
            Your groups
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <Button variant="ghost" size="sm" render={<Link href="/app/groups" />}>
        <ArrowLeft />
        Study groups
      </Button>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">
            {group.data.name}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {group.data.memberCount}{" "}
            {group.data.memberCount === 1 ? "member" : "members"}
            {here.length > 0 ? ` · ${here.length} studying now` : ""}
          </p>
        </div>
        <LeaveButton
          groupId={groupId}
          memberCount={group.data.memberCount}
          onLeft={() => router.replace("/app/groups")}
        />
      </header>

      <InviteCard groupId={groupId} />

      {/* Members, with whoever is studying marked. */}
      <section className="mt-8">
        <h2 className="font-display flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Users className="text-muted-foreground size-4" />
          Who is in
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {members.data.map((member) => {
            const studying = here.some((p) => p.id === member.id);
            return (
              <li
                key={member.id}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                  studying && "border-success/50 bg-success/10",
                )}
              >
                {studying ? (
                  <span className="bg-success size-1.5 rounded-full" aria-hidden />
                ) : null}
                <span>{member.displayName}</span>
                {member.role === "owner" ? (
                  <span className="text-muted-foreground text-xs">owner</span>
                ) : null}
                {studying ? <span className="text-success text-xs">studying</span> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <GroupDeadlines
        groupId={groupId}
        deadlines={upcoming}
        todayKey={todayKey}
        displayName={profile?.displayName ?? "A classmate"}
        uid={user?.uid ?? ""}
      />

      <GroupStandings groupId={groupId} />

      <SharedSets
        groupId={groupId}
        shared={sharedSets.data}
        uid={user?.uid ?? ""}
        isOwner={isOwner}
        displayName={profile?.displayName ?? "A classmate"}
      />
    </main>
  );
}

/* -------------------------------------------------------------------------
   Invite
   ------------------------------------------------------------------------- */

/**
 * The code is not readable from the browser — `groupInvites` denies all client
 * reads, because a client that could read it could enumerate every code in the
 * app. So the code is shown once, when the group is created, and otherwise a
 * member shares it from wherever they saved it.
 *
 * That is a deliberate trade: a slightly worse flow in exchange for a
 * collection that leaks nothing even if every other rule were wrong.
 */
function InviteCard({ groupId }: { groupId: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="bg-accent/30 mt-6 rounded-2xl border p-4">
      <p className="text-sm leading-relaxed">
        <strong>Invite someone.</strong> Send them the code you were given when
        this group was made — codes expire after two weeks, so ask the owner for
        a fresh one if it stops working.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              `${window.location.origin}/app/groups?join=${groupId}`,
            );
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            toast.error("Could not copy that.");
          }
        }}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy group link"}
      </Button>
    </div>
  );
}

/**
 * Leaving, which for the last member out means deleting the group.
 *
 * That case gets a confirmation and the other does not: rejoining a group you
 * left is one code away, but the last person leaving destroys the group's
 * deadlines and its list of shared sets for good.
 */
function LeaveButton({
  groupId,
  memberCount,
  onLeft,
}: {
  groupId: string;
  memberCount: number;
  onLeft: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const last = memberCount <= 1;

  async function leave() {
    setBusy(true);
    const result = await callGroups({ action: "leave", groupId });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not leave that group.");
      return;
    }
    toast.success(last ? "Group deleted." : "You left the group.");
    onLeft();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => (last ? setConfirming(true) : void leave())}
        disabled={busy}
      >
        {busy ? <Loader2 className="animate-spin" /> : <LogOut />}
        {last ? "Delete group" : "Leave"}
      </Button>

      <Dialog open={confirming} onOpenChange={(open) => (open ? null : setConfirming(false))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this group?</DialogTitle>
            <DialogDescription>
              You are the last member, so leaving removes the group along with
              its deadlines and its list of shared sets. Nobody&rsquo;s notes or
              cards are touched &mdash; those stay in the library of whoever made
              them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={leave} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <LogOut />}
              Delete group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------------------
   Deadlines
   ------------------------------------------------------------------------- */

function GroupDeadlines({
  groupId,
  deadlines,
  todayKey,
  displayName,
  uid,
}: {
  groupId: string;
  deadlines: GroupDeadline[];
  todayKey: string;
  displayName: string;
  uid: string;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!isUsableTitle(title) || !dueDate || busy) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "studyGroups", groupId, "deadlines"), {
        title: title.trim(),
        dueDate,
        createdBy: uid,
        createdByName: displayName,
        createdAt: serverTimestamp(),
      });
      setTitle("");
      setDueDate("");
    } catch {
      toast.error("Could not add that deadline.");
    }
    setBusy(false);
  }

  return (
    <section className="mt-8">
      <h2 className="font-display flex items-center gap-2 text-lg font-semibold tracking-tight">
        <CalendarClock className="text-muted-foreground size-4" />
        What the group is working towards
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Practical exam, group report…"
          aria-label="Deadline"
          maxLength={140}
          className="min-w-48 flex-1"
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-label="Due date"
          className="w-40"
        />
        <Button onClick={add} disabled={!isUsableTitle(title) || !dueDate || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          Add
        </Button>
      </div>

      {deadlines.length === 0 ? (
        <p className="text-muted-foreground mt-3 rounded-xl border border-dashed px-4 py-5 text-center text-sm">
          Nothing yet. A shared date is the thing that makes a group a group
          rather than a chat.
        </p>
      ) : (
        <ul className="mt-3 divide-y rounded-xl border">
          {deadlines.map((deadline) => (
            <li key={deadline.id} className="flex items-center gap-3 p-3.5">
              <span className="text-muted-foreground w-24 shrink-0 text-xs font-medium tabular-nums">
                {describeDueDate(deadline.dueDate, todayKey)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{deadline.title}</span>
              <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
                {deadline.createdByName}
              </span>
              <button
                type="button"
                aria-label={`Delete ${deadline.title}`}
                onClick={() =>
                  void deleteDoc(doc(db, "studyGroups", groupId, "deadlines", deadline.id))
                }
                className="text-muted-foreground hover:text-destructive grid size-7 shrink-0 place-items-center rounded-md"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------
   Shared sets
   ------------------------------------------------------------------------- */

function SharedSets({
  groupId,
  shared,
  uid,
  isOwner,
  displayName,
}: {
  groupId: string;
  shared: GroupSharedSet[];
  uid: string;
  isOwner: boolean;
  displayName: string;
}) {
  const { data: mySets } = useStudySets(uid || undefined);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  const alreadyShared = new Set(shared.map((s) => s.studySetId));
  const shareable = mySets.filter((set) => !alreadyShared.has(set.id));

  async function share(setId: string) {
    const set = mySets.find((s) => s.id === setId);
    if (!set || busy) return;
    setBusy(true);
    try {
      // Two writes, and the order matters: the set has to name the group
      // BEFORE it is listed, or a member could click through to a set they
      // cannot yet read and see a permission error.
      await setDoc(
        doc(db, "users", uid, "studySets", setId),
        { sharedWithGroups: [...(set.sharedWithGroups ?? []), groupId] },
        { merge: true },
      );
      await addDoc(collection(db, "studyGroups", groupId, "sharedSets"), {
        ownerId: uid,
        studySetId: setId,
        title: set.title,
        courseTag: set.courseTag ?? null,
        cardCount: set.flashcardCount ?? 0,
        sharedByName: displayName,
        sharedAt: serverTimestamp(),
      });
      setPicking(false);
    } catch {
      toast.error("Could not share that set.");
    }
    setBusy(false);
  }

  async function unshare(entry: GroupSharedSet) {
    try {
      await deleteDoc(doc(db, "studyGroups", groupId, "sharedSets", entry.id));
      // Only the owner can take the permission back off their own set; a group
      // owner removing someone else's entry just delists it.
      if (entry.ownerId === uid) {
        const set = mySets.find((s) => s.id === entry.studySetId);
        await setDoc(
          doc(db, "users", uid, "studySets", entry.studySetId),
          {
            sharedWithGroups: (set?.sharedWithGroups ?? []).filter((g) => g !== groupId),
          },
          { merge: true },
        );
      }
    } catch {
      toast.error("Could not remove that.");
    }
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold tracking-tight">
        What the group is studying
      </h2>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        Sets stay in the library of whoever made them, so a fix reaches everyone
        rather than leaving copies to go stale. Only this group can open them.
      </p>

      {picking ? (
        <div className="bg-card mt-3 rounded-xl border p-4">
          {shareable.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Everything you have is already here.
            </p>
          ) : (
            <ul className="max-h-56 divide-y overflow-y-auto">
              {shareable.map((set) => (
                <li key={set.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{set.title}</span>
                  <Button size="sm" variant="outline" onClick={() => share(set.id)} disabled={busy}>
                    Share
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setPicking(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setPicking(true)}>
          <Plus />
          Share one of your sets
        </Button>
      )}

      {shared.length > 0 ? (
        <ul className="mt-3 divide-y rounded-xl border">
          {shared.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 p-3.5">
              <Link
                href={
                  entry.ownerId === uid
                    ? `/app/sets/${entry.studySetId}`
                    : `/s/${entry.ownerId}/${entry.studySetId}`
                }
                className="min-w-0 flex-1"
              >
                <p className="truncate text-sm font-medium">{entry.title}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {entry.cardCount} {entry.cardCount === 1 ? "card" : "cards"} ·{" "}
                  {entry.sharedByName}
                </p>
              </Link>
              {entry.courseTag ? (
                <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                  {entry.courseTag}
                </Badge>
              ) : null}
              {entry.ownerId === uid || isOwner ? (
                <button
                  type="button"
                  aria-label={`Remove ${entry.title}`}
                  onClick={() => void unshare(entry)}
                  className="text-muted-foreground hover:text-destructive grid size-7 shrink-0 place-items-center rounded-md"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------
   Subscriptions
   ------------------------------------------------------------------------- */

function useDoc<T>(path: string) {
  const [state, setState] = useState<{ data: T | null; loading: boolean }>({
    data: null,
    loading: true,
  });

  useEffect(() => {
    return onSnapshot(
      doc(db, path),
      (snapshot) => {
        setState({
          data: snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T) : null,
          loading: false,
        });
      },
      // A permission error here is the normal case for a non-member, not a
      // fault: it renders as "you are not in this group".
      () => setState({ data: null, loading: false }),
    );
  }, [path]);

  return state;
}

function useSub<T>(path: string) {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    return onSnapshot(
      collection(db, path),
      (snapshot) => setData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T)),
      () => setData([]),
    );
  }, [path]);

  return { data };
}
