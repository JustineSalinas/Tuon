"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

import { PaperCreature } from "@/components/brand/paper-creature";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Reports the failure, then offers a way out —
 * a dead end with no action is the worst thing to show someone mid-session.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        route: typeof window === "undefined" ? undefined : window.location.pathname,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm">
        <PaperCreature state="wrong" className="mx-auto size-28" />
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
          Something broke on our side
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Your notes and review history are safe — this page just failed to load.
          We have been told about it.
        </p>
        <div className="mt-7 flex flex-col gap-2">
          <Button onClick={reset}>
            <RotateCcw />
            Try again
          </Button>
          <Button variant="ghost" render={<Link href="/app" />}>
            Back to my sets
          </Button>
        </div>
      </div>
    </main>
  );
}
