"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { ChevronDown, Menu } from "lucide-react"
import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { PRIMARY_CTA, PUBLIC_NAV } from "./nav"

/** Routes whose first section is a full-bleed photo the header floats over. */
const OVERLAY_ROUTES = new Set(["/"])

export function SiteHeader() {
  const pathname = usePathname()
  return <SiteHeaderView overlay={OVERLAY_ROUTES.has(pathname)} pathname={pathname} />
}

/** Static variant used as the Suspense fallback and on routes without a hero. */
export function SiteHeaderView({ overlay = false, pathname = "" }: { overlay?: boolean; pathname?: string }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!overlay) return
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [overlay])

  const transparent = overlay && !scrolled && !menuOpen
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href.split("?")[0]))

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color,color] duration-300",
        overlay && "-mb-16 md:-mb-[72px]",
        transparent
          ? "border-b border-transparent text-ivory-50"
          : "border-b border-border bg-background/95 text-ocean-900 backdrop-blur supports-[backdrop-filter]:bg-background/85",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-6 md:h-[72px]">
        <Link href="/" className="rounded-sm" aria-label="NusaVista Journey, ke beranda">
          <Logo />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV.map((item) =>
            item.children ? (
              <DropdownMenu key={item.href}>
                <DropdownMenuTrigger
                  className={cn(
                    "inline-flex h-10 items-center gap-1 rounded-md px-3 text-sm font-medium outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring",
                    isActive(item.href) && "underline decoration-sand-500 decoration-2 underline-offset-8",
                  )}
                >
                  {item.label}
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 p-2">
                  {item.children.map((child, index) => (
                    <div key={child.href}>
                      {index === item.children!.length - 1 && <DropdownMenuSeparator />}
                      <DropdownMenuItem asChild className="flex-col items-start gap-0.5 px-3 py-2.5">
                        <Link href={child.href}>
                          <span className="text-sm font-semibold text-foreground">{child.label}</span>
                          {child.description && <span className="text-xs text-muted-foreground">{child.description}</span>}
                        </Link>
                      </DropdownMenuItem>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-md px-3 text-sm font-medium hover:opacity-80",
                  isActive(item.href) && "underline decoration-sand-500 decoration-2 underline-offset-8",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="default" variant={transparent ? "inverse" : "default"} className="hidden sm:inline-flex">
            <Link href={PRIMARY_CTA.href}>{PRIMARY_CTA.label}</Link>
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden hover:bg-transparent" aria-label="Buka menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm bg-background p-0 sm:max-w-sm">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Navigasi utama NusaVista Journey</SheetDescription>
              <div className="flex h-16 items-center border-b border-border px-5">
                <Logo className="text-ocean-900" />
              </div>
              <nav aria-label="Navigasi mobile" className="flex flex-col px-5 py-4">
                {PUBLIC_NAV.map((item) => (
                  <div key={item.href} className="border-b border-border py-3 last:border-0">
                    <Link href={item.children ? item.href : item.href} onClick={() => setMenuOpen(false)} className="font-display text-3xl text-ocean-900">
                      {item.label}
                    </Link>
                    {item.children && (
                      <ul className="mt-2 grid gap-1">
                        {item.children.slice(0, -1).map((child) => (
                          <li key={child.href}>
                            <Link href={child.href} onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm text-muted-foreground">
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </nav>
              <div className="mt-auto border-t border-border p-5">
                <Button asChild size="lg" className="w-full">
                  <Link href={PRIMARY_CTA.href} onClick={() => setMenuOpen(false)}>
                    {PRIMARY_CTA.label}
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
