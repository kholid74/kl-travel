import { Suspense } from "react"
import { DemoLauncher } from "@/components/public/demo-launcher"
import { MotionProvider } from "@/components/public/motion"
import { PromoBar } from "@/components/public/promo-bar"
import { SiteFooter } from "@/components/public/site-footer"
import { SiteHeader, SiteHeaderView } from "@/components/public/site-header"
import { ThemeScope } from "@/components/theme-scope"
import { DemoDataBanner } from "@/features/demo/components/demo-banner"
import { Toaster } from "@/components/ui/sonner"
import { getSeedSiteContent } from "@/services/catalog-server"

export default function PublicLayout({ children }: LayoutProps<"/">) {
  const content = getSeedSiteContent()
  return (
    <ThemeScope scope="public" className="flex min-h-dvh flex-col bg-background">
      <MotionProvider>
        <DemoDataBanner variant="public" />
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
      </MotionProvider>
    </ThemeScope>
  )
}
