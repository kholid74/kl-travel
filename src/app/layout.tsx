import type { Metadata, Viewport } from "next"
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google"
import { DataProvider } from "@/components/providers/data-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
})

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "NusaVista Journey — Open trip & private trip Nusantara",
    template: "%s · NusaVista Journey",
  },
  description:
    "Situs demonstrasi operator perjalanan fiktif NusaVista Journey: open trip, private trip, dan perjalanan custom ke Labuan Bajo, Bali, Raja Ampat, dan destinasi Nusantara lainnya.",
  applicationName: "NusaVista Journey",
  // Fictional brand: keep it out of search results (docs/architecture.md §2).
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export const viewport: Viewport = {
  themeColor: "#0b2540",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} ${instrument.variable} h-full`}>
      <body className="min-h-full">
        <a
          href="#konten"
          className="sr-only z-[100] rounded-md bg-ocean-900 px-4 py-2 text-sm font-semibold text-ivory-50 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Lewati ke konten
        </a>
        <DataProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </DataProvider>
      </body>
    </html>
  )
}
