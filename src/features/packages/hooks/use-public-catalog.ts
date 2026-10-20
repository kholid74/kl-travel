"use client"

import { useMemo } from "react"
import type { Settings } from "@/domain/entities"
import type { ID } from "@/domain/types/common"
import { useNow } from "@/hooks/use-now"
import {
  availabilityByPackage,
  packageAvailability,
  selectPublicCatalog,
  upcomingDepartures,
  type PackageAvailability,
  type PublicCatalog,
  type UpcomingDeparture,
} from "@/services/queries/catalog"
import { useDatabase } from "@/stores/db-store"

/**
 * Catalog rendered from server fixtures first, then from the browser database once it is
 * loaded, so packages created or edited in the dashboard appear here (ADR-0003).
 */
export function usePublicCatalog(initial: PublicCatalog): PublicCatalog & { live: boolean } {
  const { db, ready } = useDatabase()
  return useMemo(() => (ready && db ? { ...selectPublicCatalog(db), live: true } : { ...initial, live: false }), [db, ready, initial])
}

/** Booking limits from Pengaturan; the seed values until the database is loaded. */
export function useBookingSettings(initial: Settings["booking"]): Settings["booking"] {
  const { db, ready } = useDatabase()
  return ready && db ? db.settings.booking : initial
}

/** Live seats for many packages; null until the database and clock are available. */
export function useAvailabilityMap(packageIds: ID[]): Map<ID, PackageAvailability> | null {
  const { db, ready } = useDatabase()
  const now = useNow()
  const key = packageIds.join(",")
  return useMemo(
    () => (ready && db && now ? availabilityByPackage(db, key ? key.split(",") : [], now) : null),
    [db, ready, now, key],
  )
}

export function usePackageAvailability(packageId: ID | undefined): PackageAvailability | null {
  const { db, ready } = useDatabase()
  const now = useNow()
  return useMemo(() => (ready && db && now && packageId ? packageAvailability(db, packageId, now) : null), [db, ready, now, packageId])
}

export function useUpcomingDepartures(limit: number): UpcomingDeparture[] | null {
  const { db, ready } = useDatabase()
  const now = useNow()
  return useMemo(() => (ready && db && now ? upcomingDepartures(db, now, limit) : null), [db, ready, now, limit])
}
