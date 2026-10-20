import type { Article } from "@/domain/entities"

const WORDS_PER_MINUTE = 200

/** Estimated reading time, e.g. 4 → "4 menit baca". Deterministic, unlike publish dates. */
export function readingMinutes(article: Pick<Article, "body" | "excerpt">): number {
  let words = article.excerpt.split(/\s+/).length
  for (const block of article.body) {
    if (block.type === "list") words += block.items.join(" ").split(/\s+/).length
    else if (block.type !== "image") words += block.text.split(/\s+/).length
  }
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}
