"use client";

/**
 * Talking to /api/groups.
 *
 * Every membership change goes through the server, because `memberIds` and
 * `groupIds` are the access-control list for the first data in Tuón that more
 * than one account can read. There is deliberately no client-side path to any
 * of this.
 */

import { auth, getAppCheckToken } from "@/lib/firebase/client";

type Action =
  | { action: "create"; name: string; courseTag: string | null }
  | { action: "join"; code: string }
  | { action: "leave"; groupId: string };

export interface GroupResult {
  ok: boolean;
  groupId?: string;
  /** The invite code, on a successful create. */
  code?: string;
  /**
   * Why it failed, as a key the caller looks up in the message catalogue.
   *
   * The server cannot know what language the student reads, so it names the
   * failure and the browser says it. `error` is the server's English, kept as
   * the fallback for a code the catalogue has not learned yet.
   */
  errorCode?: string;
  error?: string;
}

export async function callGroups(body: Action): Promise<GroupResult> {
  const user = auth.currentUser;
  if (!user) return { ok: false, errorCode: "NOT_SIGNED_IN" };

  const [token, appCheckToken] = await Promise.all([
    user.getIdToken(),
    getAppCheckToken(),
  ]);

  try {
    const response = await fetch("/api/groups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      groupId?: string;
      code?: string;
      error?: string;
    };

    if (!response.ok) {
      return { ok: false, errorCode: payload.code, error: payload.error };
    }
    return { ok: true, groupId: payload.groupId, code: payload.code };
  } catch {
    // A failed group action is almost always a dead connection, and saying so
    // is more useful than a generic apology.
    return { ok: false, errorCode: "OFFLINE" };
  }
}
