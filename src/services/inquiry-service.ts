import { createId } from "@/lib/ids"
import { DomainError } from "@/lib/result"
import type { Inquiry, InquiryType, TravelDates } from "@/domain/entities"
import { SOURCE_LABEL } from "@/domain/labels"
import type { BudgetRange, ID, Interest, Source } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { nextCode } from "./codes"
import { resolveCustomer, type ContactInput } from "./customer-service"
import { runCommand } from "./runtime"

export interface WebsiteInquiryInput {
  type: InquiryType
  contact: ContactInput
  /** Private: the package asked about. Custom: the package that inspired the request. General: optional. */
  packageId?: ID
  destinationIds?: ID[]
  travelDates: TravelDates
  durationDays?: number
  groupSize: number
  budgetPerPax?: BudgetRange
  interests?: Interest[]
  message?: string
}

/** Private, custom, and general requests from the website enter the pipeline as "Baru". */
export function placeWebsiteInquiry(uow: UnitOfWork, input: WebsiteInquiryInput): { inquiryId: ID; code: string } {
  return placeInquiry(uow, input, { source: "website" })
}

/** Website requests act as the customer; manual entries act as the team member. */
export type InquiryChannel = { source: "website" } | { source: Exclude<Source, "website">; userId: ID }

export function placeInquiry(uow: UnitOfWork, input: WebsiteInquiryInput, channel: InquiryChannel): { inquiryId: ID; code: string } {
  if (!Number.isInteger(input.groupSize) || input.groupSize < 1) {
    throw new DomainError("VALIDATION", "Jumlah peserta minimal 1 orang.", "groupSize")
  }

  const pkg = input.packageId ? uow.packages.get(input.packageId) : undefined
  if (input.packageId && (!pkg || pkg.status !== "published")) {
    throw new DomainError("NOT_FOUND", "Paket yang dipilih tidak lagi tersedia.", "packageId")
  }
  if (input.type === "private") {
    if (!pkg || pkg.tripType !== "private") throw new DomainError("VALIDATION", "Pilih paket private trip.", "packageId")
    if (input.groupSize < pkg.groupSize.min || input.groupSize > pkg.groupSize.max) {
      throw new DomainError("VALIDATION", `Paket ini untuk ${pkg.groupSize.min}–${pkg.groupSize.max} orang.`, "groupSize")
    }
  }

  const destinationIds = input.destinationIds?.length ? input.destinationIds : pkg ? [pkg.destinationId] : []
  for (const id of destinationIds) {
    if (!uow.destinations.get(id)) throw new DomainError("NOT_FOUND", "Destinasi tidak ditemukan.", "destinationIds")
  }
  if (input.type === "custom" && destinationIds.length === 0) {
    throw new DomainError("VALIDATION", "Pilih minimal satu destinasi.", "destinationIds")
  }
  if (input.type === "general" && !input.message?.trim()) {
    throw new DomainError("VALIDATION", "Tuliskan pertanyaan Anda.", "message")
  }

  const { customer } = resolveCustomer(uow, input.contact, channel.source)
  const inquiryId = createId("inq")
  const code = nextCode(uow, "inquiry")
  const inquiry: Inquiry = {
    id: inquiryId,
    code,
    type: input.type,
    customerId: customer.id,
    contactSnapshot: { fullName: input.contact.fullName.trim(), phone: customer.phone, email: customer.email },
    source: channel.source,
    packageId: pkg?.id,
    destinationIds,
    travelDates: input.travelDates,
    durationDays: input.durationDays,
    groupSize: input.groupSize,
    budgetPerPax: input.budgetPerPax,
    interests: input.interests ?? [],
    message: input.message?.trim() || undefined,
    stage: "new",
    assigneeId: channel.source === "website" ? undefined : channel.userId,
    followUps: [],
    createdAt: uow.now,
    updatedAt: uow.now,
  }
  uow.inquiries.insert(inquiry)
  logActivity(uow, {
    actor: channel.source === "website" ? { kind: "customer", customerId: customer.id } : { kind: "user", userId: channel.userId },
    subject: { type: "inquiry", id: inquiryId },
    related: [{ type: "customer", id: customer.id }],
    action: "inquiry.created",
    message: `Inquiry ${code} masuk dari ${SOURCE_LABEL[channel.source]}: ${inquiry.contactSnapshot.fullName}, ${input.groupSize} orang`,
  })
  return { inquiryId, code }
}

export const submitWebsiteInquiry = (input: WebsiteInquiryInput) => runCommand((uow) => placeWebsiteInquiry(uow, input))
