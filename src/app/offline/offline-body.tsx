"use client";

/**
 * The offline page's body, split out so the page itself can stay a server
 * component and keep its `metadata` export.
 *
 * Reading the catalogue here works with no network: the locale comes from the
 * localStorage mirror, and the messages ship with the bundle the service
 * worker already cached. A fallback page that only speaks English to someone
 * who has set the app to Filipino is the one screen where that would be most
 * conspicuous, because it is the screen you meet when something has gone
 * wrong.
 */

import Link from "next/link";
import { CloudOff } from "lucide-react";

import { TuonMark } from "@/components/brand/logo";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";

export function OfflineBody() {
  const { t } = useI18n();

  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="max-w-sm text-center">
        <TuonMark className="text-primary mx-auto size-9" />

        <div className="bg-secondary text-muted-foreground mx-auto mt-8 grid size-11 place-items-center rounded-xl">
          <CloudOff className="size-5" />
        </div>

        <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight">
          {t.offlinePage.title}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {t.offlinePage.body}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" render={<Link href="/app/review" />}>
            {t.offlinePage.goToReview}
          </Button>
          <Button variant="ghost" render={<Link href="/app" />}>
            {t.offlinePage.backToLibrary}
          </Button>
        </div>
      </div>
    </main>
  );
}
