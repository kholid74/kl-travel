import type { MediaAsset } from "@/domain/entities"
import { MEDIA_ASSETS } from "./fixtures/media.generated"

const byId = new Map(MEDIA_ASSETS.map((asset) => [asset.id, asset]))

/** Static image catalogue (never stored in the browser database). */
export function getMedia(id: string | undefined): MediaAsset | undefined {
  return id ? byId.get(id) : undefined
}

export function listMedia(tag?: string): MediaAsset[] {
  return tag ? MEDIA_ASSETS.filter((asset) => asset.tags.includes(tag)) : MEDIA_ASSETS
}
