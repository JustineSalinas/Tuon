import Link from "next/link";

import { Wordmark } from "@/components/brand/logo";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "#how", label: "How it works" },
      { href: "#try", label: "See it work" },
      { href: "#pricing", label: "Pricing" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/signup", label: "Create an account" },
      { href: "/login", label: "Sign in" },
      { href: "/app", label: "Open Tuón" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy notice" },
      { href: "/terms", label: "Terms of use" },
      { href: "mailto:hello@tuon.app", label: "Contact us" },
    ],
  },
];

/**
 * Site footer.
 *
 * The legal column is the point: a privacy notice and terms are obligations
 * here, not niceties, and a footer with nowhere to reach a human reads as
 * unfinished to exactly the person deciding whether to trust the product with
 * their coursework.
 */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Wordmark markClassName="size-5" />
            <p className="text-muted-foreground mt-3 max-w-xs text-sm leading-relaxed">
              Turn your class notes into flashcards and quizzes, then review
              them on a schedule that actually makes things stick.
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              Questions?{" "}
              <a
                href="mailto:hello@tuon.app"
                className="text-foreground underline underline-offset-4"
              >
                hello@tuon.app
              </a>
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading}>
              <h2 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                {column.heading}
              </h2>
              <ul className="mt-3.5 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith("#") || link.href.startsWith("mailto:") ? (
                      <a
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
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

        <div className="text-muted-foreground mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t pt-6 text-sm">
          <p>Made in the Philippines, for Filipino students.</p>
          <p>&copy; {new Date().getFullYear()} Tuón</p>
        </div>
      </div>
    </footer>
  );
}
