"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { Result } from "@/lib/result"

/**
 * Runs a service command with a pending flag and toasts. Domain errors arrive as a
 * Result (never thrown), so the caller can also map them to form fields.
 */
export function useCommand<A extends unknown[], T>(
  command: (...args: A) => Promise<Result<T>>,
  options: { success?: string | ((data: T) => string); onSuccess?: (data: T) => void; errorTitle?: string } = {},
) {
  const [pending, setPending] = useState(false)
  const run = async (...args: A): Promise<Result<T>> => {
    setPending(true)
    const result = await command(...args)
    setPending(false)
    if (result.ok) {
      const message = typeof options.success === "function" ? options.success(result.data) : options.success
      if (message) toast.success(message)
      options.onSuccess?.(result.data)
    } else {
      toast.error(options.errorTitle ?? "Perubahan belum tersimpan", { description: result.error.message })
    }
    return result
  }
  return { run, pending }
}
