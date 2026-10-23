# Route Map

Legenda render: **S** = dirender server dari fixture seed · **C** = data dari store di browser · **S+C** = konten statis server + client island. Lihat [ADR-0003](adr/0003-render-static-content-then-hydrate-live-data.md).

## 1. Website publik — `app/(public)`

| Route | Halaman | Render | Isi & interaksi utama |
|---|---|---|---|
| `/` | Beranda | S+C | 12 section sesuai requirement §4.1. Hero, paket unggulan, destinasi unggulan, banner promo, dan FAQ dari Site Content. Section keberangkatan terdekat berupa client island |
| `/destinasi` | Daftar destinasi | S+C | Pencarian, filter wilayah, filter kategori. State filter di query string (`?q=&wilayah=&kategori=`) |
| `/destinasi/[slug]` | Detail destinasi | S+C | Hero, deskripsi, highlight, waktu terbaik, akses, galeri, paket terkait (live), artikel terkait |
| `/paket` | Daftar paket | S+C | Pencarian, jenis trip, destinasi, durasi, rentang harga, urutan, indikator ketersediaan. Pilihan "Custom Trip" menampilkan panel ajakan dan paket `isCustomizable` |
| `/paket/[slug]` | Detail paket | S+C | Galeri, ringkasan, itinerary per hari, termasuk/tidak, meeting point, syarat peserta, S&K, kebijakan pembatalan, FAQ, paket terkait. Panel booking sticky (desktop) dan CTA bawah (mobile). Open Trip: pilih keberangkatan + sisa kursi live. Private: harga per ukuran grup |
| `/paket/[slug]/pesan` | Booking Open Trip | C | `?keberangkatan=<kode>`. Langkah: Keberangkatan → Jumlah peserta → Data peserta → Ringkasan → Kirim. Paket non-open dialihkan ke `/ajukan` |
| `/paket/[slug]/ajukan` | Permintaan Private Trip | C | Langkah: Tanggal pilihan → Ukuran grup → Kebutuhan khusus → Kontak → Kirim |
| `/custom-trip` | Rancang Custom Trip | C | Langkah: Destinasi → Tanggal → Ukuran grup → Budget → Minat → Ringkasan → Kirim. `?dari=<slug>` mengisi awal dari paket inspirasi, `?destinasi=<slug>` dari halaman destinasi |
| `/konfirmasi/booking/[code]` | Konfirmasi booking | C | Status live dari store. Saat status Menunggu Pembayaran: rincian termin, rekening simulasi, dan tombol "Konfirmasi pembayaran (simulasi)" yang membuat payment menunggu verifikasi. Tautan "Lihat di dashboard" (lapisan demo) |
| `/konfirmasi/permintaan/[code]` | Konfirmasi inquiry | C | Ringkasan permintaan dan langkah berikutnya. Tautan ke dashboard |
| `/jurnal` | Daftar artikel | S+C | Filter kategori, artikel unggulan |
| `/jurnal/[slug]` | Artikel | S+C | Blok konten, destinasi dan paket terkait |
| `/tentang` | Tentang kami | S+C | Konten dari Site Content `about`. Testimoni berlabel ilustrasi |
| `/kontak` | Kontak | S+C | Info kontak fiktif, form pertanyaan (membuat inquiry `general`), tombol WhatsApp simulasi. `?paket=<slug>` memilih paket yang ditanyakan |
| `/demo` | Pintu masuk showcase | S+C | Penjelasan showcase, tombol Website / Dashboard, panduan perjalanan demo, reset data |
| `/kredit-foto` | Kredit foto | S | Daftar fotografer Unsplash per gambar |

Navigasi header: **Destinasi**, **Paket Wisata** (menu: Open Trip, Private Trip, Custom Trip), **Jurnal**, **Tentang**, **Kontak**, plus satu CTA **Rancang Trip** → `/custom-trip`. Footer: tautan yang sama, kontak, "Situs demonstrasi · Dikembangkan oleh Kalsara Digital Studio", tautan `/demo` dan `/kredit-foto`.

## 2. Dashboard — `app/(dashboard)/dashboard`

Semua route **C** (shell layout dirender server). View alternatif disimpan di query string agar bisa dibagikan dan diingat (`?view=`).

### Overview

| Route | Halaman | Isi & interaksi utama |
|---|---|---|
| `/dashboard` | Dashboard | 6 KPI (periode dapat diubah), inquiry perlu follow-up, keberangkatan mendatang, pembayaran jatuh tempo, data peserta belum lengkap, aktivitas booking terbaru, tren booking, paket terpopuler |

### Sales

| Route | Halaman | Isi & interaksi utama |
|---|---|---|
| `/dashboard/inquiries` | Inquiry & Leads | `?view=board\|list`. Kanban 6 tahap (drag + "Pindahkan ke…"), tabel dengan filter tahap/jenis/sumber/penanggung jawab, tambah inquiry manual |
| `/dashboard/inquiries/[id]` | Detail inquiry | Kontak, kebutuhan perjalanan, paket diminati, catatan follow-up, tanggal follow-up berikutnya, penanggung jawab, quotation (pembuat dalam sheet, versi), riwayat tahap, konversi ke booking |
| `/dashboard/bookings` | Booking | Pencarian, filter status booking, status pembayaran, jenis trip, sumber, keberangkatan, periode |
| `/dashboard/bookings/new` | Booking manual | Booking Open Trip dari kanal non-website (WhatsApp, walk-in) |
| `/dashboard/bookings/[id]` | Detail booking | Customer, paket, departure, traveler (lengkapi data), sumber, status, ringkasan dan jadwal pembayaran, invoice, timeline. Aksi: verifikasi, perpanjang hold, catat pembayaran, simulasi pembatalan, selesaikan |
| `/dashboard/customers` | Pelanggan | Pencarian, filter tahap (Prospek/Pelanggan/Repeat) dan sumber |
| `/dashboard/customers/[id]` | Profil pelanggan | Kontak, riwayat booking, riwayat inquiry, catatan, nilai total |

### Travel Management

| Route | Halaman | Isi & interaksi utama |
|---|---|---|
| `/dashboard/packages` | Paket Wisata | Filter jenis (termasuk custom), status, destinasi |
| `/dashboard/packages/new` | Buat paket | Tab: Dasar · Itinerary (builder) · Fasilitas · Galeri (pilih dari katalog media) · Harga & Kebijakan · Publikasi |
| `/dashboard/packages/[id]` | Edit paket | Tab yang sama + Keberangkatan terkait + Template biaya. Publish/unpublish dengan pratinjau tautan publik |
| `/dashboard/destinations` | Destinasi | Daftar, filter wilayah, status |
| `/dashboard/destinations/new` · `/[id]` | Buat/edit destinasi | Form lengkap + paket terkait |
| `/dashboard/departures` | Keberangkatan | `?view=calendar\|list`. Kalender bulanan, tabel dengan okupansi; buat keberangkatan di sheet |
| `/dashboard/departures/[id]` | Detail keberangkatan | Ringkasan kursi (terkonfirmasi · ditahan · sisa), ubah kapasitas (dengan batas bawah), booking, manifest, guide, ringkasan HPP, batalkan keberangkatan |
| `/dashboard/operations` | Operasional Trip | Trip mendatang dengan status kesiapan, progres, flag perlu perhatian |
| `/dashboard/operations/[departureId]` | Detail operasional | Checklist dengan dependensi, penugasan guide, penugasan vendor, manifest, catatan |

### Finance

| Route | Halaman | Isi & interaksi utama |
|---|---|---|
| `/dashboard/payments` | Pembayaran | Tab: Perlu verifikasi · Semua · Refund. Verifikasi/tolak, catat pembayaran manual, catat refund. Label "Simulasi" yang jelas |
| `/dashboard/invoices` | Invoice | Daftar dengan status pembayaran dan jatuh tempo |
| `/dashboard/invoices/[id]` | Detail invoice | Rincian, termin, pembayaran terkait, tombol cetak |
| `/dashboard/costing` | HPP & Costing | `?departure=<id>` atau `?package=<id>`. Simulator: komponen biaya, slider peserta, harga jual, HPP/pax, laba, margin, markup, titik impas, grafik. Daftar departure dengan estimasi vs realisasi |

### Content

| Route | Halaman | Isi & interaksi utama |
|---|---|---|
| `/dashboard/content` | Konten Website | Tab: Beranda (hero, banner promo, paket unggulan, destinasi unggulan, keunggulan, FAQ) · Tentang · Kontak. Tautan "Lihat di website" |
| `/dashboard/articles` | Artikel | Daftar, status, kategori |
| `/dashboard/articles/new` · `/[id]` | Editor artikel | Editor blok sederhana, cover dari katalog media, publish |
| `/dashboard/testimonials` | Testimoni | Daftar, edit di dialog, tampil/sembunyikan. Semua berlabel ilustrasi |

### Analytics & System

| Route | Halaman | Isi & interaksi utama |
|---|---|---|
| `/dashboard/reports` | Laporan | `?range=30d\|90d\|ytd\|custom&from=&to=`. Tren booking, penjualan per paket, destinasi populer, konversi inquiry, okupansi keberangkatan, umur tagihan, estimasi vs realisasi profit |
| `/dashboard/team` | Tim & Peran | Daftar anggota, matriks izin per peran, undang anggota (simulasi), ganti persona |
| `/dashboard/settings` | Pengaturan | Tab: Perusahaan · Booking & Pembayaran · Invoice · Data Demo (reset, umur data, ukuran storage, toggle jaringan lambat/gagal simpan) |

## 3. Cetak — `app/print`

| Route | Halaman | Render |
|---|---|---|
| `/print/invoices/[id]` | Invoice siap cetak (A4) | C, tanpa chrome, CSS `@media print` |
| `/print/manifest/[departureId]` | Manifest peserta siap cetak | C, tanpa chrome |

## 4. Tautan lintas modul

Setiap entitas yang disebut di halaman lain adalah tautan:

- Booking ↔ customer, paket, departure, invoice, payment, inquiry asal.
- Departure ↔ paket, booking, operasional, HPP.
- Inquiry ↔ customer, paket, quotation, booking hasil konversi.
- Halaman konfirmasi publik → booking/inquiry di dashboard (melalui lapisan demo).
- Paket dashboard → halaman publik paket (bila `published`).

## 5. Halaman sistem

`not-found.tsx` dan `error.tsx` terpisah untuk grup publik dan dashboard. `robots.ts` mengizinkan crawl agar `noindex` (metadata dan header `X-Robots-Tag`) terbaca. Tidak ada `sitemap.ts`, karena situs demo tidak untuk diindeks.
