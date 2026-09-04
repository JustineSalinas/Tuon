import type { Metadata } from "next";

import { OfflineBody } from "./offline-body";

/**
 * Served by the service worker when a navigation fails and nothing is cached.
 *
 * Only reached on a *first* visit to a page while offline — anything already
 * opened comes from the shell cache. So the job here is to explain which parts
 * still work rather than to apologise.
 *
 * A server component so it can carry `metadata`; the words live in
 * `<OfflineBody>`, which reads them from the message catalogue.
 */
export const metadata: Metadata = {
  title: "You are offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return <OfflineBody />;
}
