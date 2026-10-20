import { createId } from "@/lib/ids"
import type { ActivityEvent } from "@/domain/entities"
import type { Actor, EntityType, ID } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"

export function logActivity(
  uow: UnitOfWork,
  input: {
    actor: Actor
    subject: { type: EntityType; id: ID }
    related?: { type: EntityType; id: ID }[]
    action: string
    message: string
    data?: ActivityEvent["data"]
    at?: string
  },
): ActivityEvent {
  return uow.activity.insert({
    id: createId("act"),
    at: input.at ?? uow.now,
    actor: input.actor,
    subject: input.subject,
    related: input.related ?? [],
    action: input.action,
    message: input.message,
    data: input.data,
  })
}

export const SYSTEM_ACTOR: Actor = { kind: "system" }
