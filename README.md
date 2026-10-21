# NusaVista Journey — Travel Showcase

Showcase website travel dan dashboard operasional untuk operator perjalanan fiktif **NusaVista Journey**, dibuat oleh Kalsara Digital Studio. Website publik dan dashboard memakai satu sumber data yang hidup di browser pengunjung: booking dari website langsung muncul di dashboard, dan perubahan di dashboard langsung terlihat di website. Tidak ada backend, pembayaran, login, atau pengiriman pesan sungguhan.

> Status: Phase 0–6 selesai. Rencana, keputusan, dan progres lengkap ada di [`docs/`](docs/README.md).

## Menjalankan

Prasyarat: Node.js ≥ 20.9 dan npm.

```bash
npm install
npm run dev          # http://localhost:3000 (website) dan http://localhost:3000/dashboard
```

| Script | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan (Turbopack) |
| `npm run build` / `npm start` | Build dan jalankan versi produksi |
| `npm run lint` | ESLint, termasuk aturan batas lapisan arsitektur |
| `npm run typecheck` | Membuat tipe route Next.js lalu `tsc --noEmit` |
| `npm test` | Unit test aturan domain, service, seed, dan skenario panjang (Vitest) |

Jangan menjalankan `npm run build` saat `npm run dev` hidup di folder yang sama: keduanya menulis ke `.next` dan dev server bisa crash.

## Panduan demo (±10 menit)

Buka `/demo` untuk versi interaktifnya. Panduan di sana dan di panel **Demo** tercentang otomatis saat langkah dikerjakan.

1. **Jelajahi paket**: `/paket`, cari "Komodo" atau filter destinasi, lalu buka detail paket.
2. **Buat booking**: pilih jadwal, klik **Pesan**, gunakan **Isi data contoh**, lalu kirim. Kursi langsung ditahan 24 jam.
3. **Buka dashboard**: `/dashboard`. Booking baru masuk ke KPI dan aktivitas terbaru.
4. **Tinjau booking**: **Booking**, lalu buka booking tersebut dan klik **Verifikasi & terbitkan invoice**.
5. **Perbarui pembayaran**: klik **Catat pembayaran** di detail booking, atau verifikasi transfer dari halaman konfirmasi pelanggan di **Pembayaran**.
6. **Tinjau keberangkatan**: **Keberangkatan** dan **Operasional Trip** untuk sisa kursi, manifest, checklist, dan HPP.
7. **Lihat statistik**: **Laporan** dan **Dashboard** dihitung ulang dari data yang baru diubah.

Pakai **Lihat sebagai** (pojok kanan atas dashboard) untuk mencoba peran Sales, Operasional, Finance, atau Content. Tombol yang tidak diizinkan tetap terlihat, dinonaktifkan, dan menjelaskan alasannya.

## Fitur

**Website publik**
- Beranda 12 bagian, daftar paket dengan pencarian, filter, dan urutan; detail paket dengan galeri, itinerary, jadwal, sisa kursi live, kebijakan, dan FAQ
- Destinasi, jurnal, Tentang, Kontak, kredit foto, halaman `/demo`
- Alur Open Trip (4 langkah dengan hold kursi), permintaan Private Trip, Custom Trip (6 langkah), dan form kontak; halaman konfirmasi live dengan konfirmasi pembayaran simulasi

**Dashboard**
- Ringkasan: 6 KPI dengan periode, widget operasional, tren booking, paket terpopuler
- Penjualan: inquiry (kanban dan tabel, penawaran berversi, konversi ke booking), booking (verifikasi, hold, pembatalan dengan biaya dan refund, booking manual), pelanggan
- Manajemen trip: paket (editor bertab, publikasi), destinasi, keberangkatan (kalender, kapasitas, guide), operasional trip (checklist berdependensi, vendor, manifest dan cetak)
- Keuangan: pembayaran (antrean verifikasi, catat manual, refund), invoice (cetak A4), HPP & Costing (simulator, titik impas, estimasi vs realisasi)
- Konten: konten website, artikel dengan editor blok, testimoni
- Analitik: 7 laporan dengan filter periode, ringkasan teks, dan tabel alternatif
- Sistem: tim dan matriks izin per peran, pengaturan, data demo

Daftar lengkap per phase ada di [`docs/implementation-checklist.md`](docs/implementation-checklist.md).

## Data demo dan simulasi

- Saat pertama dibuka, browser membangun data contoh (±70 booking, 26 inquiry, 27 keberangkatan, 20 paket) relatif terhadap tanggal hari itu, lalu menyimpannya di `localStorage` (`nusavista-demo:db`). Semua nama, nomor, rekening, dan testimoni fiktif.
- Perubahan bertahan setelah refresh dan tersinkron antar-tab di browser yang sama, tetapi tidak antar-perangkat atau antar-pengguna.
- **Pengaturan → Data Demo** menyediakan reset, simulasi jaringan lambat, dan simulasi gagal simpan. Banner muncul bila data sudah lebih dari 14 hari agar jadwal tetap relevan.
- Aksi yang di produksi menyentuh pihak luar (WhatsApp, email, payment gateway, undangan tim, permintaan ke vendor) diberi label **Simulasi** dan tidak mengirim apa pun.

## Keterbatasan

- Tidak ada autentikasi. "Lihat sebagai" hanya mengganti persona di browser; izin dicek di service agar perilakunya realistis, tetapi bukan pengaman.
- Data per browser. Dua pengguna, dua perangkat, atau mode private tidak berbagi data, dan tidak ada penanganan konflik multi-pengguna.
- Bukti transfer adalah ilustrasi bertanda CONTOH; foto hanya dari katalog Unsplash yang dibundel, tanpa unggahan.
- Tanggal dan waktu memakai WIB tetap. Pajak, multi-mata uang, pembatalan per peserta, reschedule, dan komisi agen di luar cakupan model (lihat [`docs/domain-model.md`](docs/domain-model.md#9-di-luar-cakupan-model)).
- Performa (build produksi, ponsel dengan CPU 4× lebih lambat dan 4G lambat): LCP halaman publik 1,3–1,9 detik, tetapi Total Blocking Time beranda sekitar 400–550 ms karena hidrasi React dan data demo dibangun di browser. JavaScript awal halaman publik sekitar 340 KB terkompresi.

## Rekomendasi integrasi backend

Lapisan data sudah dipisah agar bisa diganti tanpa menulis ulang UI:

1. **Data source**: ganti `LocalDatabase` (`src/repositories/mock`) dengan implementasi `DataSource`/`UnitOfWork` berbasis API atau database (mis. Postgres). UI dan hook tidak memanggil penyimpanan secara langsung.
2. **Use case di server**: fungsi di `src/services/*` sudah berbentuk perintah (`approveBooking`, `verifyPayment`, `saveQuotation`, …) yang menerima unit of work dan memvalidasi aturan domain. Pindahkan ke Server Actions atau API route dengan transaksi database, lalu ganti `runCommand()` dengan pemanggil jaringan.
3. **Aturan domain**: `src/domain` murni dan teruji (status pembayaran, kursi, pembatalan, HPP, invarian); bisa dipakai apa adanya di server.
4. **Autentikasi dan otorisasi**: ganti persona dengan login sungguhan; `requirePermission()` sudah menjadi satu titik cek izin.
5. **Pembayaran**: payment gateway lokal (virtual account/QRIS) dengan webhook yang memanggil logika `verifyPayment`; konfirmasi manual tetap untuk transfer bank.
6. **System Job**: hold kedaluwarsa dan penutupan trip dijalankan sebagai cron/queue di server, bukan saat tab terbuka.
7. **Komunikasi**: WhatsApp Business API dan email transaksional untuk konfirmasi booking, penawaran, dan pengingat pembayaran; penyimpanan file untuk bukti transfer dan dokumen peserta.
8. **Kode dan nomor**: kode booking, invoice, dan pembayaran dari sequence database agar unik antar-pengguna.

## Kualitas

- 150 unit test: aturan domain, service per modul, invarian seed, dan skenario 400 aksi acak selama enam minggu simulasi dengan `validateDatabase()` setelah setiap langkah.
- Diverifikasi di build produksi (Chrome headless): ke-20 interaksi wajib berhasil di 1440 px dan 390 px; 50 route tanpa scroll horizontal di 360, 768, 1024, dan 1440 px; konsol tanpa error atau peringatan hydration; axe-core (WCAG 2.1 A/AA) tanpa pelanggaran; navigasi keyboard dengan fokus terlihat, dialog mengunci dan mengembalikan fokus; `prefers-reduced-motion` mematikan animasi.

## Struktur

```text
src/
  app/            route website (app/(public)), dashboard (app/(dashboard)/dashboard), cetak (app/print)
  components/     ui/ (shadcn yang dikustomisasi), shared/, public/, dashboard/
  features/       modul fitur
  domain/         tipe entitas + aturan bisnis murni (teruji)
  repositories/   DataSource/UnitOfWork + implementasi localStorage
  services/       use case, read model (queries/), System Job, akses fixture untuk render server
  data/           fixture editorial, katalog media, pembangun seed
  stores/         Zustand (snapshot database, preferensi UI)
  lib/            formatter deterministik, tanggal WIB, util
```

Arsitektur, domain model, dan keputusan desain: [`docs/architecture.md`](docs/architecture.md), [`docs/domain-model.md`](docs/domain-model.md), [`CONTEXT.md`](CONTEXT.md).

## Foto

64 foto dari [Unsplash](https://unsplash.com/license) (bukan Unsplash+), lokasinya diverifikasi per foto. Sumber dan kredit fotografer ada di `scripts/media/sources.json` dan halaman `/kredit-foto`. Untuk mengunduh ulang atau menambah foto:

```bash
node scripts/media/fetch-media.mjs
```

## Deploy ke Vercel

Tidak butuh environment variable atau layanan tambahan.

1. Push repository ke GitHub, lalu di Vercel pilih **Add New → Project** dan impor repository ini.
2. Framework preset **Next.js** terdeteksi otomatis; biarkan build command (`next build`) dan output default.
3. Klik **Deploy**. Setiap push ke `main` membuat deployment produksi, branch lain membuat preview.

Alternatif lewat CLI: `npx vercel` untuk preview, `npx vercel --prod` untuk produksi.

Situs memakai `noindex` dan `robots.txt` menolak semua crawler karena brandnya fiktif. Data demo tetap hidup di browser setiap pengunjung, jadi deployment tidak berbagi data antar-pengunjung.
