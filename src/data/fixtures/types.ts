import type { EntityMeta } from "@/domain/types/common"

/** Editorial fixture: an entity without timestamps (the seed builder adds them). */
export type Fixture<T extends EntityMeta> = Omit<T, "createdAt" | "updatedAt">
