"use client";

import { TalaChat } from "@/components/companion/tala-chat";

/**
 * Tala's own screen.
 *
 * A route rather than a floating bubble on every page. A bubble would fight
 * the Pomodoro dock for the same corner, and this is a conversation somebody
 * sits down to have — it wants the width, and it wants a back button.
 */
export default function TalaPage() {
  return <TalaChat />;
}
