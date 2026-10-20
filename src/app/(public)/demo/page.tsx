import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, Globe, LayoutDashboard } from "lucide-react"
import { DemoJourneyGrid } from "@/features/demo/components/demo-journey"
import { DemoPanel } from "@/features/demo/components/demo-panel"

export const metadata: Metadata = {
  title: "Panduan demo",
  description: "Cara menjelajahi showcase NusaVista Journey: website travel publik dan dashboard operasional dalam satu data demo.",
}

const SIMULATED = [
  "Semua data tersimpan di browser ini (localStorage). Perubahan bertahan setelah refresh dan tersinkron antar-tab, tetapi tidak antar-perangkat.",
  "Tidak ada pembayaran, WhatsApp, email, atau login sungguhan. Aksi seperti itu ditandai Simulasi.",
  "Nama pelanggan, nomor telepon, rekening bank, dan testimoni adalah fiktif.",
  "Tanggal keberangkatan dihitung relatif terhadap hari pertama Anda membuka demo. Reset untuk menyegarkannya.",
]

export default function DemoPage() {
  return (
    <div className="container-page pt-12 pb-24 md:pt-16">
      <p className="eyebrow text-lagoon-700">Showcase</p>
      <h1 className="mt-3 max-w-4xl font-display text-display-lg text-balance text-ocean-900">
        Website travel dan dashboard operasional, dalam satu data demo
      </h1>
      <p className="mt-4 max-w-2xl text-body-lg text-muted-foreground">
        NusaVista Journey adalah operator perjalanan fiktif. Booking yang Anda buat di website langsung muncul di dashboard, dan perubahan
        di dashboard langsung terlihat di website.
      </p>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {[
          { href: "/", icon: Globe, title: "Website publik", body: "Beranda, paket, destinasi, alur booking open trip, serta permintaan private dan custom trip." },
          { href: "/dashboard", icon: LayoutDashboard, title: "Dashboard operasional", body: "Booking, inquiry, keberangkatan, pembayaran, operasional trip, HPP, dan laporan." },
        ].map(({ href, icon: Icon, title, body }) => (
          <Link key={href} href={href} className="group flex flex-col rounded-[4px] border border-border bg-card p-6 transition-colors hover:border-ocean-900 md:p-8">
            <span className="flex items-center justify-between">
              <Icon className="size-6 text-lagoon-700" strokeWidth={1.5} aria-hidden="true" />
              <ArrowUpRight className="size-5 text-ocean-900 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
            <span className="mt-6 font-display text-3xl text-ocean-900">{title}</span>
            <span className="mt-2 text-sm text-muted-foreground">{body}</span>
          </Link>
        ))}
      </div>

      <section aria-labelledby="perjalanan-demo" className="mt-20">
        <h2 id="perjalanan-demo" className="font-display text-display-md text-ocean-900">
          Perjalanan demo yang disarankan
        </h2>
        <DemoJourneyGrid />
      </section>

      <section aria-labelledby="simulasi" className="mt-20 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 id="simulasi" className="font-display text-display-md text-ocean-900">
            Apa yang disimulasikan
          </h2>
          <ul className="mt-6 space-y-3">
            {SIMULATED.map((item) => (
              <li key={item} className="flex gap-3 text-muted-foreground">
                <span aria-hidden="true" className="mt-3 h-px w-4 shrink-0 bg-sand-500" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted-foreground">
            Showcase ini dikembangkan oleh <span className="font-semibold text-foreground">Kalsara Digital Studio</span>. Foto dari Unsplash, lihat{" "}
            <Link href="/kredit-foto" className="font-semibold text-lagoon-700 underline underline-offset-4">
              kredit foto
            </Link>
            .
          </p>
        </div>
        <div className="lg:col-span-5">
          <div className="rounded-[4px] border border-border bg-card p-6">
            <DemoPanel context="public" />
          </div>
        </div>
      </section>
    </div>
  )
}
