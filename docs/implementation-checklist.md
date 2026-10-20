# Checklist Implementasi

Status: ☑ selesai · ☐ belum. Setiap phase diakhiri dengan `npm run typecheck`, `npm run lint`, `npm run test`, dan `npm run build` yang lolos.

## Phase 0 — Audit repo & perencanaan ☑

- ☑ Audit repo: kosong (hanya `requirement.md`), belum ada commit. Node 26.9, npm 11, tanpa pnpm
- ☑ Keputusan: Bahasa Indonesia, foto Unsplash, npm
- ☑ Ringkasan arsitektur produk → [architecture.md](architecture.md)
- ☑ Route map → [route-map.md](route-map.md)
- ☑ Domain model → [domain-model.md](domain-model.md) + glosarium [CONTEXT.md](../CONTEXT.md)
- ☑ Rencana data seed → [seed-data.md](seed-data.md)
- ☑ Struktur komponen → [component-structure.md](component-structure.md)
- ☑ Design system → [design-system.md](design-system.md)
- ☑ ADR 0001–0004 → [adr/](adr/)

## Phase 1 — Fondasi ☑

**Setup**
- ☑ Scaffold Next.js 16.4.0 di direktori sementara, lalu konfigurasi dipindah ke root
- ☑ Versi dikunci persis (rilis ≥ 14 hari); TypeScript 5.9.3 mengikuti template Next 16.4
- ☑ Script: `dev`, `build`, `start`, `lint`, `typecheck` (`next typegen && tsc`), `test`; `engines.node >=20.9`
- ☑ ESLint: batas lapisan UI ↛ mock/seed/fixtures, larangan `localStorage` di UI, `domain/` bebas framework
- ☑ shadcn (Radix) dengan primitif yang dibutuhkan; paket `cn` dan CLI `shadcn` dikeluarkan dari dependency
- ☑ Vitest: 92 test (format, aturan domain, seed, LocalDatabase, System Job)

**Design system**
- ☑ Token `@theme` + `.theme-public` / `.theme-dashboard`; `ThemeScope` membawa tema ke dalam portal
- ☑ Instrument Serif + Plus Jakarta Sans via `next/font`
- ☑ Primitif `ui/`: button (varian brand), input/select/textarea (40 px, 16 px di mobile), focus ring solid ≥ 3:1, toaster tanpa `next-themes`, teks aksesibilitas berbahasa Indonesia
- ☑ Komponen `shared/`: Logo, SmartImage + PhotoCredit, Money/DateText/DurationText, StatusBadge/TripTypeBadge, SeatMeter, EmptyState/ErrorState, StepProgress, ClientOnly, DemoNotice/SimulatedTag

**Domain & data**
- ☑ Tipe entitas dan value object
- ☑ Aturan murni + test: pricing, availability, booking-lifecycle, invoice-schedule, payment-status, cancellation, inquiry-pipeline, customer-identity, travelers, trip-readiness, costing (vektor uji Sailing Komodo)
- ☑ `validateDatabase()` untuk 13 invarian (lolos pada 4 waktu pembangunan seed yang berbeda)
- ☑ `lib/`: formatter deterministik, tanggal WIB, ids, prng, normalisasi telepon/email, `Result`/`DomainError`
- ☑ `DataSource` + `UnitOfWork`; `LocalDatabase` (fallback memori, transaksi baca-terbaru-lalu-tulis, sinkronisasi antartab, migrasi, deteksi dokumen rusak, reset); `runCommand` untuk latensi dan kegagalan simulasi
- ☑ `db-store` + `ui-store` (persist aman), `DataProvider`
- ☑ System Job (hold kedaluwarsa, penyelesaian booking) — idempoten, diuji
- ☑ Fixture editorial: 8 destinasi, 18 paket lengkap dengan template biaya, Site Content, 6 artikel, tim, guide, vendor, testimoni
- ☑ 64 foto Unsplash: lokasi diverifikasi (1 foto phinisi ternyata Raja Ampat, dipindah), dioptimasi ke 2000 px, blur placeholder, kredit; script `scripts/media/fetch-media.mjs`
- ☑ `buildSeed()` deterministik; seluruh daftar periksa skenario lolos

**Layout**
- ☑ Publik: PromoBar, SiteHeader (transparan di atas hero), menu mobile, SiteFooter, DemoLauncher, hero beranda
- ☑ Dashboard: AppShell, sidebar 7 grup (dapat dilipat, sheet di mobile), breadcrumb, Mode Demo, PersonaSwitcher, ringkasan data sementara
- ☑ `not-found` global, `error` per grup, `robots.ts` + metadata `noindex`
- ☑ Diverifikasi di Chrome headless (desktop 1440 px & mobile 390 px): tanpa error konsol selain 404 prefetch ke route yang belum dibangun, tanpa scroll horizontal, reset di satu tab tersinkron ke tab lain, data bertahan setelah refresh

**Dipindahkan dari Phase 1**
- → Phase 2: komponen Calendar (`react-day-picker`) dan `SimulatedAction` (dialog aksi simulasi), dipasang bersama form yang memakainya
- → Phase 3: aturan `metrics` (KPI), dibuat bersama halaman overview
- → Phase 4: layout cetak (`app/print`), dibuat bersama halaman invoice dan manifest
- → Phase 6: verifikasi visual angka `tabular-nums` pada Plus Jakarta Sans

## Phase 2 — Website publik

- ☐ Beranda: 12 section, komposisi editorial bervariasi, konten dari Site Content
- ☐ `/paket`: pencarian, 5 filter, urutan, indikator ketersediaan, filter di query string, sheet filter mobile, empty state
- ☐ `/paket/[slug]`: seluruh isi §4.4, panel booking sticky, bar CTA mobile, paket buatan dashboard diselesaikan di browser (Cache Components)
- ☐ `/destinasi` dan `/destinasi/[slug]`: pencarian, filter wilayah dan kategori, paket terkait
- ☐ Alur Open Trip (`/pesan`) dengan validasi, progres, cek kursi saat kirim, konfirmasi
- ☐ Alur Private Trip (`/ajukan`) dan Custom Trip (`/custom-trip`), konfirmasi inquiry
- ☐ Halaman konfirmasi booking live + "Konfirmasi pembayaran (simulasi)"
- ☐ `/jurnal`, `/jurnal/[slug]`, `/tentang`, `/kontak` (form → inquiry general), `/demo`, `/kredit-foto`
- ☐ Review mobile 360 px dan 390 px: tanpa scroll horizontal, CTA sticky berfungsi

## Phase 3 — Dashboard inti

- ☐ Overview: 6 KPI + periode, 7 widget operasional, semuanya dari data
- ☐ Paket: daftar, buat/edit (itinerary builder, media picker, harga open/tiered, kebijakan), publish/unpublish/arsip, departure terkait
- ☐ Destinasi: daftar, buat/edit, status
- ☐ Keberangkatan: kalender + daftar, buat/edit, ubah kapasitas dengan batas bawah, tutup penjualan, batalkan, manifest, guide (cek bentrok)
- ☐ Booking: daftar + filter, booking manual, detail lengkap, verifikasi, perpanjang hold, lengkapi traveler, simulasi pembatalan, selesaikan, timeline
- ☐ Inquiry: kanban (drag + keyboard) dan tabel, detail, follow-up, penanggung jawab, quotation builder dengan versi, won/lost, konversi ke booking
- ☐ Customer: daftar + pencarian, profil, riwayat booking & inquiry, catatan, tahap
- ☐ PermissionGate per persona

## Phase 4 — Operasional & keuangan

- ☐ Pembayaran: antrean verifikasi, verifikasi/tolak, catat pembayaran manual, refund, label simulasi
- ☐ Invoice: daftar, detail, cetak A4 (`/print/invoices/[id]`)
- ☐ Operasional trip: papan kesiapan, checklist dengan dependensi, guide, vendor, manifest + cetak
- ☐ HPP & Costing: simulator interaktif, estimasi vs realisasi, titik impas, grafik (validasi warna dengan skill `dataviz`)
- ☐ Laporan: 7 laporan, filter periode, ringkasan teks + tabel alternatif

## Phase 5 — Konten & integrasi demo

- ☐ Konten Website: hero, banner promo, paket unggulan, destinasi unggulan, keunggulan, FAQ, Tentang, Kontak
- ☐ Artikel: editor blok, publish; Testimoni: edit, tampil/sembunyikan
- ☐ Sinkronisasi publik ↔ dashboard diverifikasi di dua tab
- ☐ Panel demo, halaman `/demo`, panduan 7 langkah dengan deteksi otomatis, reset, banner umur seed
- ☐ Tim & Peran (matriks izin, undang simulasi) dan Pengaturan (termasuk tab Data Demo)

## Phase 6 — QA & polish

- ☐ Jalankan ke-20 interaksi di bawah secara manual, di desktop dan mobile
- ☐ Review responsif (360, 768, 1024, 1440 px) publik dan dashboard
- ☐ Aksesibilitas: navigasi keyboard penuh, focus terlihat, label form, dialog, kontras, `prefers-reduced-motion`
- ☐ Konsistensi data: `validateDatabase()` setelah skenario demo panjang
- ☐ Konsol bersih (tanpa error dan peringatan hydration) di `next build && next start`
- ☐ Performa: LCP hero, ukuran bundle per route, gambar
- ☐ Penyempurnaan visual
- ☐ README (setup, deploy Vercel), panduan demo, checklist fitur, keterbatasan, rekomendasi integrasi backend

## Interaksi wajib (requirement §9)

| # | Interaksi | Di mana | Phase |
|---|---|---|---|
| 1 | Cari & filter paket | `/paket` | 2 |
| 2 | Lihat detail destinasi | `/destinasi/[slug]` | 2 |
| 3 | Pilih departure Open Trip | `/paket/[slug]` | 2 |
| 4 | Kirim booking simulasi | `/paket/[slug]/pesan` | 2 |
| 5 | Lihat booking di dashboard | `/dashboard/bookings` | 3 |
| 6 | Ubah status booking | detail booking (verifikasi, batal, selesai) | 3 |
| 7 | Catat pembayaran simulasi | detail booking / `/dashboard/payments` | 4 |
| 8 | Total pembayaran ikut berubah | detail booking, invoice, KPI | 4 |
| 9 | Buat paket baru | `/dashboard/packages/new` | 3 |
| 10 | Publish paket | editor paket | 3 |
| 11 | Paket tampil di website | `/paket`, `/paket/[slug]` | 3 |
| 12 | Ubah kapasitas departure | detail keberangkatan | 3 |
| 13 | Ketersediaan ikut berubah | publik + dashboard | 3 |
| 14 | Kirim inquiry private/custom | `/ajukan`, `/custom-trip` | 2 |
| 15 | Lihat inquiry di dashboard | `/dashboard/inquiries` | 3 |
| 16 | Pindahkan inquiry di pipeline | kanban | 3 |
| 17 | Konversi inquiry ke booking | detail inquiry | 3 |
| 18 | Edit konten website | `/dashboard/content` | 5 |
| 19 | Statistik dashboard ikut berubah | overview, laporan | 3–4 |
| 20 | Reset data demo | pengaturan, `/demo`, panel demo | 1 (logika) · 5 (UI) |

## Kriteria penerimaan (requirement §14)

| # | Kriteria | Dibuktikan oleh |
|---|---|---|
| 1 | Website publik rapi & responsif | Review Phase 2 & 6 |
| 2 | Semua navigasi utama berfungsi | Checklist route-map, tanpa halaman kosong |
| 3 | Paket bisa dicari & difilter | Interaksi 1 |
| 4 | Booking Open Trip (simulasi) | Interaksi 3–4 |
| 5 | Inquiry private/custom (simulasi) | Interaksi 14 |
| 6 | CRUD dashboard berfungsi | Phase 3–5 |
| 7 | Data bertahan setelah refresh | LocalDatabase + test manual |
| 8 | Data publik & dashboard konsisten | Satu sumber data + sinkronisasi antartab |
| 9 | Perhitungan booking & pembayaran benar | Unit test aturan + invarian |
| 10 | Kapasitas & ketersediaan koheren | `availability` + invarian 2 |
| 11 | KPI bereaksi pada perubahan | Selector dari snapshot + interaksi 19 |
| 12 | Data demo dapat di-reset | Interaksi 20 |
| 13 | Tidak ada menu yang mengarah ke placeholder kosong | Route map §2 |
| 14 | TypeScript & build lolos | Gerbang tiap phase |
| 15 | Dapat di-deploy ke Vercel | Deploy preview di Phase 6 |
