import { describe, expect, it } from "vitest"
import { DomainError } from "@/lib/result"
import { validateDatabase } from "@/domain/rules/validate-database"
import { LocalDatabase } from "@/repositories/mock/local-database"
import { createMemoryStorage } from "@/repositories/mock/storage"
import type { UnitOfWork } from "@/repositories"
import { approveBooking } from "./booking-admin-service"
import { placeWebsiteBooking } from "./booking-service"
import { deleteArticle, saveArticle, saveTestimonial, setArticleStatus, setTestimonialStatus, updateSiteSection, type ArticleInput } from "./content-service"
import { demoJourney, journeyVisitFor } from "./demo-service"
import { recordPayment, verifyPayment } from "./payment-service"
import { selectPublicContent, upcomingDepartures } from "./queries/catalog"
import { updateSettings } from "./settings-service"
import { changeMemberRole, inviteMember, setMemberStatus, setRolePermission } from "./team-service"

const NOW = "2026-10-20T03:00:00.000Z"
const TODAY = "2026-10-20"
const OWNER = "usr_rania"
const SALES = "usr_dimas"
const FINANCE = "usr_lestari"
const CONTENT = "usr_nadia"

/** A clock that moves one minute per read, like real use after the seed. */
function setup() {
  let t = Date.parse(NOW)
  const db = new LocalDatabase({ storage: createMemoryStorage(), clock: { now: () => new Date((t += 60_000)) } })
  db.load()
  return db
}

function expectError(fn: () => unknown, code: DomainError["code"]) {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError)
    expect((error as DomainError).code).toBe(code)
    return
  }
  throw new Error(`Expected DomainError ${code}`)
}

const run = <T,>(db: LocalDatabase, work: (uow: UnitOfWork) => T) => db.transaction(work)
const valid = (db: LocalDatabase) => expect(validateDatabase(db.current().db, new Date(Date.parse(NOW) + 86_400_000).toISOString())).toEqual([])

const draftArticle: ArticleInput = {
  title: "Packing list snorkeling di Nusa Penida",
  slug: "",
  excerpt: "Barang yang perlu dibawa untuk satu hari di laut.",
  category: "tips",
  coverMediaId: "",
  body: [
    { type: "heading", text: "Sebelum berangkat" },
    { type: "paragraph", text: "  " },
  ],
  authorName: "Tim NusaVista",
}

describe("site content", () => {
  it("saves sections the public website reads, and only content editors may", () => {
    const db = setup()
    expectError(() => run(db, (uow) => updateSiteSection(uow, SALES, "promoBanner", { enabled: true, message: "Promo" })), "PERMISSION_DENIED")
    expectError(() => run(db, (uow) => updateSiteSection(uow, CONTENT, "promoBanner", { enabled: true, message: " " })), "VALIDATION")
    expectError(() => run(db, (uow) => updateSiteSection(uow, CONTENT, "promoBanner", { enabled: true, message: "Promo", linkHref: "https://contoh.com" })), "VALIDATION")
    run(db, (uow) => updateSiteSection(uow, CONTENT, "promoBanner", { enabled: true, message: "  Diskon 10% Bromo  ", linkHref: "/paket" }))
    expect(selectPublicContent(db.current().db).siteContent.promoBanner).toMatchObject({ enabled: true, message: "Diskon 10% Bromo", linkHref: "/paket" })
    expect(db.current().db.siteContent.updatedBy).toBe(CONTENT)
  })

  it("only features published packages and destinations, within the limits", () => {
    const db = setup()
    const snapshot = db.current().db
    const draft = Object.values(snapshot.packages).find((p) => p.status === "draft")!
    const published = Object.values(snapshot.packages).filter((p) => p.status === "published" && p.visibility === "catalog").map((p) => p.id)
    const destinations = snapshot.siteContent.featuredDestinationIds
    expectError(() => run(db, (uow) => updateSiteSection(uow, CONTENT, "featured", { featuredPackageIds: [draft.id], featuredDestinationIds: destinations })), "VALIDATION")
    expectError(() => run(db, (uow) => updateSiteSection(uow, CONTENT, "featured", { featuredPackageIds: published.slice(0, 7), featuredDestinationIds: destinations })), "VALIDATION")
    run(db, (uow) => updateSiteSection(uow, CONTENT, "featured", { featuredPackageIds: [published[3], published[0], published[3]], featuredDestinationIds: destinations.slice(0, 2) }))
    expect(db.current().db.siteContent.featuredPackageIds).toEqual([published[3], published[0]])
  })
})

describe("articles and testimonials", () => {
  it("drafts an article, blocks publishing until it is complete, then shows it publicly", () => {
    const db = setup()
    const article = run(db, (uow) => saveArticle(uow, CONTENT, draftArticle))
    expect(article).toMatchObject({ status: "draft", slug: "packing-list-snorkeling-di-nusa-penida" })
    expect(article.body).toHaveLength(1) // the empty paragraph is dropped
    expectError(() => run(db, (uow) => setArticleStatus(uow, CONTENT, article.id, "published")), "VALIDATION")

    const complete = { ...draftArticle, coverMediaId: "img-np-kelingking", body: [...draftArticle.body, { type: "paragraph" as const, text: "Bawa sunscreen ramah terumbu." }] }
    run(db, (uow) => saveArticle(uow, CONTENT, complete, article.id))
    run(db, (uow) => setArticleStatus(uow, CONTENT, article.id, "published"))
    expect(selectPublicContent(db.current().db).articles.some((a) => a.id === article.id)).toBe(true)
    expectError(() => run(db, (uow) => saveArticle(uow, CONTENT, { ...complete, excerpt: "" }, article.id)), "VALIDATION")
    expectError(() => run(db, (uow) => deleteArticle(uow, CONTENT, article.id)), "INVALID_TRANSITION")

    const second = run(db, (uow) => saveArticle(uow, CONTENT, draftArticle))
    expect(second.slug).toBe("packing-list-snorkeling-di-nusa-penida-2")
    expectError(() => run(db, (uow) => saveArticle(uow, CONTENT, { ...draftArticle, slug: article.slug }, second.id)), "CONFLICT")
    run(db, (uow) => deleteArticle(uow, CONTENT, second.id))
    expect(db.current().db.articles[second.id]).toBeUndefined()
  })

  it("adds testimonials hidden and toggles their visibility", () => {
    const db = setup()
    const testimonial = run(db, (uow) => saveTestimonial(uow, CONTENT, { authorName: "Rara, Malang", quote: "Briefing jelas.", tripMonth: "2026-08" }))
    expect(testimonial.status).toBe("hidden")
    expect(selectPublicContent(db.current().db).testimonials.some((t) => t.id === testimonial.id)).toBe(false)
    run(db, (uow) => setTestimonialStatus(uow, CONTENT, testimonial.id, "published"))
    expect(selectPublicContent(db.current().db).testimonials.some((t) => t.id === testimonial.id)).toBe(true)
    expectError(() => run(db, (uow) => saveTestimonial(uow, CONTENT, { authorName: "X", quote: "Ok", tripMonth: "Agustus" })), "VALIDATION")
  })
})

describe("team and roles", () => {
  it("invites, activates, and protects the last owner and the persona in use", () => {
    const db = setup()
    const roles = Object.values(db.current().db.roles)
    const sales = roles.find((r) => r.key === "sales")!
    const owner = roles.find((r) => r.key === "owner")!
    expectError(() => run(db, (uow) => inviteMember(uow, SALES, { name: "Putu Ayu", email: "putu@nusavista.example", title: "", roleId: sales.id })), "PERMISSION_DENIED")
    const member = run(db, (uow) => inviteMember(uow, OWNER, { name: "Putu Ayu", email: "Putu@NusaVista.example", title: "", roleId: sales.id }))
    expect(member).toMatchObject({ status: "invited", email: "putu@nusavista.example", title: "Sales" })
    expectError(() => run(db, (uow) => inviteMember(uow, OWNER, { name: "Putu Lain", email: "putu@nusavista.example", title: "", roleId: sales.id })), "CONFLICT")
    run(db, (uow) => setMemberStatus(uow, OWNER, member.id, "active"))

    expectError(() => run(db, (uow) => setMemberStatus(uow, OWNER, OWNER, "inactive")), "INVALID_TRANSITION")
    expectError(() => run(db, (uow) => changeMemberRole(uow, OWNER, OWNER, sales.id)), "INVALID_TRANSITION")
    run(db, (uow) => changeMemberRole(uow, OWNER, member.id, owner.id))
    run(db, (uow) => changeMemberRole(uow, OWNER, OWNER, sales.id))
    expect(db.current().db.users[OWNER].roleId).toBe(sales.id)
  })

  it("changes what a role may do, but never the owner role", () => {
    const db = setup()
    const roles = Object.values(db.current().db.roles)
    const sales = roles.find((r) => r.key === "sales")!
    const owner = roles.find((r) => r.key === "owner")!
    const snapshot = db.current().db
    const pending = Object.values(snapshot.payments).find((p) => p.status === "pending_verification" && snapshot.bookings[p.bookingId].status === "awaiting_payment")!
    expectError(() => run(db, (uow) => setRolePermission(uow, OWNER, owner.id, "payments.verify", false)), "INVALID_TRANSITION")
    expectError(() => run(db, (uow) => verifyPayment(uow, SALES, pending.id)), "PERMISSION_DENIED")
    run(db, (uow) => setRolePermission(uow, OWNER, sales.id, "payments.verify", true))
    run(db, (uow) => verifyPayment(uow, SALES, pending.id))
    expect(db.current().db.payments[pending.id].status).toBe("verified")
    run(db, (uow) => setRolePermission(uow, OWNER, sales.id, "payments.verify", false))
    expect(db.current().db.roles[sales.id].permissions).not.toContain("payments.verify")
  })
})

describe("settings", () => {
  it("validates each section and applies booking rules to availability", () => {
    const db = setup()
    const booking = db.current().db.settings.booking
    expectError(() => run(db, (uow) => updateSettings(uow, OWNER, "booking", { ...booking, maxPaxPerBooking: 0 })), "VALIDATION")
    expectError(() => run(db, (uow) => updateSettings(uow, FINANCE, "booking", booking)), "PERMISSION_DENIED")
    expectError(() => run(db, (uow) => updateSettings(uow, OWNER, "invoice", { prefix: "inv nv", footerNote: "" })), "VALIDATION")
    run(db, (uow) => updateSettings(uow, OWNER, "invoice", { prefix: "inv/nv", footerNote: "Demo" }))
    expect(db.current().db.settings.invoice.prefix).toBe("INV/NV")

    run(db, (uow) => updateSettings(uow, OWNER, "booking", { ...booking, lowSeatThreshold: 10 }))
    const snapshot = db.current().db
    const limited = upcomingDepartures(snapshot, NOW, 50).filter((o) => o.seats.available <= 10)
    expect(limited.length).toBeGreaterThan(0)
    expect(limited.every((o) => o.status !== "open")).toBe(true)
    valid(db)
  })
})

describe("demo journey", () => {
  it("ticks steps from the data and from page visits after the seed", () => {
    const db = setup()
    const seededAt = db.current().db.meta.seededAt
    const later = new Date(Date.parse(seededAt) + 3_600_000).toISOString()
    const before = new Date(Date.parse(seededAt) - 1000).toISOString()
    expect(demoJourney(db.current().db, {}).filter((s) => s.done)).toHaveLength(0)
    expect(demoJourney(db.current().db, { package: before, reports: before }).filter((s) => s.done)).toHaveLength(0)

    const option = upcomingDepartures(db.current().db, NOW, 50).find((o) => o.seats.available >= 2)!
    const { bookingId } = run(db, (uow) =>
      placeWebsiteBooking(uow, {
        packageId: option.pkg.id,
        departureId: option.departure.id,
        contact: { fullName: "Tamu Demo", phone: "0811-0000-7777", email: "tamu@example.com" },
        contactTravels: true,
        travelers: [{ fullName: "Tamu Demo" }, { fullName: "Teman Demo" }],
      }),
    )
    run(db, (uow) => approveBooking(uow, OWNER, bookingId))
    const deposit = db.current().db.invoices[Object.values(db.current().db.invoices).find((i) => i.bookingId === bookingId)!.id].installments[0].amount
    run(db, (uow) => recordPayment(uow, OWNER, { bookingId, amount: deposit, method: "transfer_bank", paidOn: TODAY }))

    const steps = demoJourney(db.current().db, { package: later, overview: new Date(Date.parse(NOW) + 86_400_000).toISOString() })
    expect(steps.map((s) => [s.key, s.done])).toEqual([
      ["explore", true],
      ["book", true],
      ["dashboard", true],
      ["review", true],
      ["payment", true],
      ["departure", false],
      ["stats", true],
    ])
    expect(journeyVisitFor("/paket/sailing-komodo-phinisi-3h2m")).toBe("package")
    expect(journeyVisitFor("/paket")).toBeNull()
    expect(journeyVisitFor("/dashboard/operations/dep_1")).toBe("departure")
    expect(journeyVisitFor("/dashboard/bookings")).toBe("dashboard")
  })
})
