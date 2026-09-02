"use client";

import { useState } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { Check, Copy, Globe, Link2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
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
  const { t } = useI18n();
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
      toast.success(next ? t.share.live : t.share.revoked);
    } catch {
      toast.error(t.share.changeFailed);
    }
    setSaving(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t.share.copyFailed);
    }
  }

  if (!allowed) {
    return (
      <Button
        variant="outline"
        size="sm"
        render={<Link href="/app/settings" />}
        title={t.share.lockedTitle(upgrade.name)}
      >
        <Lock />
        {t.share.action}
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" disabled={!studySet}>
            {isShared ? <Globe /> : <Link2 />}
            {t.share.action}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.share.title}</DialogTitle>
          <DialogDescription>
            {t.share.body}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div>
            <div className="text-sm font-medium">
              {isShared ? t.share.anyoneWithLink : t.share.onlyYou}
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {isShared ? t.share.turningOff : t.share.turnOn}
            </p>
          </div>
          <Switch
            checked={isShared}
            disabled={saving}
            onCheckedChange={(next) => void toggle(next)}
            aria-label={t.share.toggleLabel}
          />
        </div>

        {isShared ? (
          <div className="flex gap-2">
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" onClick={copy} aria-label={t.share.copyLink}>
              {saving ? <Loader2 className="animate-spin" /> : copied ? <Check /> : <Copy />}
            </Button>
          </div>
        ) : null}

        <p className="text-muted-foreground text-xs leading-relaxed">
          {t.share.unlistedNote}
        </p>
      </DialogContent>
    </Dialog>
  );
}
