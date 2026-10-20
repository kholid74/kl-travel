import { diffDays, toDateOnlyWIB, type Timestamp } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import { SEED_VERSION } from "@/data/seed/build-seed"
import { getDataSource } from "@/repositories"

export const SEED_STALE_AFTER_DAYS = 14

export interface DemoStatus {
  seedAnchor: string
  ageDays: number
  stale: boolean
  outdated: boolean
}

export function demoStatus(db: DemoDatabase, now: Timestamp): DemoStatus {
  const ageDays = diffDays(toDateOnlyWIB(now), db.meta.seedAnchor)
  return {
    seedAnchor: db.meta.seedAnchor,
    ageDays,
    stale: ageDays > SEED_STALE_AFTER_DAYS,
    outdated: db.meta.seedVersion !== SEED_VERSION,
  }
}

/** Rebuilds the demo dataset relative to today. Irreversible for this browser. */
export function resetDemoData() {
  return getDataSource().reset()
}
