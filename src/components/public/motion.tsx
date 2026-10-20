"use client"

import type { ReactNode } from "react"
import { LazyMotion, MotionConfig, domAnimation, m } from "motion/react"

export const EASE_OUT_SOFT = [0.22, 1, 0.36, 1] as const

/** Loads the small DOM animation bundle once and honours prefers-reduced-motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

/** Fade and rise once when the block scrolls into view (docs/design-system.md §7). */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.5, ease: EASE_OUT_SOFT, delay }}
    >
      {children}
    </m.div>
  )
}
