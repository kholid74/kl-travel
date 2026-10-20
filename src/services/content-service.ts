import { createId } from "@/lib/ids"
import { DomainError } from "@/lib/result"
import { SLUG_PATTERN, slugify } from "@/lib/slug"
import type { Article, ArticleBlock, SiteContent, Testimonial } from "@/domain/entities"
import type { ID } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { requirePermission, userActor } from "./authz"
import { runCommand } from "./runtime"

export const MAX_FEATURED_PACKAGES = 6
export const MAX_FEATURED_DESTINATIONS = 5

/** Sections of Site Content an editor saves independently. */
export type SiteSection = "hero" | "promoBanner" | "featured" | "whyUs" | "homepageFaqs" | "about" | "contact"

export type SiteSectionInput = {
  hero: SiteContent["hero"]
  promoBanner: SiteContent["promoBanner"]
  featured: Pick<SiteContent, "featuredPackageIds" | "featuredDestinationIds">
  whyUs: SiteContent["whyUs"]
  homepageFaqs: SiteContent["homepageFaqs"]
  about: SiteContent["about"]
  contact: SiteContent["contact"]
}

const SECTION_LABEL: Record<SiteSection, string> = {
  hero: "hero beranda",
  promoBanner: "banner promo",
  featured: "paket dan destinasi unggulan",
  whyUs: "keunggulan",
  homepageFaqs: "FAQ beranda",
  about: "halaman Tentang",
  contact: "info kontak",
}

const required = (value: string, message: string, field?: string) => {
  if (!value.trim()) throw new DomainError("VALIDATION", message, field)
  return value.trim()
}

function cleanSection<S extends SiteSection>(uow: UnitOfWork, section: S, input: SiteSectionInput[S]): Partial<SiteContent> {
  switch (section) {
    case "hero": {
      const hero = input as SiteContent["hero"]
      return {
        hero: {
          eyebrow: hero.eyebrow.trim(),
          title: required(hero.title, "Judul hero wajib diisi.", "title"),
          subtitle: required(hero.subtitle, "Subjudul hero wajib diisi.", "subtitle"),
          mediaId: required(hero.mediaId, "Pilih foto hero.", "mediaId"),
          ctaLabel: required(hero.ctaLabel, "Label tombol wajib diisi.", "ctaLabel"),
        },
      }
    }
    case "promoBanner": {
      const banner = input as SiteContent["promoBanner"]
      const message = banner.message.trim()
      if (banner.enabled && !message) throw new DomainError("VALIDATION", "Isi pesan banner sebelum menampilkannya.", "message")
      const linkHref = banner.linkHref?.trim() || undefined
      if (linkHref && !linkHref.startsWith("/")) throw new DomainError("VALIDATION", "Tautan harus halaman di website ini, diawali “/”.", "linkHref")
      return { promoBanner: { enabled: banner.enabled, message, linkLabel: banner.linkLabel?.trim() || undefined, linkHref } }
    }
    case "featured": {
      const featured = input as SiteSectionInput["featured"]
      const packageIds = [...new Set(featured.featuredPackageIds)]
      const destinationIds = [...new Set(featured.featuredDestinationIds)]
      if (packageIds.length > MAX_FEATURED_PACKAGES) throw new DomainError("VALIDATION", `Maksimal ${MAX_FEATURED_PACKAGES} paket unggulan.`, "featuredPackageIds")
      if (destinationIds.length > MAX_FEATURED_DESTINATIONS) {
        throw new DomainError("VALIDATION", `Maksimal ${MAX_FEATURED_DESTINATIONS} destinasi unggulan.`, "featuredDestinationIds")
      }
      for (const id of packageIds) {
        const pkg = uow.packages.require(id)
        if (pkg.status !== "published" || pkg.visibility !== "catalog") throw new DomainError("VALIDATION", `${pkg.title} belum tampil di website.`, "featuredPackageIds")
      }
      for (const id of destinationIds) {
        const destination = uow.destinations.require(id)
        if (destination.status !== "published") throw new DomainError("VALIDATION", `${destination.name} belum dipublikasikan.`, "featuredDestinationIds")
      }
      return { featuredPackageIds: packageIds, featuredDestinationIds: destinationIds }
    }
    case "whyUs": {
      const items = input as SiteContent["whyUs"]
      if (items.length < 2 || items.length > 6) throw new DomainError("VALIDATION", "Tampilkan 2 sampai 6 keunggulan.")
      return {
        whyUs: items.map((item, i) => ({
          icon: item.icon,
          title: required(item.title, `Keunggulan ${i + 1}: judul wajib diisi.`),
          body: required(item.body, `Keunggulan ${i + 1}: deskripsi wajib diisi.`),
        })),
      }
    }
    case "homepageFaqs": {
      const faqs = input as SiteContent["homepageFaqs"]
      return {
        homepageFaqs: faqs.map((faq, i) => ({
          question: required(faq.question, `FAQ ${i + 1}: pertanyaan wajib diisi.`),
          answer: required(faq.answer, `FAQ ${i + 1}: jawaban wajib diisi.`),
        })),
      }
    }
    case "about": {
      const about = input as SiteContent["about"]
      const story = about.story.map((p) => p.trim()).filter(Boolean)
      if (story.length === 0) throw new DomainError("VALIDATION", "Tulis minimal satu paragraf cerita.", "story")
      return {
        about: {
          headline: required(about.headline, "Judul halaman wajib diisi.", "headline"),
          intro: required(about.intro, "Pengantar wajib diisi.", "intro"),
          story,
          values: about.values
            .filter((v) => v.title.trim() || v.body.trim())
            .map((v, i) => ({ title: required(v.title, `Nilai ${i + 1}: judul wajib diisi.`), body: required(v.body, `Nilai ${i + 1}: deskripsi wajib diisi.`) })),
          mediaIds: about.mediaIds,
        },
      }
    }
    case "contact": {
      const contact = input as SiteContent["contact"]
      const email = required(contact.email, "Email wajib diisi.", "email")
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError("VALIDATION", "Format email tidak valid.", "email")
      return {
        contact: {
          address: required(contact.address, "Alamat wajib diisi.", "address"),
          email,
          whatsappDisplay: required(contact.whatsappDisplay, "Nomor WhatsApp wajib diisi.", "whatsappDisplay"),
          officeHours: required(contact.officeHours, "Jam operasional wajib diisi.", "officeHours"),
        },
      }
    }
  }
  throw new DomainError("VALIDATION", "Bagian konten tidak dikenal.")
}

/** Saves one section of Site Content; the public website reads it live (ADR-0003). */
export function updateSiteSection<S extends SiteSection>(uow: UnitOfWork, userId: ID, section: S, input: SiteSectionInput[S]) {
  requirePermission(uow, userId, "content.manage")
  const patch = cleanSection(uow, section, input)
  uow.siteContent.set({ ...uow.siteContent.get(), ...patch, updatedAt: uow.now, updatedBy: userId })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "site_content", id: "site" },
    action: "content.updated",
    message: `Konten website diperbarui: ${SECTION_LABEL[section]}`,
  })
}

export type ArticleInput = Pick<Article, "title" | "slug" | "excerpt" | "category" | "destinationId" | "coverMediaId" | "body" | "authorName">

/** Reasons an article cannot be published yet, in editor order. */
export function articlePublishBlockers(article: Pick<Article, "title" | "excerpt" | "coverMediaId" | "body">): string[] {
  const blockers: string[] = []
  if (article.title.trim().length < 5) blockers.push("Tulis judul minimal 5 karakter.")
  if (!article.excerpt.trim()) blockers.push("Tulis ringkasan artikel.")
  if (!article.coverMediaId) blockers.push("Pilih foto sampul.")
  if (!article.body.some((b) => b.type === "paragraph" && b.text.trim())) blockers.push("Tambahkan minimal satu paragraf.")
  return blockers
}

function cleanBlocks(blocks: ArticleBlock[]): ArticleBlock[] {
  return blocks.flatMap((block): ArticleBlock[] => {
    switch (block.type) {
      case "list": {
        const items = block.items.map((i) => i.trim()).filter(Boolean)
        return items.length ? [{ type: "list", items }] : []
      }
      case "image":
        return block.mediaId ? [{ type: "image", mediaId: block.mediaId, caption: block.caption?.trim() || undefined }] : []
      default:
        return block.text.trim() ? [{ ...block, text: block.text.trim() }] : []
    }
  })
}

function uniqueArticleSlug(uow: UnitOfWork, wanted: string, exceptId?: ID) {
  const taken = (slug: string) => uow.articles.find((a) => a.slug === slug && a.id !== exceptId).length > 0
  if (!taken(wanted)) return wanted
  let n = 2
  while (taken(`${wanted}-${n}`)) n++
  return `${wanted}-${n}`
}

/** Creates (no id) or updates an article. New articles start as drafts. */
export function saveArticle(uow: UnitOfWork, userId: ID, input: ArticleInput, articleId?: ID): Article {
  requirePermission(uow, userId, "content.manage")
  const title = required(input.title, "Judul wajib diisi.", "title")
  const slug = input.slug.trim() || slugify(title)
  if (!SLUG_PATTERN.test(slug)) throw new DomainError("VALIDATION", "Slug hanya boleh huruf kecil, angka, dan tanda hubung.", "slug")
  if (uow.articles.find((a) => a.slug === slug && a.id !== articleId).length && input.slug.trim()) {
    throw new DomainError("CONFLICT", "Slug sudah dipakai artikel lain.", "slug")
  }
  if (input.destinationId) uow.destinations.require(input.destinationId)
  const fields = {
    title,
    slug: uniqueArticleSlug(uow, slug, articleId),
    excerpt: input.excerpt.trim(),
    category: input.category,
    destinationId: input.destinationId || undefined,
    coverMediaId: input.coverMediaId,
    body: cleanBlocks(input.body),
    authorName: required(input.authorName, "Nama penulis wajib diisi.", "authorName"),
  }
  const actor = userActor(userId)
  if (articleId) {
    const current = uow.articles.require(articleId)
    if (current.status === "published") {
      const blockers = articlePublishBlockers(fields)
      if (blockers.length) throw new DomainError("VALIDATION", `Artikel sedang tayang: ${blockers[0]}`)
    }
    const updated = uow.articles.update(articleId, { ...fields, updatedAt: uow.now })
    logActivity(uow, { actor, subject: { type: "article", id: articleId }, action: "article.updated", message: `Artikel "${updated.title}" diperbarui` })
    return updated
  }
  const article = uow.articles.insert({ id: createId("art"), ...fields, status: "draft", createdAt: uow.now, updatedAt: uow.now })
  logActivity(uow, { actor, subject: { type: "article", id: article.id }, action: "article.created", message: `Draf artikel "${article.title}" dibuat` })
  return article
}

export function setArticleStatus(uow: UnitOfWork, userId: ID, articleId: ID, status: Article["status"]): Article {
  requirePermission(uow, userId, "content.manage")
  const article = uow.articles.require(articleId)
  if (article.status === status) return article
  if (status === "published") {
    const blockers = articlePublishBlockers(article)
    if (blockers.length) throw new DomainError("VALIDATION", blockers[0])
  }
  const updated = uow.articles.update(articleId, {
    status,
    publishedAt: status === "published" ? (article.publishedAt ?? uow.now) : article.publishedAt,
    updatedAt: uow.now,
  })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "article", id: articleId },
    action: status === "published" ? "article.published" : "article.unpublished",
    message: status === "published" ? `Artikel "${article.title}" dipublikasikan` : `Artikel "${article.title}" dijadikan draf`,
  })
  return updated
}

/** Only drafts can be deleted; a published article is unpublished first. */
export function deleteArticle(uow: UnitOfWork, userId: ID, articleId: ID) {
  requirePermission(uow, userId, "content.manage")
  const article = uow.articles.require(articleId)
  if (article.status === "published") throw new DomainError("INVALID_TRANSITION", "Jadikan draf terlebih dahulu sebelum menghapus.")
  uow.articles.remove(articleId)
  logActivity(uow, { actor: userActor(userId), subject: { type: "article", id: articleId }, action: "article.deleted", message: `Draf artikel "${article.title}" dihapus` })
}

export type TestimonialInput = Pick<Testimonial, "authorName" | "quote" | "packageId" | "tripMonth">

/** Testimonials are illustrative (no verified reviews); the website labels them so. */
export function saveTestimonial(uow: UnitOfWork, userId: ID, input: TestimonialInput, testimonialId?: ID): Testimonial {
  requirePermission(uow, userId, "content.manage")
  const quote = required(input.quote, "Isi testimoni wajib diisi.", "quote")
  if (quote.length > 400) throw new DomainError("VALIDATION", "Testimoni maksimal 400 karakter.", "quote")
  const fields = {
    authorName: required(input.authorName, "Nama dan kota wajib diisi.", "authorName"),
    quote,
    packageId: input.packageId || undefined,
    tripMonth: input.tripMonth || undefined,
  }
  if (fields.packageId) uow.packages.require(fields.packageId)
  if (fields.tripMonth && !/^\d{4}-\d{2}$/.test(fields.tripMonth)) throw new DomainError("VALIDATION", "Bulan trip tidak valid.", "tripMonth")
  const actor = userActor(userId)
  if (testimonialId) {
    const updated = uow.testimonials.update(testimonialId, { ...fields, updatedAt: uow.now })
    logActivity(uow, { actor, subject: { type: "testimonial", id: testimonialId }, action: "testimonial.updated", message: `Testimoni ${fields.authorName} diperbarui` })
    return updated
  }
  const testimonial = uow.testimonials.insert({ id: createId("tst"), ...fields, status: "hidden", createdAt: uow.now, updatedAt: uow.now })
  logActivity(uow, { actor, subject: { type: "testimonial", id: testimonial.id }, action: "testimonial.created", message: `Testimoni ${fields.authorName} ditambahkan (disembunyikan)` })
  return testimonial
}

export function setTestimonialStatus(uow: UnitOfWork, userId: ID, testimonialId: ID, status: Testimonial["status"]): Testimonial {
  requirePermission(uow, userId, "content.manage")
  const testimonial = uow.testimonials.require(testimonialId)
  if (testimonial.status === status) return testimonial
  const updated = uow.testimonials.update(testimonialId, { status, updatedAt: uow.now })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "testimonial", id: testimonialId },
    action: status === "published" ? "testimonial.published" : "testimonial.hidden",
    message: `Testimoni ${testimonial.authorName} ${status === "published" ? "ditampilkan" : "disembunyikan"}`,
  })
  return updated
}

export const contentCommands = {
  updateSection: <S extends SiteSection>(userId: ID, section: S, input: SiteSectionInput[S]) => runCommand((uow) => updateSiteSection(uow, userId, section, input)),
  saveArticle: (userId: ID, input: ArticleInput, articleId?: ID) => runCommand((uow) => saveArticle(uow, userId, input, articleId)),
  setArticleStatus: (userId: ID, articleId: ID, status: Article["status"]) => runCommand((uow) => setArticleStatus(uow, userId, articleId, status)),
  deleteArticle: (userId: ID, articleId: ID) => runCommand((uow) => deleteArticle(uow, userId, articleId)),
  saveTestimonial: (userId: ID, input: TestimonialInput, testimonialId?: ID) => runCommand((uow) => saveTestimonial(uow, userId, input, testimonialId)),
  setTestimonialStatus: (userId: ID, testimonialId: ID, status: Testimonial["status"]) => runCommand((uow) => setTestimonialStatus(uow, userId, testimonialId, status)),
}
