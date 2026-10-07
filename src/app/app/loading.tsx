import { Preloader } from "@/components/brand/preloader";

/**
 * Next's route-level suspense fallback for everything under `/app`.
 *
 * Covers the gap `layout.tsx`'s own auth/profile settle does not: a slower
 * nested route (a big note, a long review queue) still streaming its data
 * in. Same mark, same motion, so a visitor never sees two different "the
 * app is thinking" treatments back to back.
 */
export default function AppLoading() {
  return <Preloader />;
}
