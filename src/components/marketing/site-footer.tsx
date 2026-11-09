"use client";

import Link from "next/link";

import { PaperCreature } from "@/components/brand/paper-creature";
import { TuonMark, Wordmark } from "@/components/brand/logo";
import { LocaleSwitch } from "@/components/marketing/locale-switch";
import { useI18n } from "@/components/providers/i18n-provider";

/**
 * Site footer.
 *
 * The legal column is the point: a privacy notice and terms are obligations
 * here, not niceties, and a footer with nowhere to reach a human reads as
 * unfinished to exactly the person deciding whether to trust the product with
 * their coursework.
 *
 * Structured as a brand card beside the link columns rather than four equal
 * columns of grey text — the shape every template footer takes. The torn top
 * edge and paper grain are the one place on the page that gets to look like
 * an actual sheet of notebook paper, the thing the brand is named for.
 */
export function SiteFooter() {
  const { t } = useI18n();
  const f = t.marketing.footer;

  const columns = [
    {
      heading: f.product,
      links: [
        { href: "#pricing", label: t.marketing.nav.pricing },
        { href: "#faq", label: t.marketing.nav.faq },
      ],
    },
    {
      heading: f.account,
      links: [
        { href: "/signup", label: f.createAccount },
        { href: "/login", label: t.marketing.nav.signIn },
        { href: "/app", label: f.openTuon },
      ],
    },
    {
      heading: f.legal,
      links: [
        { href: "/privacy", label: f.privacy },
        { href: "/terms", label: f.terms },
        { href: "mailto:hello@tuon.app", label: f.contact },
      ],
    },
  ];

  return (
    <footer className="relative">
      {/* A torn edge rather than a ruled line — the one place the page gets
          to look like a sheet of paper, which is what the name means. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 8"
        preserveAspectRatio="none"
        className="text-background block h-2 w-full"
      >
        <path
          d="M0,8 L0,3 L8,1 L16,4 L25,0 L34,3 L43,1 L52,4 L61,2 L70,5 L79,1 L88,3 L97,0 L106,4 L115,2 L124,5 L133,1 L142,3 L151,0 L160,4 L169,2 L178,5 L187,1 L196,3 L205,0 L214,4 L223,2 L232,5 L241,1 L250,3 L259,0 L268,4 L277,2 L286,5 L295,1 L304,3 L313,0 L322,4 L331,2 L340,5 L349,1 L358,3 L367,0 L376,4 L385,2 L394,5 L400,2 L400,8 Z"
          fill="currentColor"
        />
      </svg>

      <div className="paper-grain bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-10 md:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
            {/* The brand block, as its own raised card — not a fourth column
                of grey links, the one place here that gets to be warm. */}
            <div className="neu-raised-sm relative overflow-hidden rounded-2xl p-6">
              <TuonMark className="text-primary/10 absolute -right-4 -bottom-6 size-32" />
              <div className="relative">
                <Wordmark markClassName="size-5" />
                <p className="text-muted-foreground mt-3 max-w-xs text-sm leading-relaxed">
                  {f.blurb}
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <PaperCreature state="idle" className="size-10 shrink-0" />
                  <p className="text-sm">
                    {f.questions}{" "}
                    <a
                      href="mailto:hello@tuon.app"
                      className="text-primary font-medium underline underline-offset-4"
                    >
                      hello@tuon.app
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {columns.map((column) => (
              <nav key={column.heading} className="px-1">
                <h2 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                  {column.heading}
                </h2>
                <ul className="mt-3.5 space-y-1 sm:space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      {link.href.startsWith("#") || link.href.startsWith("mailto:") ? (
                        <a
                          href={link.href}
                          className="text-muted-foreground hover:text-foreground block py-2 text-sm transition-colors sm:py-0"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-muted-foreground hover:text-foreground block py-2 text-sm transition-colors sm:py-0"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="border-border/70 mt-10 flex flex-col gap-5 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <LocaleSwitch />
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <p>{f.madeIn}</p>
              <p>{f.rights(new Date().getFullYear())}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
