"use client";

import { Check, Languages } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { isReady, offeredLocales } from "@/lib/i18n/locales";
import { setStoredLocale } from "@/lib/i18n/locale-store";
import { cn } from "@/lib/utils";

/**
 * Language, in the footer.
 *
 * Writes straight to the mirror rather than going through the profile,
 * because the visitor reading this has no account yet — that is the whole
 * point of it being on the landing page. Once they sign in, the profile wins
 * and this choice is carried up into it by the provider.
 *
 * Each language is named IN ITSELF. Nobody scanning for their own language
 * looks for the English word for it, and a picker that says "Filipino" to
 * someone who reads Filipino is a picker written for the person who built it.
 *
 * An unreviewed draft is shown and MARKED rather than hidden, which is the
 * rule `locales.ts` sets and the reason it can be reviewed at all: the person
 * checking the Filipino has to read it inside the running app, on the screens
 * the words actually appear on. The marker is what stops anyone mistaking a
 * draft for finished.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const { t, locale } = useI18n();

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Languages className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only" id="locale-switch-label">
        {t.marketing.footer.language}
      </span>

      <div
        role="group"
        aria-labelledby="locale-switch-label"
        className="border-border flex items-center gap-0.5 rounded-full border p-0.5"
      >
        {offeredLocales().map((option) => {
          const active = option.id === locale;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setStoredLocale(option.id)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? <Check className="size-3" aria-hidden="true" /> : null}
              {option.label}
              {isReady(option.id) ? null : (
                <span
                  className={cn(
                    "rounded-sm px-1 py-px text-[10px] tracking-wide uppercase",
                    active ? "bg-primary-foreground/20" : "bg-secondary",
                  )}
                >
                  {t.marketing.footer.draft}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
