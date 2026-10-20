import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent font-medium whitespace-nowrap transition-[background-color,color,border-color,box-shadow] duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border-border bg-card text-foreground hover:border-input hover:bg-muted",
        outline: "border-input bg-transparent text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        link: "h-auto px-0 text-lagoon-700 underline-offset-4 hover:underline",
        destructive: "bg-tone-danger text-white hover:bg-tone-danger/90",
        accent: "bg-lagoon-700 text-white hover:bg-lagoon-800",
        /** For dark (ocean) sections. */
        inverse: "bg-ivory-50 text-ocean-900 hover:bg-white",
        sand: "bg-sand-300 text-ocean-900 hover:bg-sand-100",
      },
      size: {
        xs: "h-7 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-3 text-sm",
        default: "h-9 px-4 text-sm",
        lg: "h-11 px-5 text-[0.9375rem]",
        xl: "h-12 px-6 text-base",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-xs": "size-7",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
