"use client"

import { useMemo } from "react"
import { selectPublicContent, type PublicContent } from "@/services/queries/catalog"
import { useDatabase } from "@/stores/db-store"

/** Site Content, articles, and testimonials: fixtures first, live after hydration. */
export function usePublicContent(initial: PublicContent): PublicContent & { live: boolean } {
  const { db, ready } = useDatabase()
  return useMemo(() => (ready && db ? { ...selectPublicContent(db), live: true } : { ...initial, live: false }), [db, ready, initial])
}
