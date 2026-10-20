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

## Phase 2 — Website publik ☑

- ☑ Beranda: 12 section (hero + pencarian trip, mosaik destinasi asimetris, open trip pilihan dengan satu fitur editorial, Private & Custom Trip, jadwal keberangkatan live, keunggulan, jurnal, FAQ, CTA penutup), semuanya dari Site Content dan katalog live
- ☑ `/paket`: pencarian, filter jenis/destinasi/durasi/harga/bulan, 5 urutan, baris ketersediaan per kartu, filter di query string, sheet filter mobile, chip filter aktif, empty state; logika filter teruji
- ☑ `/paket/[slug]`: galeri + lightbox, fakta singkat, itinerary per hari, fasilitas, jadwal dengan sisa kursi live atau tabel harga per ukuran grup, titik kumpul, syarat peserta, S&K, kebijakan pembatalan, pembayaran, FAQ, destinasi, paket terkait; panel booking sticky dan bar CTA mobile; slug buatan dashboard diselesaikan di browser
- ☑ `/destinasi` dan `/destinasi/[slug]`: pencarian, filter wilayah dan kategori, hero foto, sorotan, galeri, paket terkait live, artikel terkait
- ☑ Alur Open Trip (`/pesan`): 4 langkah, validasi Zod per langkah, cek kursi di dalam transaksi saat kirim, "Isi data contoh", konfirmasi
- ☑ Alur Private Trip (`/ajukan`, 4 langkah) dan Custom Trip (`/custom-trip`, 6 langkah, kalender rentang atau bulan fleksibel), konfirmasi inquiry dengan status live
- ☑ Halaman konfirmasi booking live: hold + hitung mundur, termin invoice, rekening simulasi, dialog "Konfirmasi pembayaran (simulasi)", tautan ke dashboard
- ☑ `/jurnal`, `/jurnal/[slug]`, `/tentang` (testimoni berlabel ilustrasi), `/kontak` (form → inquiry general, WhatsApp simulasi), `/demo`, `/kredit-foto`
- ☑ Diverifikasi di Chrome headless: 1440, 390, dan 360 px tanpa scroll horizontal dan tanpa error konsol; alur booking, pembayaran, private, custom, dan kontak dijalankan end-to-end
- ☑ `next build`: 66 halaman, slug seed statis, route berbasis kode memakai Partial Prerender

**Perbaikan dari Phase 1 yang ditemukan di Phase 2**
- Snapshot hasil transaksi bisa membawa indeks basi dari `getIndexes()` → snapshot kini selalu objek baru, dikunci test
- Pembatalan booking Private Departure (hold kedaluwarsa) tidak ikut membatalkan departure → kaskade di `departure-cascade.ts`, invarian 3 diperjelas
- `cn()` membuang ukuran teks kustom → `tailwind-merge` diberi skala tipografi

**Catatan untuk phase berikutnya**
- Tautan "Lihat di dashboard" dari halaman konfirmasi dan langkah 4–7 di `/demo` menuju route dashboard yang dibangun di Phase 3–4
- Phase 6: ukuran payload awal per halaman (HTML 22–35 KB gzip setelah katalog ringkas) dan LCP hero

## Phase 3 — Dashboard inti ☑

- ☑ Overview: 6 KPI dengan periode 7/30/90 hari dan pembanding periode sebelumnya, 7 widget (follow-up, keberangkatan 30 hari dengan kesiapan, pembayaran jatuh tempo, data peserta belum lengkap, aktivitas terbaru, tren booking 12 minggu, paket terpopuler), semuanya dari `domain/rules/metrics.ts` (teruji)
- ☑ Paket: daftar + filter, editor bertab (Dasar, Itinerary builder dengan urutan hari, Fasilitas & syarat, Galeri dari katalog foto, Harga open/tiered + DP + kebijakan pembatalan + FAQ), publish/jadikan draf/arsip dengan daftar syarat publikasi, keberangkatan terkait
- ☑ Destinasi: daftar + filter, editor (kategori, deskripsi, sorotan, foto), publish/draf (tidak bisa jadi draf selama masih ada paket terbit)
- ☑ Keberangkatan: tabel + kalender bulanan, jadwal baru (salin template biaya + checklist), kapasitas dengan batas bawah terisi + ditahan, peserta minimum, tutup/buka penjualan dengan alasan, batalkan (booking aktif ikut batal tanpa biaya), guide dengan cek bentrok, daftar booking, manifest, estimasi laba kotor
- ☑ Booking: tab status + filter (pembayaran, jenis, sumber, keberangkatan) di URL, booking manual (deteksi pelanggan lama, opsi langsung terbitkan invoice), detail (perjalanan, peserta, pembayaran & termin, timeline, pelanggan, hold), verifikasi + invoice, perpanjang hold (maks. 2×), lengkapi data peserta, simulasi pembatalan dengan biaya dan refund, tandai selesai
- ☑ Inquiry: papan kanban (drag mouse/sentuh + menu "Pindahkan ke…" untuk keyboard) dan tabel, inquiry manual, detail (kebutuhan, penawaran berversi, follow-up, penanggung jawab, jadwal follow-up, riwayat), penyusun penawaran (draf/kirim, revisi = versi baru), respons pelanggan, Gagal dengan alasan, konversi ke booking (private, custom → paket unlisted, general → jadwal open trip)
- ☑ Pelanggan: daftar + pencarian (nama, telepon, email) + filter tahap/sumber, profil (riwayat booking & inquiry, catatan, edit kontak dengan cek duplikat)
- ☑ Izin per persona: dicek di service (`requirePermission`) dan di UI (`PermissionButton` nonaktif + tooltip alasan)
- ☑ 126 test (service admin, metrik, filter, alur website); `next build` 81 halaman
- ☑ Diverifikasi di Chrome headless: alur inquiry → penawaran → konversi; paket baru → publish → jadwal → tampil di website (#9–11); ubah kapasitas → sisa kursi di website berubah (#12–13); drag kanban termasuk penolakan pindah tahap; persona Content tidak bisa memverifikasi atau membatalkan booking; tampilan 390 px tanpa scroll horizontal

**Catatan untuk phase berikutnya**
- Pencatatan dan verifikasi pembayaran, refund, serta halaman invoice ada di Phase 4. Detail booking sudah menampilkan pembayaran dan mengarahkan ke modul Pembayaran.
- Tautan KPI "Estimasi profitabilitas" ke HPP & Costing ditambahkan di Phase 4.

## Phase 4 — Operasional & keuangan ☑

- ☑ Pembayaran: KPI (menunggu verifikasi, diterima 30 hari, sisa tagihan, refund tertunda), tab Perlu verifikasi · Semua · Refund. Tinjau dengan ilustrasi bukti transfer bertanda CONTOH dan dampak verifikasi ditampilkan sebelum dikonfirmasi; tolak wajib alasan; catat pembayaran manual (langsung terverifikasi bila persona punya izin verifikasi, selain itu masuk antrean); refund bertahap dibatasi sisa refund kebijakan. Verifikasi yang menutup termin pertama otomatis mengonfirmasi booking. Label "Simulasi" di judul, dialog, dan catatan
- ☑ Invoice: daftar dengan filter status dan jatuh tempo berikutnya, detail (dokumen invoice, status per termin, semua pembayaran termasuk yang ditolak), cetak A4 di `/print/invoices/[id]` memakai komponen dokumen yang sama
- ☑ Operasional trip: papan per status kesiapan dengan flag Perlu perhatian dan filter rentang; detail dengan checklist berdependensi (item terkunci menampilkan alasan, item yang syaratnya hilang ditandai "perlu dicek ulang", membuka ulang verifikasi peserta ikut membuka manifest), catatan per item, guide dengan cek bentrok, vendor (minta → konfirmasi/batal), manifest + cetak di `/print/manifest/[departureId]`, catatan operasional
- ☑ HPP & Costing: simulator (slider peserta, harga jual, harga tingkat grup untuk paket private), 7 angka (HPP, HPP/pax, pendapatan, laba kotor, margin, markup, titik impas), grafik pendapatan vs HPP dengan titik impas dan grafik komposisi biaya, editor komponen biaya yang bisa disimpan sebagai estimasi (keberangkatan atau template paket), panel estimasi vs realisasi dengan input biaya aktual, tabel semua keberangkatan dengan "Belum dapat dihitung" beserta alasannya
- ☑ Laporan: 7 laporan (tren booking, penjualan per paket, destinasi populer, konversi inquiry, okupansi, umur tagihan, estimasi vs realisasi profit), filter 30 hari / 90 hari / tahun ini / rentang khusus, ringkasan teks dan tabel alternatif di setiap grafik
- ☑ Warna grafik divalidasi dengan validator `dataviz` (palet referensi; warna brand gagal ambang chroma). Grafik Overview dua sumbu-Y diganti satu sumbu
- ☑ Tautan: KPI Estimasi profitabilitas → HPP & Costing; detail booking → catat pembayaran dan invoice; detail keberangkatan → operasional dan HPP
- ☑ 141 test (15 baru untuk pembayaran, operasional, costing, laporan); `next build` 90 halaman
- ☑ Diverifikasi di Chrome headless: verifikasi pembayaran website → booking terkonfirmasi; catat DP manual dari detail booking → Terkonfirmasi + Dibayar sebagian (#7–8); refund mengurangi antrean; tugaskan guide dan konfirmasi vendor membuka item checklist; simulator 6 pax menghitung rugi dan titik impas 9 pax; persona Sales tidak bisa memverifikasi; cetak invoice dan manifest; 1440 dan 390 px tanpa scroll horizontal dan tanpa error konsol

**Perubahan aturan di Phase 4**
- Booking hanya bisa ditandai Selesai bila checklist operasional trip lengkap (invarian 13 kini dijaga service, bukan hanya seed)
- Item "Verifikasi data peserta" butuh minimal satu peserta terkonfirmasi; konteks checklist dihitung oleh `checklistContext()`

**Catatan untuk phase berikutnya**
- Template biaya paket diedit dari HPP & Costing (pilih "Template biaya paket"); editor paket belum punya tab Template biaya sendiri

## Phase 5 — Konten & integrasi demo ☑

- ☑ Konten Website: tab Beranda (hero dengan foto, banner promo dengan pratinjau, open trip dan destinasi unggulan dengan urutan dan batas 6/5, keunggulan dengan ikon, FAQ) · Tentang (judul, pengantar, cerita, nilai, dua foto) · Kontak. Setiap bagian disimpan terpisah dengan tanda perubahan belum disimpan; tautan "Lihat di website"
- ☑ Artikel: daftar dengan filter status/kategori, editor blok (paragraf, subjudul, daftar, kutipan, gambar; urutkan dan hapus), slug otomatis, foto sampul, syarat publikasi, publikasikan/jadikan draf, hapus draf. Artikel buatan dashboard tampil di `/jurnal/[slug]` lewat data browser
- ☑ Testimoni: tampil/sembunyikan, edit dan tambah di dialog (baru selalu tersembunyi dulu), label ilustrasi
- ☑ Sinkronisasi publik ↔ dashboard diverifikasi di dua tab: banner promo, judul hero, dan urutan unggulan berubah di tab website tanpa reload; testimoni yang disembunyikan hilang dari halaman Tentang
- ☑ Panel demo (dashboard dan website) dengan panduan 7 langkah yang tercentang otomatis dari data (booking website, verifikasi, pembayaran) dan kunjungan halaman setelah seed; halaman `/demo` menampilkan progres yang sama; reset dengan konfirmasi di panel, banner, dan Pengaturan
- ☑ Banner data demo: data lama (> 14 hari), versi seed baru, dokumen rusak yang dibuat ulang, atau penyimpanan yang tidak tersedia
- ☑ Tim & Peran: anggota dengan ganti peran, undang (simulasi), tandai undangan diterima, nonaktifkan/aktifkan, "Lihat sebagai"; matriks izin yang bisa diubah untuk peran selain Owner dan langsung berlaku. Owner terakhir dan persona yang sedang dipakai tidak bisa dinonaktifkan
- ☑ Pengaturan: Perusahaan · Booking & Pembayaran (aturan hold, penutupan penjualan, ambang sisa kursi, maksimal pax, DP dan pelunasan default untuk paket baru, rekening fiktif) · Invoice (prefiks dengan pratinjau nomor berikutnya, catatan kaki) · Data Demo (umur dan versi data, ukuran penyimpanan, reset, toggle jaringan lambat dan gagal simpan, ringkasan data dan cek invarian)
- ☑ 149 test (8 baru: konten, artikel, testimoni, tim, pengaturan, panduan demo); `next build` 97 halaman
- ☑ Diverifikasi di Chrome headless: alur di atas, artikel baru dari draf hingga tampil publik, izin "verifikasi pembayaran" diberikan ke peran Content lalu persona Content bisa memverifikasi, simulasi gagal simpan memunculkan pesan error, banner data lama setelah tanggal seed dimundurkan; 1440 dan 390 px tanpa scroll horizontal dan tanpa error konsol

**Catatan untuk Phase 6**
- Interaksi #18 (edit konten website) dan #20 (reset data) kini lengkap di UI

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
| 20 | Reset data demo | pengaturan, `/demo`, panel demo, banner data lama | 1 (logika) · 5 (UI) |

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
