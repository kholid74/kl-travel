"use client"

import { useEffect, type ReactNode } from "react"
import { getDataSource } from "@/repositories"
import { runSystemJobs } from "@/services/system-jobs"
import { dbStore } from "@/stores/db-store"
import { useUiStore } from "@/stores/ui-store"

const SYSTEM_JOB_INTERVAL_MS = 60_000

/**
 * Loads the browser-local demo database after hydration (ADR-0003), keeps the store in
 * sync with commits from this tab and others, and runs the simulated scheduler.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useUiStore.persist.rehydrate()
    const dataSource = getDataSource()
    try {
      const state = dataSource.load()
      dbStore.setState({ status: "ready", ...state })
    } catch (error) {
      console.error(error)
      dbStore.setState({ status: "error" })
      return
    }
    const unsubscribe = dataSource.subscribe((state) => dbStore.setState({ status: "ready", ...state }))
    const tick = () => {
      if (document.visibilityState === "visible") runSystemJobs(dataSource)
    }
    tick()
    const timer = window.setInterval(tick, SYSTEM_JOB_INTERVAL_MS)
    document.addEventListener("visibilitychange", tick)
    return () => {
      unsubscribe()
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [])

  return children
}
