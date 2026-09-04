"use client";

/**
 * The student's study groups.
 *
 * Invite-only, and there is no browsing. A group is reached because someone
 * you know sent you a code — the same way a class group chat works, and
 * deliberately not the way a public study room works. Tuón's core audience is
 * Grade 11 and 12, and a discoverable live space would put minors in a room
 * with adult strangers and make this app responsible for moderating it.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { collection, documentId, onSnapshot, query, where } from "firebase/firestore";
import { useEffect } from "react";
import { Check, Copy, Loader2, Plus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { renderGroupError } from "@/lib/i18n/format";
import { callGroups } from "@/lib/groups/client";
import { MAX_GROUP_NAME, normaliseInviteCode } from "@/lib/groups/invite";
import type { StudyGroup } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PaperCreature } from "@/components/brand/paper-creature";

export default function GroupsPage() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const groupIds = useMemo(() => profile?.groupIds ?? [], [profile?.groupIds]);
  const { groups, loading } = useMyGroups(groupIds);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.groups.title}
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          {t.groups.subtitle}
        </p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <CreateGroup disabled={!user} />
        <JoinGroup disabled={!user} />
      </div>

      {loading && groupIds.length > 0 ? (
        <Skeleton className="mt-8 h-24 w-full rounded-2xl" />
      ) : groups.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed py-12 text-center">
          <PaperCreature state="idle" className="mx-auto size-24" />
          <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-relaxed">
            {t.groups.noneYet}
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/app/groups/${group.id}`}
                className="hover:border-primary/40 hover:bg-accent/20 flex items-center gap-4 rounded-2xl border p-5 transition-colors"
              >
                <Users className="text-muted-foreground size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{group.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {t.common.members(group.memberCount)}
                  </p>
                </div>
                {group.courseTag ? (
                  <Badge variant="secondary" className="shrink-0">
                    {group.courseTag}
                  </Badge>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

/**
 * Subscribes to exactly the groups on the profile.
 *
 * `where(documentId(), "in", ids)` rather than a listing query: there is no
 * `list` permission on studyGroups at all, because listing is discovery. Ten
 * ids is also the `in` ceiling, which happens to be the same as the cap on how
 * many groups one student can be in.
 */
function useMyGroups(groupIds: string[]) {
  const key = groupIds.join(",");

  const [state, setState] = useState<{ groups: StudyGroup[]; loading: boolean }>({
    groups: [],
    loading: key.length > 0,
  });

  // Reset during render rather than in an effect: React 19 treats a
  // synchronous setState inside an effect as a cascading render, and doing it
  // here is the documented "adjust state when props change" pattern the rest
  // of the app's subscriptions already use.
  const [activeKey, setActiveKey] = useState(key);
  if (activeKey !== key) {
    setActiveKey(key);
    setState({ groups: [], loading: key.length > 0 });
  }

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) return;

    return onSnapshot(
      query(collection(db, "studyGroups"), where(documentId(), "in", ids.slice(0, 10))),
      (snapshot) => {
        setState({
          groups: snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as StudyGroup),
          loading: false,
        });
      },
      () => setState({ groups: [], loading: false }),
    );
  }, [key]);

  return state;
}

function CreateGroup({ disabled }: { disabled: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    const result = await callGroups({
      action: "create",
      name: name.trim(),
      courseTag: null,
    });
    setBusy(false);

    if (!result.ok) {
      toast.error(renderGroupError(result, t));
      return;
    }
    // Shown here and nowhere else, ever. Invite codes are not readable from a
    // browser - a client that could read them could enumerate every code in
    // the app - so this is the one moment it exists on screen.
    setCreated({ name: name.trim(), code: result.code ?? "" });
    setName("");
    setOpen(false);
  }

  if (created) {
    return <NewGroupCode created={created} onDone={() => setCreated(null)} />;
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="hover:border-primary/40 hover:bg-accent/20 rounded-2xl border p-5 text-left transition-colors disabled:opacity-60"
      >
        <Plus className="text-muted-foreground size-5" />
        <div className="mt-3 font-medium">{t.groups.startAGroup}</div>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {t.groups.startAGroupHint}
        </p>
      </button>
    );
  }

  return (
    <div className="bg-card rounded-2xl border p-5">
      <Label htmlFor="group-name" className="text-sm font-medium">
        {t.groups.groupName}
      </Label>
      <Input
        id="group-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
        }}
        placeholder={t.groups.groupNamePlaceholder}
        maxLength={MAX_GROUP_NAME}
        autoFocus
        className="mt-2"
      />
      <div className="mt-3 flex gap-2">
        <Button onClick={submit} disabled={!name.trim() || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          {t.groups.create}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}

/**
 * The invite code, once.
 *
 * Deliberately hard to dismiss by accident: this is the only time the code is
 * ever on screen, and losing it means the group's owner has to make a new one.
 */
function NewGroupCode({
  created,
  onDone,
}: {
  created: { name: string; code: string };
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  return (
    <div className="border-primary/40 bg-accent/40 rounded-2xl border p-5">
      <p className="text-sm font-medium">{t.groups.isReady(created.name)}</p>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        {t.groups.codeOnce}
      </p>
      <p className="font-display mt-3 text-3xl font-semibold tracking-[0.2em] tabular-nums">
        {created.code}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(created.code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              toast.error(t.groups.copyFailed);
            }
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? t.groups.copied : t.groups.copyCode}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          {t.groups.savedIt}
        </Button>
      </div>
    </div>
  );
}

function JoinGroup({ disabled }: { disabled: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const cleaned = normaliseInviteCode(code);
    if (!cleaned || busy) return;
    setBusy(true);
    const result = await callGroups({ action: "join", code: cleaned });
    setBusy(false);

    if (!result.ok) {
      toast.error(renderGroupError(result, t));
      return;
    }
    toast.success(t.groups.joined);
    setCode("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="hover:border-primary/40 hover:bg-accent/20 rounded-2xl border p-5 text-left transition-colors disabled:opacity-60"
      >
        <UserPlus className="text-muted-foreground size-5" />
        <div className="mt-3 font-medium">{t.groups.joinWithCode}</div>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {t.groups.joinHint}
        </p>
      </button>
    );
  }

  return (
    <div className="bg-card rounded-2xl border p-5">
      <Label htmlFor="invite-code" className="text-sm font-medium">
        {t.groups.inviteCode}
      </Label>
      <Input
        id="invite-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
        }}
        placeholder="ABCD2345"
        autoFocus
        autoCapitalize="characters"
        autoComplete="off"
        className="mt-2 font-mono tracking-widest uppercase"
      />
      <div className="mt-3 flex gap-2">
        <Button onClick={submit} disabled={!code.trim() || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <UserPlus />}
          {t.groups.join}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}
