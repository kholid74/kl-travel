"use client"

import { useSyncExternalStore, type ReactNode } from "react"

const subscribe = () => () => {}

/** Renders `children` only after hydration; use for values that depend on the clock or storage. */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  return mounted ? children : fallback
}
