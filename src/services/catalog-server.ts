/**
 * Read-only access to editorial fixtures for server rendering of public pages
 * (ADR-0003). Live data (departures, edits made in the dashboard) is read in the browser.
 */
import type { Destination, TourPackage } from "@/domain/entities"
import { DESTINATIONS } from "@/data/fixtures/destinations"
import { CATALOG_PACKAGES } from "@/data/fixtures/packages"
import { DEFAULT_PERSONA_ID, ROLES, USERS } from "@/data/fixtures/people"
import { SETTINGS, SITE_CONTENT } from "@/data/fixtures/site-content"

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z"

export function getSeedDestinations(): Destination[] {
  return DESTINATIONS.filter((d) => d.status === "published").map((d) => ({
    ...d,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
  }))
}

export function getSeedCatalogPackages(): TourPackage[] {
  return CATALOG_PACKAGES.filter((p) => p.status === "published" && p.visibility === "catalog").map(({ costTemplate: _cost, ...p }) => ({
    ...p,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
  }))
}

export function getSeedSiteContent() {
  return { ...SITE_CONTENT, updatedAt: FIXTURE_TIMESTAMP }
}

export function getSeedSettings() {
  return SETTINGS
}

/** Team fixtures, used as the pre-hydration fallback for the persona switcher. */
export function getSeedTeam() {
  return { users: USERS, roles: ROLES, defaultPersonaId: DEFAULT_PERSONA_ID }
}
