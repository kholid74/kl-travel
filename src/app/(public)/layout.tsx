import { Suspense } from "react"
import { DemoLauncher } from "@/components/public/demo-launcher"
import { PromoBar } from "@/components/public/promo-bar"
import { SiteFooter } from "@/components/public/site-footer"
import { SiteHeader, SiteHeaderView } from "@/components/public/site-header"
import { ThemeScope } from "@/components/theme-scope"
import { Toaster } from "@/components/ui/sonner"
import { getSeedSiteContent } from "@/services/catalog-server"

export default function PublicLayout({ children }: LayoutProps<"/">) {
  const content = getSeedSiteContent()
  return (
    <ThemeScope scope="public" className="flex min-h-dvh flex-col bg-background">
      <PromoBar initial={content.promoBanner} />
      <Suspense fallback={<SiteHeaderView />}>
        <SiteHeader />
      </Suspense>
      <main id="konten" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <DemoLauncher />
      <Toaster />
    </ThemeScope>
  )
}
