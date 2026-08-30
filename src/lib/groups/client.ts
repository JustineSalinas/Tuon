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
  code?: string;
  error?: string;
}

export async function callGroups(body: Action): Promise<GroupResult> {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: "You need to be signed in." };

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

    const payload = (await response.json().catch(() => ({}))) as GroupResult & {
      error?: string;
    };

    if (!response.ok) {
      return { ok: false, error: payload.error ?? "That did not work. Try again." };
    }
    return { ...payload, ok: true };
  } catch {
    // A failed group action is almost always a dead connection, and saying so
    // is more useful than a generic apology.
    return { ok: false, error: "Could not reach Tuón. Check your connection." };
  }
}
