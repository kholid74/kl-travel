"use client"

import { useMemo } from "react"
import { toDateOnlyWIB, type DateOnly, type Timestamp } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import { useDatabase } from "@/stores/db-store"
import { useNow } from "./use-now"

export interface Live {
  db: DemoDatabase
  now: Timestamp
  today: DateOnly
}

/** Database snapshot plus the shared clock; null until both exist (dashboard renders skeletons). */
export function useLive(): Live | null {
  const { db, ready } = useDatabase()
  const now = useNow()
  return useMemo(() => (ready && db && now ? { db, now, today: toDateOnlyWIB(now) } : null), [db, ready, now])
}
