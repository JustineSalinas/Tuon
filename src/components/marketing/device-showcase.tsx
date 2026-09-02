"use client";

/**
 * Scaled-down device silhouettes for the landing page.
 *
 * Deliberately abstract — bars and blocks rather than legible screenshots.
 * A shrunk real screenshot is unreadable at this size and dates the moment
 * any screen changes; the shapes carry "it fits your desk, your bag, your
 * pocket" without pretending to be a product tour.
 *
 * Hardware only: bezels, the Dynamic Island and the hinge are drawn because
 * they are physical. No painted status bar — a fake one reads as doubled-up
 * against the real thing.
 */

import { useI18n } from "@/components/providers/i18n-provider";

/**
 * Platform marks for the "soon on" pills.
 *
 * These are nominative use — naming the platform an app is headed for — and
 * NOT reproductions of the official "Download on the App Store" / "Get it on
 * Google Play" badges, which are locked artwork you may only use to link to a
 * live listing.
 *
 * BEFORE LAUNCH, replace these with the real badge assets from Apple's and
 * Google's identity guideline pages. Both require their supplied artwork used
 * unmodified; a hand-drawn approximation breaks the guidelines more surely
 * than shipping no badge at all. These exist so the layout is right today.
 */
function AppleLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.36 12.72c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.77 2.28-1.61 2.79-.41 6.92 1.15 9.19.76 1.11 1.67 2.35 2.86 2.31 1.15-.05 1.58-.74 2.97-.74 1.39 0 1.78.74 2.99.72 1.24-.02 2.02-1.13 2.78-2.24.87-1.29 1.23-2.54 1.25-2.6-.03-.01-2.39-.92-2.41-3.64zM14.1 5.98c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.68 1.37-.59.68-1.1 1.77-.96 2.81 1.02.08 2.06-.52 2.7-1.28z" />
    </svg>
  );
}

/** Google Play's four-colour triangle. */
function PlayStoreLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M3.6 2.4a1.2 1.2 0 0 0-.5 1v17.2c0 .42.2.79.5 1l9.06-9.6L3.6 2.4z" fill="#34A853" />
      <path d="M16.9 8.55 13.5 6.6 3.6 2.4a1.2 1.2 0 0 0-.14-.06l9.2 9.66 4.24-3.45z" fill="#4285F4" />
      <path d="m12.66 12 -9.2 9.66c.05-.02.1-.04.14-.06l9.9-4.2 3.4-1.95L12.66 12z" fill="#EA4335" />
      <path d="m16.9 8.55-4.24 3.45 4.24 3.45 3.4-1.95a1.2 1.2 0 0 0 0-3l-3.4-1.95z" fill="#FBBC04" />
    </svg>
  );
}

function MacBookMini({ caption }: { caption: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="w-[420px] rounded-t-[9px] rounded-b-[2px] bg-gradient-to-br from-neutral-600 via-neutral-800 to-neutral-700 p-1.5 pb-2.5">
        <div className="bg-background flex h-[255px] w-[408px] overflow-hidden rounded-[4px]">
          <div className="bg-sidebar border-border flex w-[74px] flex-col gap-1.5 border-r p-2.5">
            <div className="border-primary size-[15px] rounded-full border-2" />
            <div className="bg-border mt-1.5 h-[7px] rounded-sm" />
            <div className="bg-accent h-[7px] rounded-sm" />
            <div className="bg-border h-[7px] rounded-sm" />
            <div className="bg-border h-[7px] rounded-sm" />
          </div>
          <div className="flex-1 p-3.5">
            <div className="bg-foreground/75 h-[9px] w-[58%] rounded-sm" />
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border-border bg-card h-[34px] rounded-[5px] border" />
              ))}
            </div>
            <div className="border-border bg-card mt-3 flex h-[108px] items-end gap-1 rounded-md border p-2.5">
              {[74, 48, 30, 57, 22, 40, 16, 34].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={
                    "flex-1 rounded-t-[2px] " +
                    (i === 0 ? "bg-seq-4" : i === 1 ? "bg-seq-3" : "bg-seq-1")
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="h-[7px] w-[452px] rounded-b-md bg-gradient-to-b from-neutral-600 to-neutral-700" />
      <span className="text-muted-foreground mt-4 text-xs">{caption}</span>
    </div>
  );
}

function IPadMini() {
  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="w-[250px] rounded-2xl bg-gradient-to-br from-neutral-600 via-neutral-800 to-neutral-700 p-[9px]">
        <div className="bg-background h-[300px] w-[232px] overflow-hidden rounded-md p-3.5">
          <div className="bg-foreground/75 h-2.5 w-[62%] rounded-sm" />
          <div className="mt-3.5 flex flex-col gap-1.5">
            <div className="bg-border h-1.5 rounded-sm" />
            <div className="bg-border h-1.5 rounded-sm" />
            <div className="bg-primary/55 h-1.5 w-[74%] rounded-sm" />
            <div className="bg-border h-1.5 rounded-sm" />
            <div className="bg-border h-1.5 w-[86%] rounded-sm" />
          </div>
          <div className="mt-[18px] flex flex-col gap-1.5">
            <div className="border-border bg-card h-[30px] rounded-md border" />
            <div className="border-border bg-card h-[30px] rounded-md border" />
            <div className="border-border h-[30px] rounded-md border border-dashed" />
          </div>
        </div>
      </div>
      <span className="text-muted-foreground mt-4 text-xs">Notes and their links</span>
    </div>
  );
}

function IPhoneMini() {
  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="w-[168px] rounded-3xl bg-gradient-to-br from-neutral-600 via-neutral-800 to-neutral-700 p-1.5">
        <div className="bg-background relative h-[328px] w-[156px] overflow-hidden rounded-[19px] px-3 pt-[26px] pb-3">
          {/* Dynamic Island — hardware, so it is drawn. */}
          <div className="absolute top-1.5 left-1/2 h-[15px] w-[52px] -translate-x-1/2 rounded-[9px] bg-neutral-950" />
          <div className="border-border bg-card flex h-[190px] flex-col rounded-[10px] border p-3">
            <div className="bg-border h-[5px] w-[40%] rounded-sm" />
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="bg-foreground/70 h-[7px] rounded-sm" />
              <div className="bg-foreground/70 h-[7px] w-[80%] rounded-sm" />
            </div>
            <div className="bg-border my-3 h-px" />
            <div className="flex flex-col gap-1">
              <div className="bg-border h-[5px] rounded-sm" />
              <div className="bg-border h-[5px] w-[66%] rounded-sm" />
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-1">
            <div className="border-border h-[26px] rounded-md border" />
            <div className="border-border h-[26px] rounded-md border" />
            <div className="bg-success h-[26px] rounded-md" />
            <div className="border-border h-[26px] rounded-md border" />
          </div>
        </div>
      </div>
      <span className="text-muted-foreground mt-4 text-xs">Reviewing on the jeep</span>
    </div>
  );
}

/**
 * The lineup is ~886px of fixed-width hardware, which no phone fits.
 *
 * Scaling it down beats letting it scroll: a centred overflow lands the
 * visitor on the middle of a half-cropped MacBook, which reads as broken
 * rather than as a carousel. The wrapper's clamped height absorbs the space a
 * transform would otherwise leave behind, since `scale` does not affect layout.
 */
export function DeviceLineup() {
  const { t } = useI18n();

  return (
    <div className="mt-12 md:mt-14">
      {/* 918px wide all in — the MacBook's base bar is 452, wider than its lid. */}
      <div className="h-[162px] overflow-hidden sm:h-[262px] lg:h-auto lg:overflow-visible">
        <div className="flex origin-top-left scale-[0.38] items-end gap-6 sm:scale-[0.62] lg:scale-100 lg:justify-center">
          <MacBookMini caption={t.marketing.devices.desktopCaption} />
          <IPadMini />
          <IPhoneMini />
        </div>
      </div>
    </div>
  );
}

/**
 * Native-app notice.
 *
 * Says "in the works" rather than a date, and says plainly that nobody has to
 * wait — a store badge for an app that does not exist yet is a promise you
 * have to keep. These are our own pills, not the App Store and Google Play
 * badges: those are trademarked artwork with usage rules, and imitating them
 * before a listing exists invites exactly the complaint you do not want.
 */
export function NativeAppsNotice() {
  const { t } = useI18n();

  return (
    <div className="border-border bg-card mt-12 flex flex-col gap-6 rounded-2xl border p-6 md:mt-14 md:flex-row md:items-center md:gap-8 md:p-7">
      <div className="min-w-0 flex-1">
        <span className="bg-accent text-accent-foreground inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-medium tracking-wider">
          {t.marketing.devices.inTheWorks}
        </span>
        <h3 className="font-display mt-3 text-xl font-semibold tracking-tight">
          {t.marketing.devices.nativeTitle}
        </h3>
        <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-relaxed">
          {t.marketing.devices.nativeBody}
        </p>
      </div>

      <div className="flex shrink-0 gap-2.5">
        <div className="border-border bg-background flex h-[52px] items-center gap-2.5 rounded-xl border px-4">
          <AppleLogo />
          <div>
            <p className="text-muted-foreground text-[10.5px] tracking-wider uppercase">
              Soon on
            </p>
            <p className="text-sm font-medium">App Store</p>
          </div>
        </div>
        <div className="border-border bg-background flex h-[52px] items-center gap-2.5 rounded-xl border px-4">
          <PlayStoreLogo />
          <div>
            <p className="text-muted-foreground text-[10.5px] tracking-wider uppercase">
              Soon on
            </p>
            <p className="text-sm font-medium">Google Play</p>
          </div>
        </div>
      </div>
    </div>
  );
}
