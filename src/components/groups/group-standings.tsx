"use client";

/**
 * Standings inside a group.
 *
 * Ranked on XP earned from recall, never on hours — see lib/groups/scoring for
 * why that distinction is the entire design. Every point traces back to a card
 * remembered on a schedule, so the only way up the table is to actually learn
 * something, and no amount of sitting with the app open moves it.
 *
 * The member's own row is computed here from their own review logs and
 * published to the group as a summary. Nobody's individual cards, notes or
 * subjects are shared — only four numbers and the name they already show.
 */

import { useEffect, useMemo, useRef } from "react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { Trophy } from "lucide-react";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useReviewLogs } from "@/lib/hooks/use-firestore";
import { isUsableAvatar } from "@/lib/profile/avatar";
import {
  buildScore,
  isWorthPublishing,
  rankMembers,
  type ScoreRow,
} from "@/lib/groups/scoring";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function GroupStandings({ groupId }: { groupId: string }) {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { logs } = useReviewLogs(user?.uid);
  const [rows, setRows] = useState<ScoreRow[]>([]);

  useEffect(() => {
    return onSnapshot(
      collection(db, "studyGroups", groupId, "scores"),
      (snap) =>
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ScoreRow)),
      () => setRows([]),
    );
  }, [groupId]);

  const mine = useMemo(() => buildScore(logs), [logs]);

  /**
   * Publishes the member's own row when it has actually moved.
   *
   * Guarded by a ref as well as the comparison: without it, the snapshot that
   * arrives in response to this very write would re-run the effect and, on a
   * slow connection, write again before the first result landed.
   */
  const published = useRef<number | null>(null);
  useEffect(() => {
    if (!user || logs.length === 0) return;
    const previous = rows.find((r) => r.id === user.uid) ?? null;
    if (!isWorthPublishing(mine, previous)) return;
    if (published.current === mine.xp) return;
    published.current = mine.xp;

    void setDoc(
      doc(db, "studyGroups", groupId, "scores", user.uid),
      {
        displayName: profile?.displayName?.trim() || t.groups.aClassmate,
        photoURL: isUsableAvatar(profile?.photoURL) ? profile.photoURL : null,
        xp: mine.xp,
        recalls: mine.recalls,
        mastered: mine.mastered,
        studied: mine.studied,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ).catch(() => {
      // A group they have since left. Not worth interrupting anything for.
    });
  }, [
    user,
    groupId,
    mine,
    rows,
    logs.length,
    profile?.displayName,
    profile?.photoURL,
    t.groups.aClassmate,
  ]);

  const ranked = useMemo(() => rankMembers(rows), [rows]);

  return (
    <section className="mt-8">
      <h2 className="font-display flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Trophy className="text-muted-foreground size-4" />
        {t.groups.standings}
      </h2>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        {t.groups.standingsHint}
      </p>

      {ranked.length === 0 ? (
        <p className="text-muted-foreground mt-3 rounded-xl border border-dashed px-4 py-5 text-center text-sm">
          {t.groups.noStandings}
        </p>
      ) : (
        <ol className="mt-3 divide-y rounded-xl border">
          {ranked.map((member) => {
            const isMe = member.id === user?.uid;
            const photo = isUsableAvatar(member.photoURL) ? member.photoURL : null;
            return (
              <li
                key={member.id}
                className={cn(
                  "flex items-center gap-3 p-3.5",
                  isMe && "bg-accent/40",
                )}
              >
                <span
                  className={cn(
                    "w-6 shrink-0 text-sm font-medium tabular-nums",
                    member.rank === 1 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {member.rank}
                </span>

                <Avatar className="size-7 shrink-0">
                  {photo ? <AvatarImage src={photo} alt="" /> : null}
                  <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-semibold">
                    {member.displayName.trim().charAt(0).toUpperCase() || "S"}
                  </AvatarFallback>
                </Avatar>

                <span className="min-w-0 flex-1 truncate text-sm">
                  {member.displayName}
                  {isMe ? (
                    <span className="text-muted-foreground ml-1.5 text-xs">
                      {t.groups.you}
                    </span>
                  ) : null}
                </span>

                <span className="text-muted-foreground hidden shrink-0 text-xs tabular-nums sm:inline">
                  {t.groups.masteredCount(member.mastered)}
                </span>
                <span className="font-display shrink-0 text-sm font-semibold tabular-nums">
                  {t.groups.xp(member.xp.toLocaleString())}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
        {t.groups.standingsPrivacy}
      </p>
    </section>
  );
}
