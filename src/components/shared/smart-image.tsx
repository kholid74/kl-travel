import Image, { type ImageProps } from "next/image"
import { getMedia } from "@/data/media"
import { cn } from "@/lib/utils"

type SmartImageProps = Omit<ImageProps, "src" | "alt" | "width" | "height" | "placeholder" | "blurDataURL"> & {
  mediaId: string
  /** Overrides the catalogue alt text (use "" for decorative images). */
  alt?: string
}

/**
 * next/image bound to the media catalogue: alt text, intrinsic size, and blur placeholder
 * come from the asset. Use `fill` with a sized parent for art-directed crops.
 */
export function SmartImage({ mediaId, alt, className, fill, sizes, ...props }: SmartImageProps) {
  const asset = getMedia(mediaId)
  if (!asset) {
    return <div role="img" aria-label={alt ?? "Gambar tidak tersedia"} className={cn("bg-muted", className)} />
  }
  const text = alt ?? asset.alt
  const shared = {
    src: asset.src,
    placeholder: asset.blurDataURL ? ("blur" as const) : undefined,
    blurDataURL: asset.blurDataURL,
    className: cn("object-cover", className),
    sizes: sizes ?? (fill ? "100vw" : undefined),
    ...props,
  }
  return fill ? (
    <Image {...shared} alt={text} fill />
  ) : (
    <Image {...shared} alt={text} width={asset.width} height={asset.height} />
  )
}

export function PhotoCredit({ mediaId, className }: { mediaId: string; className?: string }) {
  const asset = getMedia(mediaId)
  if (!asset) return null
  return (
    <a
      href={asset.credit.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className={cn("text-[0.6875rem] text-current/85 underline-offset-2 hover:underline", className)}
    >
      Foto: {asset.credit.photographer} / Unsplash
    </a>
  )
}
