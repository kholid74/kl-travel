"use client"

import { CalendarCheck, Compass, HeartHandshake, Leaf, Receipt, ShieldCheck, Users, type LucideIcon } from "lucide-react"
import { Reveal } from "@/components/public/motion"
import { SectionHeading } from "@/components/public/section-heading"
import { usePublicContent } from "@/features/content/hooks/use-public-content"
import type { PublicContent } from "@/services/queries/catalog"

/** Icon names an editor can pick in Site Content. */
export const WHY_US_ICONS: Record<string, LucideIcon> = {
  users: Users,
  "calendar-check": CalendarCheck,
  receipt: Receipt,
  compass: Compass,
  shield: ShieldCheck,
  leaf: Leaf,
  handshake: HeartHandshake,
}

export function WhyUs({ initialContent }: { initialContent: PublicContent }) {
  const { siteContent } = usePublicContent(initialContent)
  return (
    <section aria-labelledby="kenapa-kami" className="py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          id="kenapa-kami"
          align="center"
          eyebrow="Kenapa bersama kami"
          title="Perjalanan yang tenang dimulai dari perencanaan yang jujur"
        />
        <ul className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {siteContent.whyUs.map((item, index) => {
            const Icon = WHY_US_ICONS[item.icon] ?? Compass
            return (
              <li key={item.title} className="border-t border-ocean-900/80 pt-6">
                <Reveal delay={index * 0.06}>
                  <div className="flex items-center justify-between">
                    <Icon className="size-6 text-lagoon-700" strokeWidth={1.5} aria-hidden="true" />
                    <span aria-hidden="true" className="font-display text-2xl text-sand-600 tabular-nums">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-ocean-900">{item.title}</h3>
                  <p className="mt-2 text-pretty text-muted-foreground">{item.body}</p>
                </Reveal>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
