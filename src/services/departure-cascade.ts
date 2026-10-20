import type { Actor, ID } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"

/**
 * A Private Departure exists for exactly one booking (ADR-0004), so cancelling that
 * booking cancels the departure too. No-op for scheduled departures.
 */
export function cancelPrivateDepartureOf(uow: UnitOfWork, input: { departureId: ID; reason: string; actor: Actor }) {
  const departure = uow.departures.get(input.departureId)
  if (!departure || departure.kind !== "private" || departure.cancelledAt) return
  uow.departures.update(departure.id, { cancelledAt: uow.now, cancellationReason: input.reason, updatedAt: uow.now })
  logActivity(uow, {
    actor: input.actor,
    subject: { type: "departure", id: departure.id },
    action: "departure.cancelled",
    message: `Keberangkatan privat ${departure.code} dibatalkan: ${input.reason}`,
  })
}
