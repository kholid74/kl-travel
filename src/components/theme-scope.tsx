"use client"

import { createContext, useContext, type ReactNode } from "react"

export type ThemeScopeName = "public" | "dashboard"

const ThemeScopeContext = createContext<ThemeScopeName>("dashboard")

/**
 * Sets the visual system for a subtree. Portalled UI (dialogs, menus, tooltips) renders
 * outside that subtree, so ui/ components re-apply the scope through ThemeScopeContents.
 */
export function ThemeScope({ scope, className, children }: { scope: ThemeScopeName; className?: string; children: ReactNode }) {
  return (
    <ThemeScopeContext.Provider value={scope}>
      <div className={`theme-${scope}${className ? ` ${className}` : ""}`}>{children}</div>
    </ThemeScopeContext.Provider>
  )
}

export function useThemeScope(): ThemeScopeName {
  return useContext(ThemeScopeContext)
}

/** Box-less wrapper that carries the theme tokens into a portal. */
export function ThemeScopeContents({ children }: { children: ReactNode }) {
  const scope = useThemeScope()
  return <div className={`theme-${scope} contents`}>{children}</div>
}
