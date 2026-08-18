"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getAppCheckToken } from "@/lib/firebase/client";
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

const REASONS = [
  { value: "not-study-material", label: "Not study material" },
  { value: "harassment", label: "Bullying or harassment" },
  { value: "copyright", label: "Copied from a book or paid course" },
  { value: "personal-information", label: "Contains someone's personal details" },
  { value: "other", label: "Something else" },
] as const;

/**
 * Reporting a shared set.
 *
 * Sits on the public page and needs no account — the person best placed to
 * notice a problem is usually the blockmate who was sent the link, not a user.
 */
export function ReportButton({ userId, setId }: { userId: string; setId: string }) {
  const [open, setOpen] = useState(false);
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
      toast.success("Thanks — we'll take a look.");
    } catch {
      toast.error("Could not send that report. Please try again.");
    }
    setSending(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag />
            Report
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this study set</DialogTitle>
          <DialogDescription>
            Tell us what&rsquo;s wrong with it. We read every report; we
            don&rsquo;t act on them automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            {REASONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setReason(option.value)}
                aria-pressed={reason === option.value}
                className={cn(
                  "rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors",
                  "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
                  reason === option.value
                    ? "border-primary bg-accent/60"
                    : "border-border hover:border-primary/50 hover:bg-accent/30",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-detail">Anything else? (optional)</Label>
            <Textarea
              id="report-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="What should we look at?"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost" disabled={sending}>
                Cancel
              </Button>
            }
          />
          <Button onClick={submit} disabled={!reason || sending}>
            {sending ? <Loader2 className="animate-spin" /> : <Flag />}
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
