"use client";

import { Smartphone, TabletSmartphone } from "lucide-react";

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

function MacBookMini() {
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
      <span className="text-muted-foreground mt-4 text-xs">
        Stats on the library desktop
      </span>
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
  return (
    <div className="mt-12 md:mt-14">
      {/* 918px wide all in — the MacBook's base bar is 452, wider than its lid. */}
      <div className="h-[162px] overflow-hidden sm:h-[262px] lg:h-auto lg:overflow-visible">
        <div className="flex origin-top-left scale-[0.38] items-end gap-6 sm:scale-[0.62] lg:scale-100 lg:justify-center">
          <MacBookMini />
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
  return (
    <div className="border-border bg-card mt-12 flex flex-col gap-6 rounded-2xl border p-6 md:mt-14 md:flex-row md:items-center md:gap-8 md:p-7">
      <div className="min-w-0 flex-1">
        <span className="bg-accent text-accent-foreground inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-medium tracking-wider">
          IN THE WORKS
        </span>
        <h3 className="font-display mt-3 text-xl font-semibold tracking-tight">
          Native apps are coming to iPhone and Android
        </h3>
        <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-relaxed">
          Offline review and a home-screen icon, without giving up the web
          version. You do not have to wait for them — everything above works in
          your browser today.
        </p>
      </div>

      <div className="flex shrink-0 gap-2.5">
        <div className="border-border bg-background flex h-[52px] items-center gap-2.5 rounded-xl border px-4">
          <Smartphone className="text-muted-foreground size-5" strokeWidth={1.7} />
          <div>
            <p className="text-muted-foreground text-[10.5px] tracking-wider uppercase">
              Soon on
            </p>
            <p className="text-sm font-medium">iPhone</p>
          </div>
        </div>
        <div className="border-border bg-background flex h-[52px] items-center gap-2.5 rounded-xl border px-4">
          <TabletSmartphone className="text-muted-foreground size-5" strokeWidth={1.7} />
          <div>
            <p className="text-muted-foreground text-[10.5px] tracking-wider uppercase">
              Soon on
            </p>
            <p className="text-sm font-medium">Android</p>
          </div>
        </div>
      </div>
    </div>
  );
}
