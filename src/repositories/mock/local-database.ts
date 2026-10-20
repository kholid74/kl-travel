import { systemClock, type Clock } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import { buildSeed, SEED_VERSION } from "@/data/seed/build-seed"
import type { DataNotice, DataSource, DataSourceState, UnitOfWork } from "../interfaces"
import { migrate } from "./migrations"
import type { StorageAdapter } from "./storage"
import { createUnitOfWork } from "./unit-of-work"

export const DB_STORAGE_KEY = "nusavista-demo:db"

interface Options {
  storage: StorageAdapter
  clock?: Clock
  seed?: (now: Date) => DemoDatabase
  /** Hook for runtime validation in development. */
  afterCommit?: (db: DemoDatabase) => void
}

/**
 * Browser-local implementation of DataSource (ADR-0001).
 * Every transaction re-reads the latest stored document, so two tabs never overwrite each
 * other's newer data; other tabs are notified through the `storage` event.
 */
export class LocalDatabase implements DataSource {
  private state: DataSourceState | null = null
  private listeners = new Set<(state: DataSourceState) => void>()
  private readonly storage: StorageAdapter
  private readonly clock: Clock
  private readonly seed: (now: Date) => DemoDatabase
  private readonly afterCommit?: (db: DemoDatabase) => void
  private detachStorageListener?: () => void

  constructor(options: Options) {
    this.storage = options.storage
    this.clock = options.clock ?? systemClock
    this.seed = options.seed ?? ((now) => buildSeed(now))
    this.afterCommit = options.afterCommit
  }

  load(): DataSourceState {
    if (this.state) return this.state
    const notices: DataNotice[] = []
    const { db, notice } = this.readStored()
    let current = db
    if (!current) {
      current = this.seed(this.clock.now())
      this.persist(current)
      notices.push(notice === "corrupt" ? "reset_corrupt" : "seeded")
    } else {
      notices.push(notice === "migrated" ? "migrated" : "restored")
      if (current.meta.seedVersion !== SEED_VERSION) notices.push("seed_outdated")
    }
    if (!this.storage.persistent) notices.push("memory_only")
    this.state = { db: current, version: 1, persistent: this.storage.persistent, notices }
    this.attachStorageListener()
    return this.state
  }

  current(): DataSourceState {
    return this.state ?? this.load()
  }

  subscribe(listener: (state: DataSourceState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  transaction<T>(work: (uow: UnitOfWork) => T): T {
    const base = this.readStored().db ?? this.current().db
    const draft = structuredClone(base)
    const result = work(createUnitOfWork(draft, this.clock.now().toISOString()))
    if (result instanceof Promise) throw new Error("Transactions must be synchronous")
    this.persist(draft)
    this.afterCommit?.(draft)
    this.publish(draft, [])
    return result
  }

  reset(): DataSourceState {
    const fresh = this.seed(this.clock.now())
    this.persist(fresh)
    this.publish(fresh, ["seeded"])
    return this.state!
  }

  dispose() {
    this.detachStorageListener?.()
    this.listeners.clear()
  }

  // ------------------------------------------------------------------ internals

  private readStored(): { db: DemoDatabase | null; notice?: "migrated" | "corrupt" } {
    const raw = this.storage.read(DB_STORAGE_KEY)
    if (!raw) return { db: null }
    try {
      const result = migrate(JSON.parse(raw))
      if (!result.db) return { db: null, notice: "corrupt" }
      return { db: result.db, notice: result.migrated ? "migrated" : undefined }
    } catch {
      return { db: null, notice: "corrupt" }
    }
  }

  private persist(db: DemoDatabase) {
    this.storage.write(DB_STORAGE_KEY, JSON.stringify(db))
  }

  private publish(db: DemoDatabase, notices: DataNotice[]) {
    const previous = this.state
    this.state = {
      db,
      version: (previous?.version ?? 0) + 1,
      persistent: this.storage.persistent,
      notices: [...notices, ...(this.storage.persistent ? [] : (["memory_only"] as DataNotice[]))],
    }
    for (const listener of this.listeners) listener(this.state)
  }

  private attachStorageListener() {
    if (typeof window === "undefined" || this.detachStorageListener) return
    const onStorage = (event: StorageEvent) => {
      if (event.key !== DB_STORAGE_KEY) return
      const { db } = this.readStored()
      if (db) this.publish(db, [])
    }
    window.addEventListener("storage", onStorage)
    this.detachStorageListener = () => window.removeEventListener("storage", onStorage)
  }
}
