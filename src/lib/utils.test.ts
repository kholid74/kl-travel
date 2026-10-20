import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("keeps custom type-scale sizes next to text colours", () => {
    expect(cn("text-display-md text-balance", "text-ocean-900")).toBe("text-display-md text-balance text-ocean-900")
    expect(cn("text-display-md", "text-display-lg")).toBe("text-display-lg")
  })
})
