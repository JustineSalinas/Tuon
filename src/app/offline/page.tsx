import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff } from "lucide-react";

import { TuonMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/**
 * Served by the service worker when a navigation fails and nothing is cached.
 *
 * Only reached on a *first* visit to a page while offline — anything already
 * opened comes from the shell cache. So the job here is to explain which parts
 * still work rather than to apologise.
 */
export const metadata: Metadata = {
  title: "You are offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="max-w-sm text-center">
        <TuonMark className="text-primary mx-auto size-9" />

        <div className="bg-secondary text-muted-foreground mx-auto mt-8 grid size-11 place-items-center rounded-xl">
          <CloudOff className="size-5" />
        </div>

        <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight">
          This page needs a connection
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Your cards and their schedule are stored on this device, so reviewing
          still works. Anything you rate now is saved and syncs when you are
          back online.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" render={<Link href="/app/review" />}>
            Go to review
          </Button>
          <Button variant="ghost" render={<Link href="/app" />}>
            Back to my library
          </Button>
        </div>
      </div>
    </main>
  );
}
