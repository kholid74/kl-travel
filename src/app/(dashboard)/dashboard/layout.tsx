import type { Metadata } from "next"
import { Suspense } from "react"
import { AppShell } from "@/components/dashboard/app-shell"
import { ThemeScope } from "@/components/theme-scope"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Dashboard NusaVista" },
}

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <ThemeScope scope="dashboard" className="min-h-dvh bg-background">
      <Suspense>
        <AppShell>{children}</AppShell>
      </Suspense>
      <Toaster />
    </ThemeScope>
  )
}
