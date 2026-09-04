"use client";

import { useSyncExternalStore } from "react";
import { CloudOff } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";

/**
 * Tells the student the network is gone, and that it does not matter.
 *
 * Without this, offline review looks like a bug: ratings appear to save, the
 * due count moves, and a suspicious student reloads to "make sure" — which is
 * the one action that loses nothing but feels like it might. Naming the state
 * turns a worry into a feature.
 *
 * `navigator.onLine` only proves an interface is up, not that anything is
 * reachable, so this is deliberately framed as a hint rather than a verdict:
 * it says what still works, never "you are disconnected".
 *
 * useSyncExternalStore rather than an effect: this is external browser state,
 * and reading it with setState-in-effect both trips React 19's cascading
 * render rule and flashes the wrong value on first paint.
 */

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getSnapshot = () => navigator.onLine;
// The server cannot know, and claiming "offline" in the HTML would flash the
// banner for everyone on first paint.
const getServerSnapshot = () => true;

export function OfflineIndicator() {
  const { t } = useI18n();
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const offline = !online;

  if (!offline) return null;

  return (
    <div
      role="status"
      className="bg-secondary text-secondary-foreground flex items-center gap-2.5 border-b px-4 py-2 text-sm md:px-8"
    >
      <CloudOff className="text-muted-foreground size-4 shrink-0" />
      <p className="min-w-0">
        {t.banners.offline}{" "}
        <span className="text-muted-foreground">{t.banners.offlineRest}</span>
      </p>
    </div>
  );
}
