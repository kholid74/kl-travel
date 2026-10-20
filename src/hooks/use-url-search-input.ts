"use client"

import { useEffect, useState } from "react"

/**
 * Search box state mirrored to a URL parameter after a pause in typing. URL changes made
 * elsewhere (back/forward, "clear filters") flow back into the box; echoes of our own
 * pushes are ignored so characters typed in the meantime are kept.
 */
export function useUrlSearchInput(urlValue: string, push: (value: string) => void, delay = 250) {
  const [value, setValue] = useState(urlValue)
  const [pushed, setPushed] = useState<string | null>(null)
  const [seen, setSeen] = useState(urlValue)

  if (urlValue !== seen) {
    setSeen(urlValue)
    if (urlValue !== pushed) setValue(urlValue)
  }

  useEffect(() => {
    const next = value.trim()
    if (next === urlValue) return
    const timer = setTimeout(() => {
      setPushed(next)
      push(next)
    }, delay)
    return () => clearTimeout(timer)
  }, [value, urlValue, push, delay])

  /** Set the box and treat the value as already pushed (for "clear all" buttons). */
  const reset = (next = "") => {
    setValue(next)
    setPushed(next)
  }

  return { value, setValue, reset }
}
