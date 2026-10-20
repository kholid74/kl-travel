import type { DemoDatabase } from "@/domain/database"
import { SCHEMA_VERSION } from "@/data/seed/build-seed"

/**
 * Upgrades from version N to N+1. Add an entry whenever the shape of DemoDatabase changes,
 * and bump SCHEMA_VERSION in data/seed/build-seed.ts.
 */
const MIGRATIONS: Record<number, (db: Record<string, unknown>) => Record<string, unknown>> = {}

export type MigrationResult = { db: DemoDatabase; migrated: boolean } | { db: null; reason: "unknown_version" | "invalid" }

export function migrate(raw: unknown): MigrationResult {
  if (!raw || typeof raw !== "object") return { db: null, reason: "invalid" }
  let doc = raw as Record<string, unknown> & { meta?: { schemaVersion?: number } }
  const from = doc.meta?.schemaVersion
  if (typeof from !== "number" || from > SCHEMA_VERSION) return { db: null, reason: "unknown_version" }

  let version = from
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version]
    if (!step) return { db: null, reason: "unknown_version" }
    doc = step(doc) as typeof doc
    version += 1
    ;(doc.meta as { schemaVersion: number }).schemaVersion = version
  }
  if (!isDatabaseShape(doc)) return { db: null, reason: "invalid" }
  return { db: doc as unknown as DemoDatabase, migrated: version !== from }
}

function isDatabaseShape(doc: Record<string, unknown>): boolean {
  const required = ["meta", "packages", "departures", "bookings", "customers", "siteContent", "settings"]
  return required.every((key) => doc[key] && typeof doc[key] === "object")
}
