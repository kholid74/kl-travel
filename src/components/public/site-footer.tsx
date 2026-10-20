import Link from "next/link"
import { Logo } from "@/components/shared/logo"
import { getSeedDestinations, getSeedSiteContent } from "@/services/catalog-server"

const COLUMNS = [
  {
    title: "Paket",
    links: [
      { label: "Open Trip", href: "/paket?jenis=open" },
      { label: "Private Trip", href: "/paket?jenis=private" },
      { label: "Custom Trip", href: "/custom-trip" },
      { label: "Semua paket", href: "/paket" },
    ],
  },
  {
    title: "NusaVista",
    links: [
      { label: "Tentang kami", href: "/tentang" },
      { label: "Jurnal", href: "/jurnal" },
      { label: "Kontak", href: "/kontak" },
      { label: "Kredit foto", href: "/kredit-foto" },
    ],
  },
  {
    title: "Showcase",
    links: [
      { label: "Panduan demo", href: "/demo" },
      { label: "Dashboard operasional", href: "/dashboard" },
    ],
  },
]

export function SiteFooter() {
  const destinations = getSeedDestinations()
  const { contact } = getSeedSiteContent()
  return (
    <footer className="bg-ocean-950 text-ivory-50">
      <div className="container-page grid gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-4">
          <Logo />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ivory-50/75">
            Open trip, private trip, dan perjalanan custom ke destinasi alam dan budaya Nusantara.
          </p>
          <dl className="mt-6 space-y-1.5 text-sm text-ivory-50/75">
            <div>
              <dt className="sr-only">Alamat</dt>
              <dd>{contact.address}</dd>
            </div>
            <div>
              <dt className="sr-only">Email</dt>
              <dd>{contact.email}</dd>
            </div>
            <div>
              <dt className="sr-only">WhatsApp</dt>
              <dd>WhatsApp {contact.whatsappDisplay} (simulasi)</dd>
            </div>
            <div>
              <dt className="sr-only">Jam operasional</dt>
              <dd>{contact.officeHours}</dd>
            </div>
          </dl>
        </div>

        <nav aria-label="Destinasi" className="md:col-span-2">
          <p className="eyebrow text-sand-300">Destinasi</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {destinations.map((d) => (
              <li key={d.id}>
                <Link href={`/destinasi/${d.slug}`} className="text-ivory-50/80 hover:text-ivory-50">
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="md:col-span-2">
            <p className="eyebrow text-sand-300">{column.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-ivory-50/80 hover:text-ivory-50">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-ivory-50/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ivory-50/70 md:flex-row md:items-center md:justify-between">
          <p>
            Situs demonstrasi. NusaVista Journey adalah brand fiktif; seluruh data, harga, dan transaksi di situs ini adalah simulasi.
          </p>
          <p>
            Dikembangkan oleh <span className="font-semibold text-ivory-50">Kalsara Digital Studio</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
