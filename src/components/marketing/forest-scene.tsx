"use client";

/**
 * The hero's backdrop. The actual WebGL scene lives in `forest-scene-3d.tsx`
 * and is loaded through `next/dynamic` with `ssr: false` — a Canvas needs
 * `window`/`WebGLRenderingContext`, neither of which exist on the server, so
 * importing it directly (even inside a "use client" file) would still try to
 * construct it during the server render pass and crash.
 *
 * `useIsDesktop` below is what actually keeps this off phones — a CSS
 * `hidden md:block` on the wrapper only hides the result; React still
 * mounts `<ForestScene3D>`, which still triggers its dynamic import and
 * spins up a real WebGL context and render loop, off-screen, burning
 * battery and data for a frame nobody sees. Gating the render itself on a
 * `(min-width: 768px)` match means the chunk never even downloads on a
 * phone, which is the thing the CSS class alone only looked like it did.
 *
 * Tala renders here too, as a plain DOM sibling of the Canvas rather than
 * anything portaled into it — see `forest-scene-3d.tsx` for why, and for
 * `TalaProjector`, which is what actually moves her: this component only
 * owns the ref it writes into.
 */

import dynamic from "next/dynamic";
import { useRef, useSyncExternalStore } from "react";

import { PaperCreature } from "@/components/brand/paper-creature";

const ForestScene3D = dynamic(
  () => import("@/components/marketing/forest-scene-3d").then((m) => m.ForestScene3D),
  { ssr: false },
);

const DESKTOP_QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;
// The server cannot know the viewport; assuming mobile means the scene
// never flashes in for a frame then vanishes for a phone on first paint —
// the opposite assumption would be the more expensive mistake here, since
// mobile is the common case and "mounts, then unmounts" is exactly the
// wasted download this whole gate exists to avoid.
const getServerSnapshot = () => false;

function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function ForestScene() {
  const talaRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();

  if (!isDesktop) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-[640px] overflow-hidden bg-[#0d1612] lg:h-[720px]"
    >
      <ForestScene3D talaTarget={talaRef} />

      {/* Positioned off-screen until TalaProjector's first frame moves her
          onto the branch — otherwise she'd flash at the top-left corner for
          one frame on every load. will-change promises the browser this
          transform is about to move a lot, so it promotes to its own layer
          up front instead of on the first write. */}
      <div
        ref={talaRef}
        className="pointer-events-none absolute top-0 left-0 size-28 -translate-x-[200%] [will-change:transform]"
      >
        <PaperCreature state="idle" className="size-28 -scale-x-100" />
      </div>
    </div>
  );
}
