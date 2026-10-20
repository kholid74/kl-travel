"use client"

import * as React from "react"
import { id } from "date-fns/locale/id"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import type { DateOnly } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/** Month calendar in Bahasa Indonesia, Monday first (react-day-picker v9). */
function Calendar({ className, classNames, showOutsideDays = false, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={id}
      weekStartsOn={1}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-6 sm:flex-row",
        month: "flex flex-col gap-3",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "aria-disabled:opacity-40"),
        button_next: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "aria-disabled:opacity-40"),
        month_caption: "flex h-8 items-center justify-center px-9",
        caption_label: "text-sm font-semibold text-foreground capitalize",
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday: "w-10 text-[0.75rem] font-medium text-muted-foreground capitalize",
        week: "mt-1 flex",
        day: "relative size-10 p-0 text-center text-sm",
        day_button:
          "inline-flex size-10 items-center justify-center rounded-md tabular-nums outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:hover:bg-transparent",
        selected: "[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        range_start: "rounded-l-md bg-muted",
        range_middle: "bg-muted [&>button]:bg-transparent [&>button]:text-foreground [&>button]:font-normal",
        range_end: "rounded-r-md bg-muted",
        today: "[&>button]:underline [&>button]:decoration-sand-500 [&>button]:decoration-2 [&>button]:underline-offset-4",
        outside: "text-muted-foreground opacity-60",
        disabled: "text-ink-400 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", chevronClass)} aria-hidden="true" />
          ) : (
            <ChevronRight className={cn("size-4", chevronClass)} aria-hidden="true" />
          ),
      }}
      {...props}
    />
  )
}

/** The picker works with local-midnight Date objects; the domain stores DateOnly strings. */
function toPickerDate(value: DateOnly): Date {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function fromPickerDate(date: Date): DateOnly {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export { Calendar, fromPickerDate, toPickerDate }
