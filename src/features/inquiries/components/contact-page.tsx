"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AlertTriangle, Clock, Loader2, Mail, MapPin, MessageCircle } from "lucide-react"
import { Field } from "@/components/shared/field"
import { DemoNotice } from "@/components/shared/demo-notice"
import { SimulatedAction } from "@/components/shared/simulated-action"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ContactFields } from "@/features/customers/components/contact-fields"
import { sampleContact } from "@/features/customers/schemas"
import { usePublicContent } from "@/features/content/hooks/use-public-content"
import { usePublicCatalog } from "@/features/packages/hooks/use-public-catalog"
import { submitWebsiteInquiry } from "@/services/inquiry-service"
import type { PublicCatalog, PublicContent } from "@/services/queries/catalog"
import { contactQuestionSchema, EMPTY_CONTACT, type ContactQuestionValues } from "../schemas"

const NO_PACKAGE = "tanpa-paket"

interface Props {
  initialContent: PublicContent
  initialCatalog: PublicCatalog
}

/** Reads ?paket=<slug> to preselect the package asked about; must sit inside <Suspense>. */
export function ContactPageRoute(props: Props) {
  const slug = useSearchParams().get("paket")
  const { packages } = usePublicCatalog(props.initialCatalog)
  const pkg = slug ? packages.find((p) => p.slug === slug) : undefined
  return <ContactPage key={pkg?.id ?? NO_PACKAGE} {...props} initialPackageId={pkg?.id} />
}

export function ContactPageFallback(props: Props) {
  return <ContactPage {...props} />
}

function ContactPage({ initialContent, initialCatalog, initialPackageId }: Props & { initialPackageId?: string }) {
  const router = useRouter()
  const { siteContent } = usePublicContent(initialContent)
  const { packages } = usePublicCatalog(initialCatalog)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { contact } = siteContent

  const form = useForm<ContactQuestionValues>({
    resolver: zodResolver(contactQuestionSchema),
    mode: "onTouched",
    defaultValues: {
      contact: EMPTY_CONTACT,
      packageId: initialPackageId ?? NO_PACKAGE,
      message: initialPackageId ? "Kapan jadwal berikutnya untuk paket ini dibuka?" : "",
    },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    const result = await submitWebsiteInquiry({
      type: "general",
      contact: values.contact,
      packageId: values.packageId === NO_PACKAGE ? undefined : values.packageId,
      travelDates: { kind: "flexible" },
      groupSize: 1,
      message: values.message,
    })
    if (!result.ok) {
      setSubmitError(result.error.message)
      return
    }
    toast.success("Pertanyaan terkirim", { description: `Kode ${result.data.code}` })
    router.push(`/konfirmasi/permintaan/${result.data.code}`)
  })

  const info = [
    { icon: MapPin, label: "Kantor", value: contact.address },
    { icon: Mail, label: "Email", value: contact.email },
    { icon: MessageCircle, label: "WhatsApp", value: `${contact.whatsappDisplay} (simulasi)` },
    { icon: Clock, label: "Jam operasional", value: contact.officeHours },
  ]

  return (
    <div className="container-page grid gap-14 pt-12 pb-24 md:pt-16 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-5">
        <p className="eyebrow text-lagoon-700">Kontak</p>
        <h1 className="mt-3 font-display text-display-lg text-balance text-ocean-900">Ada yang ingin ditanyakan?</h1>
        <p className="mt-4 text-body-lg text-muted-foreground">
          Tentang jadwal, tingkat kesulitan, atau perlengkapan yang perlu dibawa. Tim kami membalas dalam 1 hari kerja.
        </p>
        <dl className="mt-10 divide-y divide-border border-y border-border">
          {info.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex gap-4 py-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-lagoon-700" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
                <dd className="mt-0.5 text-sm">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        <SimulatedAction
          title="Chat WhatsApp"
          description="Tombol ini tidak membuka WhatsApp karena NusaVista Journey adalah brand fiktif dan nomornya bukan nomor sungguhan."
          production="Tombol membuka percakapan WhatsApp Business dengan pesan awal berisi nama paket, dan setiap chat tercatat sebagai inquiry di dashboard."
        >
          <Button variant="secondary" size="lg" className="mt-8">
            <MessageCircle aria-hidden="true" /> Chat WhatsApp
          </Button>
        </SimulatedAction>
      </div>

      <div className="lg:col-span-7">
        <form onSubmit={onSubmit} noValidate className="rounded-[4px] border border-border bg-card p-6 md:p-8">
          <h2 className="text-heading font-semibold text-ocean-900">Kirim pertanyaan</h2>
          <DemoNotice className="mt-4 mb-6">
            Situs demo: gunakan data fiktif.{" "}
            <button type="button" onClick={() => form.setValue("contact", sampleContact(), { shouldValidate: true })} className="font-semibold underline underline-offset-2">
              Isi data contoh
            </button>
          </DemoNotice>
          {submitError && (
            <p role="alert" className="mb-6 flex gap-2.5 rounded-md bg-tone-danger-bg px-4 py-3 text-sm text-tone-danger">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {submitError}
            </p>
          )}
          <div className="grid gap-5">
            <ContactFields register={(field) => form.register(`contact.${field}`)} errors={errors.contact} />
            <Field label="Terkait paket" optional>
              {(c) => (
                <Controller
                  control={form.control}
                  name="packageId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={c.id} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PACKAGE}>Tidak terkait paket tertentu</SelectItem>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </Field>
            <Field label="Pertanyaan" error={errors.message?.message}>
              {(c) => <Textarea {...c} {...form.register("message")} rows={5} />}
            </Field>
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            Kirim pertanyaan
          </Button>
        </form>
      </div>
    </div>
  )
}
