import { toDateOnlyWIB, type Timestamp } from "@/lib/dates"
import { pad } from "@/lib/ids"
import type { UnitOfWork } from "@/repositories"

type CodeKind = "booking" | "invoice" | "payment" | "inquiry" | "customer"

/** Next human-readable code, continuing the sequence stored in meta.counters. */
export function nextCode(uow: UnitOfWork, kind: CodeKind, at: Timestamp = uow.now): string {
  const meta = uow.meta.get()
  const value = (meta.counters[kind] ?? 0) + 1
  uow.meta.set({ ...meta, counters: { ...meta.counters, [kind]: value } })
  const [yyyy, mm] = toDateOnlyWIB(at).split("-")
  const yymm = `${yyyy.slice(2)}${mm}`
  switch (kind) {
    case "booking":
      return `NV-${yymm}-${pad(value)}`
    case "invoice":
      return `${uow.settings.get().invoice.prefix}/${yyyy}/${mm}/${pad(value)}`
    case "payment":
      return `PAY-${yymm}-${pad(value)}`
    case "inquiry":
      return `INQ-${pad(value)}`
    case "customer":
      return `CUS-${pad(value)}`
  }
}
