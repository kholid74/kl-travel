import type { Timestamp } from "@/lib/dates"
import { DomainError } from "@/lib/result"
import type { DemoDatabase, Table } from "@/domain/database"
import type { ID } from "@/domain/types/common"
import type { Repository, SingletonRepository, UnitOfWork } from "../interfaces"

function tableRepository<T extends { id: ID }>(table: Table<T>, label: string): Repository<T> {
  return {
    get: (id) => table[id],
    require(id) {
      const item = table[id]
      if (!item) throw new DomainError("NOT_FOUND", `Data ${label} tidak ditemukan.`)
      return item
    },
    list: () => Object.values(table),
    find: (predicate) => Object.values(table).filter(predicate),
    insert(entity) {
      table[entity.id] = entity
      return entity
    },
    update(id, patch) {
      const current = table[id]
      if (!current) throw new DomainError("NOT_FOUND", `Data ${label} tidak ditemukan.`)
      const next = { ...current, ...patch }
      table[id] = next
      return next
    },
    remove(id) {
      delete table[id]
    },
  }
}

function singleton<K extends "siteContent" | "settings" | "meta">(draft: DemoDatabase, key: K): SingletonRepository<DemoDatabase[K]> {
  return {
    get: () => draft[key],
    set(value) {
      draft[key] = value
      return value
    },
  }
}

/** Unit of work over a mutable working copy of the database. */
export function createUnitOfWork(draft: DemoDatabase, now: Timestamp): UnitOfWork {
  return {
    now,
    destinations: tableRepository(draft.destinations, "destinasi"),
    packages: tableRepository(draft.packages, "paket"),
    departures: tableRepository(draft.departures, "keberangkatan"),
    guides: tableRepository(draft.guides, "guide"),
    vendors: tableRepository(draft.vendors, "vendor"),
    vendorAssignments: tableRepository(draft.vendorAssignments, "penugasan vendor"),
    checklists: tableRepository(draft.checklists, "checklist"),
    costItems: tableRepository(draft.costItems, "komponen biaya"),
    customers: tableRepository(draft.customers, "pelanggan"),
    travelers: tableRepository(draft.travelers, "peserta"),
    bookings: tableRepository(draft.bookings, "booking"),
    bookingTravelers: tableRepository(draft.bookingTravelers, "peserta booking"),
    inquiries: tableRepository(draft.inquiries, "inquiry"),
    quotations: tableRepository(draft.quotations, "penawaran"),
    invoices: tableRepository(draft.invoices, "invoice"),
    payments: tableRepository(draft.payments, "pembayaran"),
    articles: tableRepository(draft.articles, "artikel"),
    testimonials: tableRepository(draft.testimonials, "testimoni"),
    users: tableRepository(draft.users, "anggota tim"),
    roles: tableRepository(draft.roles, "peran"),
    activity: tableRepository(draft.activity, "aktivitas"),
    siteContent: singleton(draft, "siteContent"),
    settings: singleton(draft, "settings"),
    meta: singleton(draft, "meta"),
    snapshot: () => draft,
  }
}
