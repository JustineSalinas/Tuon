"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getAppCheckToken } from "@/lib/firebase/client";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The reasons, as the values the API stores.
 *
 * Their labels live in the message catalogue keyed by the same value — the
 * stored reason must never change with the reader\'s language.
 */
const REASONS = [
  "not-study-material",
  "harassment",
  "copyright",
  "personal-information",
  "other",
] as const;

/**
 * Reporting a shared set.
 *
 * Sits on the public page and needs no account — the person best placed to
 * notice a problem is usually the blockmate who was sent the link, not a user.
 */
export function ReportButton({ userId, setId }: { userId: string; setId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const LABELS: Record<(typeof REASONS)[number], string> = {
    "not-study-material": t.report.notStudyMaterial,
    harassment: t.report.harassment,
    copyright: t.report.copyright,
    "personal-information": t.report.personalInformation,
    other: t.report.other,
  };
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!reason) return;
    setSending(true);
    try {
      const appCheckToken = await getAppCheckToken();
      const response = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
        },
        body: JSON.stringify({ userId, setId, reason, detail: detail.trim() || null }),
      });
      if (!response.ok) throw new Error("failed");

      setOpen(false);
      setReason(null);
      setDetail("");
      toast.success(t.report.thanks);
    } catch {
      toast.error(t.report.failed);
    }
    setSending(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag />
            {t.report.action}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.report.title}</DialogTitle>
          <DialogDescription>{t.report.body}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            {REASONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setReason(value)}
                aria-pressed={reason === value}
                className={cn(
                  "rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors",
                  "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
                  reason === value
                    ? "border-primary bg-accent/60"
                    : "border-border hover:border-primary/50 hover:bg-accent/30",
                )}
              >
                {LABELS[value]}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-detail">{t.report.anythingElse}</Label>
            <Textarea
              id="report-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder={t.report.detailPlaceholder}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost" disabled={sending}>
                {t.common.cancel}
              </Button>
            }
          />
          <Button onClick={submit} disabled={!reason || sending}>
            {sending ? <Loader2 className="animate-spin" /> : <Flag />}
            {t.report.send}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
