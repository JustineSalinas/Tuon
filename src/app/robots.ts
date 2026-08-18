import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * Shared study sets under /s/ are unlisted by design — the link is the access
 * control. Letting a crawler index them would turn "unlisted" into "public and
 * searchable", which is not what a student agreed to when they sent a link to
 * one blockmate.
 *
 * /app and the auth screens are excluded because they are behind a session and
 * would only ever crawl as an empty shell.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/s/", "/login", "/signup", "/onboarding", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
