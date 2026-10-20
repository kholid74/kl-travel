import type { MetadataRoute } from "next"

/** Demonstration site with a fictional brand: no crawling. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } }
}
