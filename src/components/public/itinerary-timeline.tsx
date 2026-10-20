import { BedDouble, Utensils } from "lucide-react"
import type { ItineraryDay } from "@/domain/entities"

function mealsText(meals: ItineraryDay["meals"]): string | null {
  const list = [meals.breakfast && "sarapan", meals.lunch && "makan siang", meals.dinner && "makan malam"].filter(Boolean) as string[]
  if (list.length === 0) return null
  const text = list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} & ${list.at(-1)}`
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Day-by-day itinerary on a vertical rule. */
export function ItineraryTimeline({ days }: { days: ItineraryDay[] }) {
  return (
    <ol className="relative">
      {days.map((day, index) => {
        const meals = mealsText(day.meals)
        return (
          <li key={day.id} className="relative grid grid-cols-[40px_1fr] gap-x-4 pb-10 last:pb-0 sm:grid-cols-[56px_1fr] sm:gap-x-6">
            {index < days.length - 1 && <span aria-hidden="true" className="absolute top-11 bottom-1 left-5 w-px bg-border sm:left-7" />}
            <span className="flex size-10 items-center justify-center rounded-full border border-ocean-900 bg-background font-display text-xl text-ocean-900 tabular-nums sm:size-14 sm:text-2xl">
              {day.day}
            </span>
            <div className="pt-1.5 sm:pt-3">
              <p className="eyebrow text-muted-foreground">Hari {day.day}</p>
              <h3 className="mt-1 text-lg font-semibold text-balance text-ocean-900">{day.title}</h3>
              <p className="mt-2 leading-relaxed text-pretty text-muted-foreground">{day.description}</p>
              {day.activities.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Aktivitas">
                  {day.activities.map((activity) => (
                    <li key={activity} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                      {activity}
                    </li>
                  ))}
                </ul>
              )}
              {(meals || day.accommodation) && (
                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  {meals && (
                    <div className="flex items-center gap-2">
                      <dt>
                        <Utensils className="size-4" aria-hidden="true" />
                        <span className="sr-only">Makan</span>
                      </dt>
                      <dd>{meals}</dd>
                    </div>
                  )}
                  {day.accommodation && (
                    <div className="flex items-center gap-2">
                      <dt>
                        <BedDouble className="size-4" aria-hidden="true" />
                        <span className="sr-only">Menginap</span>
                      </dt>
                      <dd>{day.accommodation}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
