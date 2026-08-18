/**
 * The canonical origin.
 *
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL on every deployment, including
 * previews — which is what you want here: a preview's sitemap and Open Graph
 * tags should point at production, not at the preview's own throwaway URL,
 * or a link shared from a preview would rot when it is torn down.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
