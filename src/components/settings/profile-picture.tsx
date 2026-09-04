"use client";

/**
 * Choosing a profile picture.
 *
 * Downscaled to a small square and stored on the profile as a data URL rather
 * than in Firebase Storage — see lib/profile/avatar for why that trade is the
 * right one here. The consequence worth knowing at this layer: the whole
 * pipeline runs in the browser, so a student on a slow connection uploads a
 * few kilobytes rather than the four-megabyte photo their phone produced.
 */

import { useRef, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  ACCEPTED_IMAGE_TYPES,
  checkFile,
  fileToAvatar,
  isUsableAvatar,
  type AvatarProblem,
} from "@/lib/profile/avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function ProfilePicture() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  /** Keyed by the problem the avatar pipeline reports. */
  const PROBLEM = {
    type: t.picture.type,
    "too-big": t.picture.tooBig,
    decode: t.picture.decode,
    encode: t.picture.encode,
  } as const;

  const photo = isUsableAvatar(profile?.photoURL) ? profile.photoURL : null;
  const name = profile?.displayName || user?.displayName || "Student";
  const initial = name.trim().charAt(0).toUpperCase() || "S";

  async function pick(file: File) {
    const problem = checkFile(file);
    if (problem) {
      toast.error(PROBLEM[problem]);
      return;
    }

    setBusy(true);
    try {
      const { dataUrl } = await fileToAvatar(file);
      if (!user) return;
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: dataUrl,
        updatedAt: serverTimestamp(),
      });
      toast.success(t.picture.updated);
    } catch (error) {
      const reason = (error instanceof Error ? error.message : "") as AvatarProblem;
      toast.error(
        reason === "decode" || reason === "encode"
          ? PROBLEM[reason]
          : t.picture.saveFailed,
      );
    }
    setBusy(false);
  }

  async function remove() {
    if (!user) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: null,
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error(t.picture.removeFailed);
    }
    setBusy(false);
  }

  return (
    <div>
      <p className="text-sm font-medium">{t.picture.title}</p>
      <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
        {t.picture.hint}
      </p>

      <div className="mt-3 flex items-center gap-4">
        <Avatar className="size-16">
          {photo ? <AvatarImage src={photo} alt="" /> : null}
          <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
            {initial}
          </AvatarFallback>
        </Avatar>

        <input
          ref={input}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pick(file);
            // Cleared so picking the same file twice still fires a change.
            e.target.value = "";
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Camera />}
            {photo ? t.settings.change : t.settings.upload}
          </Button>
          {photo ? (
            <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
              <Trash2 />
              {t.common.remove}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
