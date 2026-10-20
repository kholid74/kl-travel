"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

/**
 * Read and update a fixed set of query parameters (filters, views). Values are strings;
 * an empty string or null removes the parameter. Must be used inside <Suspense>.
 */
export function useQueryParams<K extends string>(keys: readonly K[]) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const keyList = keys.join(",")

  const values = useMemo(
    () => Object.fromEntries(keyList.split(",").map((key) => [key, params.get(key) ?? ""])) as Record<K, string>,
    [params, keyList],
  )

  const update = useCallback(
    (patch: Partial<Record<K, string | null>>) => {
      const next = new URLSearchParams(params.toString())
      for (const [key, value] of Object.entries(patch) as [string, string | null | undefined][]) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      const query = next.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [params, router, pathname],
  )

  return [values, update] as const
}
