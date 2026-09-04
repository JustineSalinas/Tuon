"use client";

import Link from "next/link";

import { Wordmark } from "@/components/brand/logo";
import { LocaleSwitch } from "@/components/marketing/locale-switch";
import { useI18n } from "@/components/providers/i18n-provider";

/**
 * Site footer.
 *
 * The legal column is the point: a privacy notice and terms are obligations
 * here, not niceties, and a footer with nowhere to reach a human reads as
 * unfinished to exactly the person deciding whether to trust the product with
 * their coursework.
 */
export function SiteFooter() {
  const { t } = useI18n();
  const f = t.marketing.footer;

  const columns = [
    {
      heading: f.product,
      links: [
        { href: "#how", label: t.marketing.nav.how },
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
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Wordmark markClassName="size-5" />
            <p className="text-muted-foreground mt-3 max-w-xs text-sm leading-relaxed">
              {f.blurb}
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              {f.questions}{" "}
              <a
                href="mailto:hello@tuon.app"
                className="text-foreground underline underline-offset-4"
              >
                hello@tuon.app
              </a>
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.heading}>
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

        <div className="mt-12 border-t pt-6">
          <LocaleSwitch />
          <div className="text-muted-foreground mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
            <p>{f.madeIn}</p>
            <p>{f.rights(new Date().getFullYear())}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
