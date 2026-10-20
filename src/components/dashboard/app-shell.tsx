"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type ReactNode } from "react"
import { ExternalLink, FlaskConical, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { DemoDataBanner } from "@/features/demo/components/demo-banner"
import { JourneyTracker } from "@/features/demo/components/demo-journey"
import { DemoPanel } from "@/features/demo/components/demo-panel"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/stores/ui-store"
import { findNavItem } from "./nav-config"
import { PersonaSwitcher } from "./persona-switcher"
import { SidebarNav } from "./sidebar-nav"

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const setCollapsed = useUiStore((state) => state.setSidebarCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const current = findNavItem(pathname)

  return (
    <div className="flex min-h-dvh bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col bg-ocean-950 text-ivory-50 transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className={cn("flex h-14 items-center border-b border-ivory-50/10", collapsed ? "justify-center" : "px-5")}>
          <Link href="/dashboard" className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-lagoon-300" aria-label="Dashboard NusaVista">
            <Logo compact={collapsed} className="[&_svg]:size-6" />
          </Link>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto">
          <SidebarNav pathname={pathname} collapsed={collapsed} />
        </div>
        <div className="border-t border-ivory-50/10 p-3">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm text-ivory-50/70 outline-none hover:bg-ivory-50/8 hover:text-ivory-50 focus-visible:ring-2 focus-visible:ring-lagoon-300",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && <span>Ciutkan</span>}
          </button>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-0 bg-ocean-950 p-0 text-ivory-50 sm:max-w-72" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigasi dashboard</SheetTitle>
          <SheetDescription className="sr-only">Pilih modul dashboard</SheetDescription>
          <div className="flex h-14 items-center border-b border-ivory-50/10 px-5">
            <Logo className="[&_svg]:size-6" />
          </div>
          <div className="overflow-y-auto">
            <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Buka navigasi">
            <Menu className="size-5" />
          </Button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 truncate text-sm">
              {current && current.group.label !== "Ringkasan" && (
                <li className="hidden text-muted-foreground sm:block">
                  {current.group.label}
                  <span aria-hidden="true" className="ml-1.5 text-ink-400">
                    /
                  </span>
                </li>
              )}
              <li className="truncate font-medium text-foreground">{current?.item.label ?? "Dashboard"}</li>
            </ol>
          </nav>

          <Popover open={demoOpen} onOpenChange={setDemoOpen}>
            <PopoverTrigger className="inline-flex h-7 items-center gap-1.5 rounded-full bg-sand-100 px-2.5 text-xs font-semibold text-sand-800 outline-none hover:bg-sand-300/60 focus-visible:ring-2 focus-visible:ring-ring">
              <FlaskConical className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Mode Demo</span>
              <span className="sm:hidden">Demo</span>
            </PopoverTrigger>
            <PopoverContent align="end" className="max-h-[80dvh] w-80 overflow-y-auto p-4">
              <DemoPanel context="dashboard" onNavigate={() => setDemoOpen(false)} />
            </PopoverContent>
          </Popover>

          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/" target="_blank">
              Lihat website <ExternalLink aria-hidden="true" />
            </Link>
          </Button>
          <PersonaSwitcher />
        </header>

        <JourneyTracker />
        <DemoDataBanner />
        <main id="konten" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
