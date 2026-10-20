# NusaVista Journey — Travel Showcase

Showcase website travel dan dashboard operasional untuk operator perjalanan fiktif **NusaVista Journey**, dibuat oleh Kalsara Digital Studio. Seluruh data hidup di browser pengunjung; tidak ada backend, pembayaran, atau pengiriman pesan sungguhan.

> Status: fondasi (Phase 1) dan website publik (Phase 2) selesai. Rencana dan progres lengkap ada di [`docs/`](docs/README.md).

## Menjalankan

Prasyarat: Node.js ≥ 20.9 dan npm.

```bash
npm install
npm run dev          # http://localhost:3000 (website) dan /dashboard
```

| Script | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan (Turbopack) |
| `npm run build` / `npm start` | Build dan jalankan versi produksi |
| `npm run lint` | ESLint, termasuk aturan batas lapisan arsitektur |
| `npm run typecheck` | Membuat tipe route Next.js lalu `tsc --noEmit` |
| `npm test` | Unit test aturan domain, seed, dan data layer (Vitest) |

## Data demo

- Saat pertama dibuka, browser membangun data contoh (±70 booking, 26 inquiry, 27 keberangkatan) relatif terhadap tanggal hari itu, lalu menyimpannya di `localStorage` (`nusavista-demo:db`).
- Perubahan bertahan setelah refresh dan tersinkron antar-tab di browser yang sama, tetapi tidak antar-perangkat.
- Reset kapan saja lewat tombol **Demo** (website) atau badge **Mode Demo** (dashboard).

## Struktur

```text
src/
  app/            route website (app/(public)) dan dashboard (app/(dashboard)/dashboard)
  components/     ui/ (shadcn yang dikustomisasi), shared/, public/, dashboard/
  features/       modul fitur
  domain/         tipe entitas + aturan bisnis murni (teruji)
  repositories/   DataSource/UnitOfWork + implementasi localStorage
  services/       use case, System Job, akses fixture untuk render server
  data/           fixture editorial, katalog media, pembangun seed
  stores/         Zustand (snapshot database, preferensi UI)
  lib/            formatter deterministik, tanggal WIB, util
```

Arsitektur, domain model, dan keputusan desain: [`docs/architecture.md`](docs/architecture.md), [`docs/domain-model.md`](docs/domain-model.md), [`CONTEXT.md`](CONTEXT.md).

## Foto

64 foto dari [Unsplash](https://unsplash.com/license) (bukan Unsplash+), lokasinya diverifikasi per foto. Sumber dan kredit fotografer ada di `scripts/media/sources.json`. Untuk mengunduh ulang atau menambah foto:

```bash
node scripts/media/fetch-media.mjs
```

## Deploy

Kompatibel dengan Vercel (preset Next.js) tanpa environment variable. Situs memakai `noindex` dan `robots.txt` menolak semua crawler, karena brandnya fiktif.
