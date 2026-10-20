import type { DateOnly } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import type { Customer, Destination, Inquiry, Quotation, TourPackage, User } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { quotationDisplayStatus, type QuotationDisplayStatus } from "@/domain/rules/inquiry-pipeline"
import { priceTotal, tierFor } from "@/domain/rules/pricing"
import type { IDR } from "@/domain/types/common"

export interface InquiryRow {
  inquiry: Inquiry
  customer?: Customer
  pkg?: TourPackage
  destinations: Destination[]
  assignee?: User
  quotations: (Quotation & { display: QuotationDisplayStatus })[]
  /** Accepted or latest sent quotation, else the package tier price × group; null when unknown. */
  estimate: IDR | null
  followUpOverdue: boolean
}

export function inquiryRows(db: DemoDatabase, today: DateOnly): InquiryRow[] {
  const idx = getIndexes(db)
  return Object.values(db.inquiries).map((inquiry) => {
    const quotations = [...(idx.quotationsByInquiry.get(inquiry.id) ?? [])]
      .sort((a, b) => a.version - b.version)
      .map((q) => ({ ...q, display: quotationDisplayStatus(q, today) }))
    const pkg = inquiry.packageId ? db.packages[inquiry.packageId] : undefined
    const priced = quotations.find((q) => q.status === "accepted") ?? quotations.filter((q) => q.status === "sent").at(-1)
    const tier = pkg?.pricing.kind === "tiered" ? tierFor(pkg.pricing.tiers, inquiry.groupSize) : undefined
    const perPax = pkg?.pricing.kind === "per_pax" ? pkg.pricing.pricePerPax : tier?.pricePerPax
    return {
      inquiry,
      customer: db.customers[inquiry.customerId],
      pkg,
      destinations: inquiry.destinationIds.map((id) => db.destinations[id]).filter(Boolean),
      assignee: inquiry.assigneeId ? db.users[inquiry.assigneeId] : undefined,
      quotations,
      estimate: priced ? priceTotal(priced) : perPax ? perPax * inquiry.groupSize : null,
      followUpOverdue:
        !!inquiry.nextFollowUpDate && inquiry.nextFollowUpDate < today && inquiry.stage !== "won" && inquiry.stage !== "lost",
    }
  })
}

export function matchesInquirySearch(row: InquiryRow, term: string): boolean {
  if (!term) return true
  const haystack = [row.inquiry.code, row.inquiry.contactSnapshot.fullName, row.inquiry.contactSnapshot.phone, row.pkg?.title, ...row.destinations.map((d) => d.name)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(term.toLowerCase())
}
