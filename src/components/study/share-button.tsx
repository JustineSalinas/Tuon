"use client";

import { useState } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { Check, Copy, Globe, Link2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { PLANS, UPGRADE_TARGET, planCan } from "@/lib/ai/config";
import type { StudySet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ShareButton({ studySet }: { studySet: StudySet | null }) {
  const { user, profile } = useAuth();
  const plan = profile?.plan ?? "free";
  const allowed = planCan(plan, "canShare");
  const upgrade = PLANS[UPGRADE_TARGET];

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const isShared = Boolean(studySet?.isShared);
  const url =
    user && studySet
      ? `${typeof window === "undefined" ? "" : window.location.origin}/s/${user.uid}/${studySet.id}`
      : "";

  async function toggle(next: boolean) {
    if (!user || !studySet) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid, "studySets", studySet.id), {
        isShared: next,
      });
      toast.success(next ? "Link is live." : "Link revoked.");
    } catch {
      toast.error("Could not change sharing. Please try again.");
    }
    setSaving(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  }

  if (!allowed) {
    return (
      <Button
        variant="outline"
        size="sm"
        render={<Link href="/app/settings" />}
        title={`Sharing is part of ${upgrade.name}`}
      >
        <Lock />
        Share
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" disabled={!studySet}>
            {isShared ? <Globe /> : <Link2 />}
            Share
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this study set</DialogTitle>
          <DialogDescription>
            Anyone with the link can view the cards and save a copy. They cannot
            edit yours, and your review history stays private.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div>
            <div className="text-sm font-medium">
              {isShared ? "Anyone with the link" : "Only you"}
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {isShared
                ? "Turning this off breaks the link immediately."
                : "Turn on to create a shareable link."}
            </p>
          </div>
          <Switch
            checked={isShared}
            disabled={saving}
            onCheckedChange={(next) => void toggle(next)}
            aria-label="Share by link"
          />
        </div>

        {isShared ? (
          <div className="flex gap-2">
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" onClick={copy} aria-label="Copy link">
              {saving ? <Loader2 className="animate-spin" /> : copied ? <Check /> : <Copy />}
            </Button>
          </div>
        ) : null}

        <p className="text-muted-foreground text-xs leading-relaxed">
          The link is not listed or searchable anywhere — it only works for
          someone you send it to.
        </p>
      </DialogContent>
    </Dialog>
  );
}
