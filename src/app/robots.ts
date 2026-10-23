import type { MetadataRoute } from "next"

/**
 * Demonstration site with a fictional brand. Crawling stays allowed on purpose: noindex (the
 * robots metadata and the X-Robots-Tag header in next.config.ts) only works on pages a search
 * engine may fetch. A robots.txt block would hide it, and a linked URL could still be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" } }
}
