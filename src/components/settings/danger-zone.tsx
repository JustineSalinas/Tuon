"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";
import { AlertTriangle, Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
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
import { Separator } from "@/components/ui/separator";

/**
 * The two rights that have to be exercisable from inside the product, not by
 * emailing support: portability and erasure.
 */
export function DataAndAccount() {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold tracking-tight">Your data</h2>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        Everything here is yours. See the{" "}
        <Link href="/privacy" className="text-primary underline underline-offset-4">
          Privacy Notice
        </Link>{" "}
        for what we hold and why.
      </p>

      <div className="mt-4 space-y-4">
        <ExportRow />
        <Separator />
        <DeleteRow />
      </div>
    </section>
  );
}

function ExportRow() {
  const { authedFetch } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      const response = await authedFetch("/api/account/export");
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Export failed.");
      }

      // The route streams JSON rather than a URL, so the download is built
      // here from the blob.
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `tuon-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);

      toast.success("Your data has been downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Download your data</p>
        <p className="text-muted-foreground text-sm">
          Profile, notes, study sets, and review history as one JSON file.
        </p>
      </div>
      <Button variant="outline" onClick={handleExport} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Download />}
        Download
      </Button>
    </div>
  );
}

function DeleteRow() {
  const router = useRouter();
  const { user, authedFetch, signOut, beginAccountDeletion } = useAuth();

  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google accounts re-authenticate through the popup; email accounts need
  // their password. Both mint a fresh token, which the server insists on.
  const usesPassword =
    user?.providerData.some((p) => p.providerId === "password") ?? false;

  async function handleDelete() {
    const current = auth.currentUser;
    if (!current) return;

    setBusy(true);
    setError(null);
    try {
      if (usesPassword) {
        if (!current.email) throw new Error("This account has no email address.");
        await reauthenticateWithCredential(
          current,
          EmailAuthProvider.credential(current.email, password),
        );
      } else {
        await reauthenticateWithPopup(current, new GoogleAuthProvider());
      }

      // Stops the profile listener bootstrapping a replacement the moment
      // the document disappears.
      beginAccountDeletion();

      const response = await authedFetch("/api/account/delete", {
        method: "POST",
        body: JSON.stringify({ confirm: confirmation.trim() }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Could not delete your account.");
      }

      // The auth user is gone server-side; clear the local session so the app
      // does not sit on a token for an account that no longer exists.
      await signOut().catch(() => {});
      router.replace("/");
      toast.success("Your account and all of its data have been deleted.");
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("auth/wrong-password")
          ? "That password is not correct."
          : err instanceof Error
            ? err.message
            : "Could not delete your account.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Delete your account</p>
        <p className="text-muted-foreground text-sm">
          Removes your notes, study sets, and review history. Not reversible.
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant="outline" className="text-destructive border-destructive/40">
              <Trash2 />
              Delete
            </Button>
          }
        />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive size-5" />
              Delete your account
            </DialogTitle>
            <DialogDescription>
              This deletes your profile, every note, every study set, and your
              whole review history. It cannot be undone, and your spaced
              repetition progress cannot be rebuilt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Download your data first if you want to keep it.
            </p>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                Type <span className="text-foreground font-medium">DELETE</span> to
                confirm
              </Label>
              <Input
                id="confirm-delete"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>

            {usesPassword ? (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Your password</Label>
                <PasswordInput
                  id="confirm-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                You will be asked to sign in with Google once more to confirm.
              </p>
            )}

            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button variant="ghost" disabled={busy}>
                  Cancel
                </Button>
              }
            />
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                busy || confirmation.trim() !== "DELETE" || (usesPassword && !password)
              }
            >
              {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
