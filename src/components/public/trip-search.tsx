"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Search } from "lucide-react"
import { addDays } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useToday } from "@/hooks/use-now"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ANY = "semua"

/** The next `count` months as "YYYY-MM", starting with the current one. */
function upcomingMonths(today: string, count: number): string[] {
  const months: string[] = []
  let cursor = `${today.slice(0, 7)}-01`
  for (let i = 0; i < count; i++) {
    months.push(cursor.slice(0, 7))
    cursor = addDays(cursor, 32).slice(0, 7) + "-01"
  }
  return months
}

/** Destination · trip type · month → /paket with the matching filters. */
export function TripSearch({ destinations, className }: { destinations: { slug: string; name: string }[]; className?: string }) {
  const router = useRouter()
  const today = useToday()
  const [destination, setDestination] = useState(ANY)
  const [type, setType] = useState(ANY)
  const [month, setMonth] = useState(ANY)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (destination !== ANY) params.set("destinasi", destination)
    if (type !== ANY) params.set("jenis", type)
    if (month !== ANY) params.set("bulan", month)
    const query = params.toString()
    router.push(query ? `/paket?${query}` : "/paket")
  }

  const field = "grid gap-1 px-4 py-2.5 text-left md:py-3"
  const label = "text-[0.6875rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
  const trigger = "h-7 w-full border-0 bg-transparent p-0 text-[0.9375rem] font-medium shadow-none focus-visible:ring-0 data-placeholder:text-foreground"

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Cari trip"
      className={cn(
        "grid w-full max-w-4xl overflow-hidden rounded-md bg-ivory-50 text-ink-900 shadow-[0_24px_60px_-20px_rgb(7_26_43/0.55)] md:grid-cols-[1fr_1fr_1fr_auto] md:items-center",
        className,
      )}
    >
      <div className={cn(field, "border-b border-border md:border-r md:border-b-0 has-[:focus-visible]:bg-ivory-100")}>
        <span id="cari-destinasi" className={label}>
          Destinasi
        </span>
        <Select value={destination} onValueChange={setDestination}>
          <SelectTrigger aria-labelledby="cari-destinasi" className={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Semua destinasi</SelectItem>
            {destinations.map((d) => (
              <SelectItem key={d.slug} value={d.slug}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={cn(field, "border-b border-border md:border-r md:border-b-0 has-[:focus-visible]:bg-ivory-100")}>
        <span id="cari-jenis" className={label}>
          Jenis trip
        </span>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger aria-labelledby="cari-jenis" className={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Semua jenis</SelectItem>
            <SelectItem value="open">Open Trip</SelectItem>
            <SelectItem value="private">Private Trip</SelectItem>
            <SelectItem value="custom">Custom Trip</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className={cn(field, "border-b border-border md:border-b-0 has-[:focus-visible]:bg-ivory-100")}>
        <span id="cari-bulan" className={label}>
          Bulan berangkat
        </span>
        <Select value={month} onValueChange={setMonth} disabled={!today}>
          <SelectTrigger aria-labelledby="cari-bulan" className={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Kapan saja</SelectItem>
            {today &&
              upcomingMonths(today, 6).map((m) => (
                <SelectItem key={m} value={m}>
                  {formatDate(`${m}-01`, "month-year")}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="p-2">
        <Button type="submit" size="xl" className="w-full md:w-auto">
          <Search aria-hidden="true" /> Cari trip
        </Button>
      </div>
    </form>
  )
}
