"use client"

import { useRef } from "react"

type AutoFocusHandler = (event: Event) => void

/**
 * Radix sends focus back only to a `*Trigger` element. Dialogs opened from state have none,
 * so closing them dropped focus on <body>. Remember what was focused when the content opened
 * and return there instead; with a trigger this is the trigger itself.
 */
export function useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus }: { onOpenAutoFocus?: AutoFocusHandler; onCloseAutoFocus?: AutoFocusHandler }) {
  const opener = useRef<HTMLElement | null>(null)
  return {
    onOpenAutoFocus: (event: Event) => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      onOpenAutoFocus?.(event)
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event)
      const element = opener.current
      if (event.defaultPrevented || !element || element === document.body || !element.isConnected) return
      event.preventDefault()
      element.focus({ preventScroll: true })
    },
  }
}
