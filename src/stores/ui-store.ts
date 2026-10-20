"use client"

import { create } from "zustand"
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware"
import { DEFAULT_PERSONA_ID } from "@/data/fixtures/people"

/** localStorage wrapped so private mode or blocked storage never throws. */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value)
    } catch {
      // per-viewer convenience only
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name)
    } catch {
      // ignore
    }
  },
}

interface UiState {
  sidebarCollapsed: boolean
  personaId: string
  /** Last chosen view per page, e.g. { inquiries: "board" }. */
  views: Record<string, string>
  demoGuideDismissed: boolean
  setSidebarCollapsed: (value: boolean) => void
  setPersona: (userId: string) => void
  setView: (page: string, view: string) => void
  setDemoGuideDismissed: (value: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      personaId: DEFAULT_PERSONA_ID,
      views: {},
      demoGuideDismissed: false,
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      setPersona: (userId) => set({ personaId: userId }),
      setView: (page, view) => set((state) => ({ views: { ...state.views, [page]: view } })),
      setDemoGuideDismissed: (value) => set({ demoGuideDismissed: value }),
    }),
    {
      name: "nusavista-demo:ui",
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: ({ sidebarCollapsed, personaId, views, demoGuideDismissed }) => ({
        sidebarCollapsed,
        personaId,
        views,
        demoGuideDismissed,
      }),
    },
  ),
)
