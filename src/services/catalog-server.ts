/**
 * Read-only access to editorial fixtures for server rendering of public pages
 * (ADR-0003). Live data (departures, edits made in the dashboard) is read in the browser.
 */
import type { Article, Destination, Testimonial, TourPackage } from "@/domain/entities"
import { ARTICLES } from "@/data/fixtures/articles"
import { DESTINATIONS } from "@/data/fixtures/destinations"
import { CATALOG_PACKAGES } from "@/data/fixtures/packages"
import { DEFAULT_PERSONA_ID, ROLES, TESTIMONIALS, USERS } from "@/data/fixtures/people"
import { SETTINGS, SITE_CONTENT } from "@/data/fixtures/site-content"
import type { PublicCatalog, PublicContent } from "./queries/catalog"

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z"
const stamp = { createdAt: FIXTURE_TIMESTAMP, updatedAt: FIXTURE_TIMESTAMP }

export function getSeedDestinations(): Destination[] {
  return DESTINATIONS.filter((d) => d.status === "published").map((d) => ({ ...d, ...stamp }))
}

export function getSeedCatalogPackages(): TourPackage[] {
  return CATALOG_PACKAGES.filter((p) => p.status === "published" && p.visibility === "catalog").map(({ costTemplate: _cost, ...p }) => ({
    ...p,
    ...stamp,
  }))
}

/** Card-level package: long-form detail emptied to keep the initial page payload small. */
function summarize(pkg: TourPackage): TourPackage {
  return {
    ...pkg,
    overview: [],
    itinerary: [],
    inclusions: [],
    exclusions: [],
    terms: [],
    faqs: [],
    requirements: { ...pkg.requirements, notes: [] },
  }
}

/**
 * Initial catalog for client islands. Only `fullPackageSlug` keeps its long-form content;
 * the browser database replaces everything with full records after hydration.
 */
export function getSeedCatalog({ fullPackageSlug }: { fullPackageSlug?: string } = {}): PublicCatalog {
  return {
    destinations: getSeedDestinations(),
    packages: getSeedCatalogPackages().map((pkg) => (pkg.slug === fullPackageSlug ? pkg : summarize(pkg))),
  }
}

/**
 * Published articles, newest first. Publish dates are relative to the visitor's seed, so
 * they are left out here and only shown once live data is available.
 */
export function getSeedArticles(): Article[] {
  return ARTICLES.filter((a) => a.status === "published")
    .sort((a, b) => (a.publishedDaysAgo ?? 0) - (b.publishedDaysAgo ?? 0))
    .map(({ publishedDaysAgo: _days, ...a }) => ({ ...a, ...stamp }))
}

export function getSeedTestimonials(): Testimonial[] {
  return TESTIMONIALS.filter((t) => t.status === "published").map(({ daysAgo: _days, ...t }) => ({ ...t, ...stamp }))
}

export function getSeedSiteContent() {
  return { ...SITE_CONTENT, updatedAt: FIXTURE_TIMESTAMP }
}

export function getSeedContent(): PublicContent {
  return { siteContent: getSeedSiteContent(), articles: getSeedArticles(), testimonials: getSeedTestimonials() }
}

export function getSeedSettings() {
  return SETTINGS
}

/** Team fixtures, used as the pre-hydration fallback for the persona switcher. */
export function getSeedTeam() {
  return { users: USERS, roles: ROLES, defaultPersonaId: DEFAULT_PERSONA_ID }
}
