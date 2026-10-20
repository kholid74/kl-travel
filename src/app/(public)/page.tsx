import { ClosingCta } from "@/components/public/closing-cta"
import { DepartureTimetable } from "@/features/home/components/departure-timetable"
import { DestinationMosaic } from "@/features/home/components/destination-mosaic"
import { FeaturedTrips } from "@/features/home/components/featured-trips"
import { HomeFaq } from "@/features/home/components/home-faq"
import { HomeHero } from "@/features/home/components/home-hero"
import { JournalSpread } from "@/features/home/components/journal-spread"
import { TripModels } from "@/features/home/components/trip-models"
import { WhyUs } from "@/features/home/components/why-us"
import { getSeedCatalog, getSeedContent } from "@/services/catalog-server"

/** Homepage (requirement §4.1). Header and footer come from the (public) layout. */
export default function HomePage() {
  const catalog = getSeedCatalog()
  const content = getSeedContent()
  return (
    <>
      <HomeHero initialContent={content} initialCatalog={catalog} />
      <DestinationMosaic initialContent={content} initialCatalog={catalog} />
      <FeaturedTrips initialContent={content} initialCatalog={catalog} />
      <TripModels initialCatalog={catalog} />
      <DepartureTimetable />
      <WhyUs initialContent={content} />
      <JournalSpread initialContent={content} />
      <HomeFaq initialContent={content} />
      <ClosingCta />
    </>
  )
}
