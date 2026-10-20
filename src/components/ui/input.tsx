import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // text-base on mobile prevents iOS from zooming into focused fields
        "h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-base text-foreground transition-[border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-ink-500 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/80 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25 md:text-sm",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
