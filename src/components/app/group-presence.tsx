"use client";

/**
 * Tells the student's groups they are studying, while they actually are.
 *
 * This lives in the app shell rather than inside the Pomodoro timer, and that
 * placement is the whole point. The timer's STATE survives navigation — it is
 * a module-level store — but the timer's COMPONENT does not, so a student who
 * started a block and went to read their notes would have quietly dropped out
 * of the group as soon as the calendar unmounted. Presence has to follow the
 * timer, not the screen the timer is drawn on.
 *
 * It renders nothing.
 *
 * Deliberately tied to a running focus block rather than to having the tab
 * open. "Here now" that only means "has Tuón open in a background tab" is a
 * light that means nothing, and a presence indicator nobody believes is worse
 * than none at all.
 */

import { useEffect, useSyncExternalStore } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { isRunning } from "@/lib/organiser/pomodoro";
import {
  getTimerServerSnapshot,
  getTimerSnapshot,
  subscribeToTimer,
} from "@/lib/organiser/timer-store";

/**
 * One write per member per two minutes per group. Nothing at this scale, and
 * still feels live. Every second would be a beautiful demo and a bill.
 */
const REFRESH_MS = 120_000;

export function GroupPresence() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const timer = useSyncExternalStore(
    subscribeToTimer,
    getTimerSnapshot,
    getTimerServerSnapshot,
  );

  const focusing = isRunning(timer) && timer.phase === "focus";
  const uid = user?.uid;
  const groupKey = (profile?.groupIds ?? []).join(",");
  const name = profile?.displayName?.trim() || t.groups.aClassmate;

  useEffect(() => {
    if (!uid || !focusing || !groupKey) return;
    const groups = groupKey.split(",");

    function announce() {
      for (const groupId of groups) {
        void setDoc(doc(db, "studyGroups", groupId, "presence", uid!), {
          displayName: name,
          // Just past the refresh interval, so it lapses shortly after the
          // timer stops rather than lingering as company nobody is keeping.
          until: Timestamp.fromDate(new Date(Date.now() + 3 * REFRESH_MS)),
          updatedAt: serverTimestamp(),
        }).catch(() => {
          // A group they have since left, or a dead connection. Neither is
          // worth interrupting a study session for.
        });
      }
    }

    announce();
    const id = window.setInterval(announce, REFRESH_MS);

    return () => {
      window.clearInterval(id);
      // Best effort. The expiry above is what actually guarantees they stop
      // showing as present, because a closed laptop runs no cleanup.
      for (const groupId of groups) {
        void deleteDoc(doc(db, "studyGroups", groupId, "presence", uid!)).catch(() => {});
      }
    };
  }, [uid, focusing, groupKey, name]);

  return null;
}
