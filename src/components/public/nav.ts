export interface PublicNavItem {
  label: string
  href: string
  description?: string
  children?: PublicNavItem[]
}

export const PUBLIC_NAV: PublicNavItem[] = [
  { label: "Destinasi", href: "/destinasi" },
  {
    label: "Paket Wisata",
    href: "/paket",
    children: [
      { label: "Open Trip", href: "/paket?jenis=open", description: "Jadwal tetap, bergabung dengan grup kecil" },
      { label: "Private Trip", href: "/paket?jenis=private", description: "Itinerary siap, eksklusif untuk grup Anda" },
      { label: "Custom Trip", href: "/custom-trip", description: "Rancang perjalanan dari awal bersama kami" },
      { label: "Semua paket", href: "/paket" },
    ],
  },
  { label: "Jurnal", href: "/jurnal" },
  { label: "Tentang", href: "/tentang" },
  { label: "Kontak", href: "/kontak" },
]

export const PRIMARY_CTA = { label: "Rancang Trip", href: "/custom-trip" }
