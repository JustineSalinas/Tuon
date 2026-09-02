import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminConfigError, adminDb, verifyAppCheck, verifyRequest } from "@/lib/firebase/admin";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import {
  MAX_GROUPS_PER_USER,
  MAX_MEMBERS,
  generateInviteCode,
  inviteExpiry,
  isExpired,
  isUsableGroupName,
  isWellFormedCode,
  normaliseInviteCode,
} from "@/lib/groups/invite";
import { log } from "@/lib/observability/log";

/**
 * Creating, joining and leaving a study group.
 *
 * All three run server-side for one reason: `memberIds` on the group and
 * `groupIds` on the profile are the access-control list for the first data in
 * Tuón that more than one account can read. Neither is client-writable (see
 * firestore.rules), so every change to who is in a group passes through here,
 * where it can be checked and where the two sides are written in one
 * transaction. A group whose member list and profile lists disagree is a group
 * someone can read but not see, or see but not read.
 *
 * Invite codes are resolved here too. The code is the only thing standing
 * between a stranger and a group of minors, so it is never readable from a
 * browser — the client sends a code and gets back a group id or a refusal.
 */

type Action = "create" | "join" | "leave";

export async function POST(request: Request) {
  const configError = adminConfigError();
  if (configError) {
    console.error("[groups] Firebase Admin is not configured:", configError);
    return NextResponse.json(
      { error: "This server is not fully configured yet.", code: "SERVER_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  if (!(await verifyAppCheck(request))) {
    return NextResponse.json(
      {
        error: "This request could not be verified. Please reload and try again.",
        code: "UNVERIFIED",
      },
      { status: 403 },
    );
  }

  const limit = await checkRateLimit(RATE_LIMITS.groups, clientIp(request));
  if (!limit.allowed) return rateLimitedResponse(limit, "study group changes");

  const caller = await verifyRequest(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Not signed in.", code: "NOT_SIGNED_IN" },
      { status: 401 },
    );
  }

  let body: { action?: Action; name?: string; courseTag?: string | null; code?: string; groupId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed request.", code: "MALFORMED" },
      { status: 400 },
    );
  }

  switch (body.action) {
    case "create":
      return createGroup(caller.uid, body.name ?? "", body.courseTag ?? null);
    case "join":
      return joinGroup(caller.uid, body.code ?? "");
    case "leave":
      return leaveGroup(caller.uid, body.groupId ?? "");
    default:
      return NextResponse.json(
        { error: "Unknown action.", code: "UNKNOWN_ACTION" },
        { status: 400 },
      );
  }
}

/** The name shown to the rest of the group, taken from the student's profile. */
async function displayNameOf(uid: string): Promise<string> {
  const snapshot = await adminDb().collection("users").doc(uid).get();
  const name = snapshot.get("displayName");
  return typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : "A classmate";
}

async function createGroup(uid: string, rawName: string, rawTag: string | null) {
  const name = rawName.trim();
  if (!isUsableGroupName(name)) {
    return NextResponse.json(
      { error: "Give the group a name.", code: "NAME_REQUIRED" },
      { status: 400 },
    );
  }

  const db = adminDb();
  const profileRef = db.collection("users").doc(uid);
  const profile = await profileRef.get();
  if (!profile.exists) {
    return NextResponse.json(
      { error: "Finish setting up your account first.", code: "NO_PROFILE" },
      { status: 400 },
    );
  }

  const existing = (profile.get("groupIds") as string[] | undefined) ?? [];
  if (existing.length >= MAX_GROUPS_PER_USER) {
    return NextResponse.json(
      {
        error: `You can be in ${MAX_GROUPS_PER_USER} groups at a time.`,
        code: "TOO_MANY_GROUPS",
      },
      { status: 400 },
    );
  }

  const displayName = await displayNameOf(uid);
  const groupRef = db.collection("studyGroups").doc();
  const code = generateInviteCode();

  // One batch, so the group, its first member, the invite and the creator's
  // profile either all exist or none do.
  const batch = db.batch();
  batch.create(groupRef, {
    name,
    courseTag: typeof rawTag === "string" && rawTag.trim() ? rawTag.trim().slice(0, 80) : null,
    ownerId: uid,
    memberIds: [uid],
    memberCount: 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.create(groupRef.collection("members").doc(uid), {
    displayName,
    role: "owner",
    joinedAt: FieldValue.serverTimestamp(),
  });
  batch.create(db.collection("groupInvites").doc(code), {
    groupId: groupRef.id,
    createdBy: uid,
    expiresAt: Timestamp.fromDate(inviteExpiry()),
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.update(profileRef, {
    groupIds: FieldValue.arrayUnion(groupRef.id),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  log.info({ scope: "groups", event: "created", uid });

  return NextResponse.json({ groupId: groupRef.id, code });
}

async function joinGroup(uid: string, rawCode: string) {
  const code = normaliseInviteCode(rawCode);
  // Checked before touching the database so a malformed guess costs a read of
  // nothing, which is most of what an attacker would send.
  if (!isWellFormedCode(code)) {
    return NextResponse.json(
      { error: "That invite code is not valid.", code: "BAD_CODE" },
      { status: 400 },
    );
  }

  const db = adminDb();
  const invite = await db.collection("groupInvites").doc(code).get();

  // One message for "no such code" and "expired code" on purpose: telling a
  // stranger which one it was turns this into an oracle for probing codes.
  const refuse = () =>
    NextResponse.json(
      {
        error: "That invite is not valid any more. Ask for a fresh one.",
        code: "EXPIRED_CODE",
      },
      { status: 404 },
    );

  if (!invite.exists) return refuse();
  const expiresAt = invite.get("expiresAt") as Timestamp | undefined;
  if (!expiresAt || isExpired(expiresAt.toDate())) return refuse();

  const groupId = invite.get("groupId") as string | undefined;
  if (!groupId) return refuse();

  const groupRef = db.collection("studyGroups").doc(groupId);
  const profileRef = db.collection("users").doc(uid);
  const displayName = await displayNameOf(uid);

  try {
    await db.runTransaction(async (tx) => {
      const group = await tx.get(groupRef);
      if (!group.exists) throw new Error("GONE");

      const members = (group.get("memberIds") as string[] | undefined) ?? [];
      if (members.includes(uid)) return; // Already in; joining twice is a no-op.
      // Read inside the transaction so two people joining at once cannot both
      // see 29 members and both get in.
      if (members.length >= MAX_MEMBERS) throw new Error("FULL");

      const profile = await tx.get(profileRef);
      const groups = (profile.get("groupIds") as string[] | undefined) ?? [];
      if (groups.length >= MAX_GROUPS_PER_USER) throw new Error("TOO_MANY");

      tx.update(groupRef, {
        memberIds: FieldValue.arrayUnion(uid),
        memberCount: members.length + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(groupRef.collection("members").doc(uid), {
        displayName,
        role: "member",
        joinedAt: FieldValue.serverTimestamp(),
      });
      tx.update(profileRef, {
        groupIds: FieldValue.arrayUnion(groupId),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "FULL") {
      return NextResponse.json(
        { error: "That group is full.", code: "GROUP_FULL" },
        { status: 409 },
      );
    }
    if (reason === "TOO_MANY") {
      return NextResponse.json(
        {
          error: `You can be in ${MAX_GROUPS_PER_USER} groups at a time.`,
          code: "TOO_MANY_GROUPS",
        },
        { status: 409 },
      );
    }
    if (reason === "GONE") return refuse();
    log.error({ scope: "groups", event: "join_failed", uid, detail: reason });
    return NextResponse.json(
      { error: "Could not join that group.", code: "JOIN_FAILED" },
      { status: 500 },
    );
  }

  log.info({ scope: "groups", event: "joined", uid });
  return NextResponse.json({ groupId });
}

async function leaveGroup(uid: string, groupId: string) {
  if (!groupId || groupId.length > 64) {
    return NextResponse.json(
      { error: "Unknown group.", code: "UNKNOWN_GROUP" },
      { status: 400 },
    );
  }

  const db = adminDb();
  const groupRef = db.collection("studyGroups").doc(groupId);
  const profileRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const group = await tx.get(groupRef);

    // Always clear the profile side, even if the group is already gone. The
    // alternative is a student carrying a dead group id forever, which shows
    // up as a group they can neither open nor remove.
    tx.update(profileRef, {
      groupIds: FieldValue.arrayRemove(groupId),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (!group.exists) return;

    const members = (group.get("memberIds") as string[] | undefined) ?? [];
    const remaining = members.filter((id) => id !== uid);

    tx.delete(groupRef.collection("members").doc(uid));
    tx.delete(groupRef.collection("presence").doc(uid));

    if (remaining.length === 0) {
      // The last person out turns off the lights. An empty group is
      // unreachable by anyone, so leaving it behind is just litter.
      tx.delete(groupRef);
      return;
    }

    tx.update(groupRef, {
      memberIds: remaining,
      memberCount: remaining.length,
      // The group outlives its founder: handing ownership to whoever is left
      // beats stranding a group nobody can rename or tidy.
      ownerId: group.get("ownerId") === uid ? remaining[0] : group.get("ownerId"),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  log.info({ scope: "groups", event: "left", uid });
  return NextResponse.json({ left: true });
}
