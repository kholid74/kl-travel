import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Custom type scale from globals.css. Without this, tailwind-merge reads `text-display-md`
// as a colour and drops it next to `text-ocean-900`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display-xl", "display-lg", "display-md", "heading", "body-lg", "eyebrow", "page-title", "kpi", "table"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
