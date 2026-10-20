"use client"

import { createStore, useStore } from "zustand"
import type { DemoDatabase } from "@/domain/database"
import type { DataNotice } from "@/repositories/interfaces"

export interface DbStoreState {
  status: "idle" | "ready" | "error"
  db: DemoDatabase | null
  /** Increments on every committed change, in this tab or another. */
  version: number
  persistent: boolean
  notices: DataNotice[]
}

export const dbStore = createStore<DbStoreState>(() => ({
  status: "idle",
  db: null,
  version: 0,
  persistent: true,
  notices: [],
}))

export function useDbStore<T>(selector: (state: DbStoreState) => T): T {
  return useStore(dbStore, selector)
}

/**
 * Current database snapshot. Derive data with `useMemo(..., [db])` rather than in the
 * selector, so selectors stay referentially stable.
 */
export function useDatabase() {
  const db = useDbStore((state) => state.db)
  const status = useDbStore((state) => state.status)
  return { db, status, ready: status === "ready" && db !== null }
}
