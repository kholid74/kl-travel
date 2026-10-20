"use client"

import { FlaskConical } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DemoPanel } from "@/features/demo/components/demo-panel"

/** Small floating entry point to the demo layer on the public site. */
export function DemoLauncher() {
  return (
    <Popover>
      <PopoverTrigger
        className="fixed bottom-4 left-4 z-40 inline-flex h-9 items-center gap-1.5 rounded-full bg-ocean-950/90 px-3.5 text-xs font-semibold tracking-wide text-ivory-50 shadow-lg backdrop-blur outline-none hover:bg-ocean-950 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Buka panel mode demo"
      >
        <FlaskConical className="size-3.5" aria-hidden="true" />
        Demo
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-4">
        <DemoPanel context="public" />
      </PopoverContent>
    </Popover>
  )
}
