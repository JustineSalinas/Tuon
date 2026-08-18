import Link from "next/link";

import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/** Shared shell for the policy pages, so they read as one document set. */
export function LegalPage({
  title,
  updated,
  summary,
  children,
}: {
  title: string;
  updated: string;
  /** Plain-language précis. Nobody reads the clauses; make this carry it. */
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3.5 md:px-8">
        <Link href="/">
          <Wordmark />
        </Link>
        <Button variant="ghost" size="sm" render={<Link href="/" />}>
          Back to Tuón
        </Button>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 md:px-8 md:py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">Last updated {updated}</p>

        <div className="bg-accent/30 border-primary/30 mt-8 rounded-2xl border p-5">
          <h2 className="text-sm font-semibold">The short version</h2>
          <div className="text-ink mt-2 space-y-2 text-sm leading-relaxed [&_p]:m-0">
            {summary}
          </div>
        </div>

        <article
          className="mt-10 space-y-6 text-[15px] leading-relaxed
            [&_h2]:font-display [&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight
            [&_h3]:mt-6 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold
            [&_p]:text-foreground/85 [&_p]:m-0
            [&_ul]:m-0 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5
            [&_li]:text-foreground/85
            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4
            [&_strong]:font-semibold"
        >
          {children}
        </article>
      </main>

      <footer className="border-t px-4 py-6 md:px-8">
        <div className="text-muted-foreground mx-auto flex max-w-2xl flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <a href="mailto:hello@tuon.app" className="hover:text-foreground">
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}
