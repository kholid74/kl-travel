"use client"

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/** Light-only toaster styled with the surrounding theme scope's tokens. */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-tone-success" />,
        info: <InfoIcon className="size-4 text-tone-info" />,
        warning: <TriangleAlertIcon className="size-4 text-tone-warning" />,
        error: <OctagonXIcon className="size-4 text-tone-danger" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "font-sans shadow-lg", description: "text-muted-foreground" } }}
      {...props}
    />
  )
}

export { Toaster }
