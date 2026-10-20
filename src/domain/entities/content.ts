import type { EntityMeta, Faq, ID, Timestamp } from "../types/common"

export interface SiteContent {
  hero: { eyebrow: string; title: string; subtitle: string; mediaId: ID; ctaLabel: string }
  promoBanner: { enabled: boolean; message: string; linkLabel?: string; linkHref?: string }
  /** Display order, max 6. */
  featuredPackageIds: ID[]
  /** Destination highlights, max 5. */
  featuredDestinationIds: ID[]
  whyUs: { icon: string; title: string; body: string }[]
  homepageFaqs: Faq[]
  about: {
    headline: string
    intro: string
    story: string[]
    values: { title: string; body: string }[]
    mediaIds: ID[]
  }
  contact: { address: string; email: string; whatsappDisplay: string; officeHours: string }
  updatedAt: Timestamp
  updatedBy?: ID
}

export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "image"; mediaId: ID; caption?: string }

export interface Article extends EntityMeta {
  slug: string
  title: string
  excerpt: string
  category: "panduan" | "inspirasi" | "tips"
  destinationId?: ID
  coverMediaId: ID
  body: ArticleBlock[]
  authorName: string
  status: "draft" | "published"
  publishedAt?: Timestamp
}

export interface Testimonial extends EntityMeta {
  /** Fictional, e.g. "Dinda, Bandung". */
  authorName: string
  quote: string
  packageId?: ID
  /** "2026-08" */
  tripMonth?: string
  status: "published" | "hidden"
}
