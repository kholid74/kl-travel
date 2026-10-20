import { describe, expect, it } from "vitest"
import { addHours } from "@/lib/dates"
import { buildSeed } from "@/data/seed/build-seed"
import { validateDatabase } from "@/domain/rules/validate-database"
import { findSystemWork, runSystemJobs } from "@/services/system-jobs"
import { DB_STORAGE_KEY, LocalDatabase } from "./local-database"
import { createMemoryStorage } from "./storage"

const NOW = "2026-10-20T03:00:00.000Z"
const clockAt = (iso: string) => ({ now: () => new Date(iso) })

describe("LocalDatabase", () => {
  it("seeds an empty browser and restores on the next load", () => {
    const storage = createMemoryStorage()
    const first = new LocalDatabase({ storage, clock: clockAt(NOW) }).load()
    expect(first.notices).toEqual(["seeded", "memory_only"])
    expect(storage.read(DB_STORAGE_KEY)).not.toBeNull()

    const second = new LocalDatabase({ storage, clock: clockAt(addHours(NOW, 5)) }).load()
    expect(second.notices).toContain("restored")
    expect(second.db.meta.seededAt).toBe(first.db.meta.seededAt)
  })

  it("replaces corrupt or unknown documents with a fresh seed", () => {
    const corrupt = new LocalDatabase({ storage: createMemoryStorage({ [DB_STORAGE_KEY]: "{not json" }), clock: clockAt(NOW) }).load()
    expect(corrupt.notices).toContain("reset_corrupt")
    const future = JSON.stringify({ meta: { schemaVersion: 99 } })
    const unknown = new LocalDatabase({ storage: createMemoryStorage({ [DB_STORAGE_KEY]: future }), clock: clockAt(NOW) }).load()
    expect(unknown.notices).toContain("reset_corrupt")
  })

  it("commits transactions on top of the latest stored document", () => {
    const storage = createMemoryStorage()
    const tabA = new LocalDatabase({ storage, clock: clockAt(NOW) })
    const tabB = new LocalDatabase({ storage, clock: clockAt(NOW) })
    tabA.load()
    tabB.load()

    tabB.transaction((uow) => {
      const content = uow.siteContent.get()
      uow.siteContent.set({ ...content, promoBanner: { ...content.promoBanner, enabled: true } })
    })
    const versions: number[] = []
    tabA.subscribe((state) => versions.push(state.version))
    tabA.transaction((uow) => {
      const pkg = uow.packages.require("pkg_blt_east_retreat_3h2m")
      uow.packages.update(pkg.id, { status: "published" })
    })

    const stored = JSON.parse(storage.read(DB_STORAGE_KEY)!)
    expect(stored.siteContent.promoBanner.enabled).toBe(true) // tab B's change survived tab A's write
    expect(stored.packages.pkg_blt_east_retreat_3h2m.status).toBe("published")
    expect(versions).toHaveLength(1)
  })

  it("does not persist when a transaction throws", () => {
    const storage = createMemoryStorage()
    const db = new LocalDatabase({ storage, clock: clockAt(NOW) })
    db.load()
    const before = storage.read(DB_STORAGE_KEY)
    expect(() =>
      db.transaction((uow) => {
        uow.packages.update("pkg_lbj_sailing_3h2m", { title: "Diubah" })
        uow.bookings.require("tidak-ada")
      }),
    ).toThrow()
    expect(storage.read(DB_STORAGE_KEY)).toBe(before)
  })

  it("resets to a seed anchored on the current day", () => {
    const storage = createMemoryStorage()
    const later = addHours(NOW, 24 * 20)
    const db = new LocalDatabase({ storage, clock: clockAt(later) })
    storage.write(DB_STORAGE_KEY, JSON.stringify(buildSeed(NOW)))
    expect(db.load().db.meta.seedAnchor).toBe("2026-10-20")
    expect(db.reset().db.meta.seedAnchor).toBe("2026-11-09")
  })
})

describe("system jobs", () => {
  it("expires holds and completes finished trips, idempotently and consistently", () => {
    const storage = createMemoryStorage()
    const later = new Date(addHours(NOW, 72))
    const db = new LocalDatabase({ storage, clock: { now: () => later } })
    storage.write(DB_STORAGE_KEY, JSON.stringify(buildSeed(NOW)))
    db.load()

    const planned = findSystemWork(db.current().db, later.toISOString())
    expect(planned.expireHolds.length).toBeGreaterThan(0)
    expect(planned.completeBookings.length).toBeGreaterThan(0)

    const done = runSystemJobs(db, later)
    expect(done).toEqual(planned)
    const after = db.current().db
    for (const id of planned.expireHolds) expect(after.bookings[id].cancellation?.reason).toBe("hold_expired")
    for (const id of planned.completeBookings) expect(after.bookings[id].status).toBe("completed")
    expect(validateDatabase(after, later.toISOString())).toEqual([])

    expect(findSystemWork(after, later.toISOString())).toEqual({ expireHolds: [], completeBookings: [] })
  })
})
