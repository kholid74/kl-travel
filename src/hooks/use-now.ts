"use client"

import { useSyncExternalStore } from "react"
import { toDateOnlyWIB, type DateOnly, type Timestamp } from "@/lib/dates"

const TICK_MS = 30_000

// One shared clock for every subscriber, so all live values on a page agree.
let current: Timestamp | null = null
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    current = new Date().toISOString()
    timer = setInterval(() => {
      current = new Date().toISOString()
      for (const notify of listeners) notify()
    }, TICK_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

function getSnapshot(): Timestamp {
  current ??= new Date().toISOString()
  return current
}

/**
 * Current time, refreshed every 30 seconds. Null during server render and hydration,
 * so time-dependent output (seats, holds, "3 hari lagi") never causes a mismatch.
 */
export function useNow(): Timestamp | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}

export function useToday(): DateOnly | null {
  const now = useNow()
  return now ? toDateOnlyWIB(now) : null
}
