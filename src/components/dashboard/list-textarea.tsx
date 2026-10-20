"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import type { FieldControlProps } from "@/components/shared/field"

/**
 * Edits a string[] as one item per line (inclusions, highlights, terms). Keeps the raw
 * text while typing so blank lines do not jump around.
 */
export function ListTextarea({
  value,
  onChange,
  rows = 4,
  placeholder,
  control,
  separator = "line",
}: {
  value: string[]
  onChange: (value: string[]) => void
  rows?: number
  placeholder?: string
  control?: FieldControlProps
  /** "paragraph" splits on blank lines (overview, descriptions). */
  separator?: "line" | "paragraph"
}) {
  const joiner = separator === "line" ? "\n" : "\n\n"
  const [text, setText] = useState(value.join(joiner))
  const [synced, setSynced] = useState(value)
  // External resets (form.reset) replace the text; our own edits round-trip unchanged.
  if (value !== synced) {
    setSynced(value)
    if (value.join(joiner) !== text.trim()) setText(value.join(joiner))
  }
  return (
    <Textarea
      {...control}
      rows={rows}
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        const items = event.target.value
          .split(separator === "line" ? /\n/ : /\n\s*\n/)
          .map((item) => item.trim())
          .filter(Boolean)
        setSynced(items)
        onChange(items)
      }}
    />
  )
}
