# Design System

Satu brand, dua sistem visual. Website publik bercerita lewat foto dan tipografi editorial. Dashboard tenang, padat, dan mengutamakan kegunaan. Keduanya berbagi palet inti, typeface UI, dan bahasa status.

## 1. Brand

| Elemen | Ketentuan |
|---|---|
| Nama | **NusaVista Journey** (singkat: NusaVista). *Nusa* = pulau/Nusantara, *Vista* = pemandangan |
| Positioning | Operator trip Nusantara yang rapi dan terencana: grup kecil, jadwal jelas, harga transparan |
| Tagline kerja | "Jelajahi Nusantara, tanpa repot merencanakan." (dapat diedit di Site Content) |
| Logo | Wordmark "NusaVista" dalam display serif + "JOURNEY" huruf kapital berspasi lebar dalam sans. Ikon: garis cakrawala dan gelombang monoline (SVG), dipakai untuk favicon dan avatar |
| Kalsara | Hanya di footer ("Situs demonstrasi · Dikembangkan oleh Kalsara Digital Studio"), halaman `/demo`, dan panel demo |

### Suara dan gaya bahasa

- Menyapa dengan "Anda". Hangat, jelas, dan spesifik: "Berangkat 4 Nov · sisa 3 kursi", bukan "Buruan, kuota terbatas!!".
- Tanpa superlatif yang tidak bisa dibuktikan ("terbaik", "termurah", "no. 1") dan tanpa klaim (izin, penghargaan, jumlah pelanggan, tahun berdiri).
- Kalimat pendek; satu gagasan per paragraf. Konvensi Indonesia: `Rp3.450.000`, `4 Nov 2026`, `3H2M`, `08.00 WIB`.
- Status dan aksi simulasi selalu jujur: "Permintaan diterima", "Menunggu verifikasi (simulasi)".

## 2. Warna

### Palet inti

| Token | Hex | Peran |
|---|---|---|
| `ocean-950` | `#071A2B` | Footer, section paling gelap |
| `ocean-900` | `#0B2540` | Warna brand utama: teks judul, tombol primer, section gelap |
| `ocean-800` | `#12355A` | Primer dashboard, hover |
| `ocean-700` | `#1C4A75` | Grafik, aksen |
| `ivory-50` | `#FBF8F2` | Latar website publik |
| `ivory-100` | `#F4EEE3` | Latar section alternatif |
| `ivory-200` | `#EAE1D1` | Garis pemisah di atas ivory |
| `lagoon-50` | `#E8F3F1` | Latar badge/aksen lembut |
| `lagoon-300` | `#8FC7C1` | Aksen di atas latar gelap |
| `lagoon-500` | `#3E9690` | Ilustrasi, grafik, elemen non-teks |
| `lagoon-600` | `#2F7F7A` | Focus ring, ikon aktif |
| `lagoon-700` | `#246B67` | Teks tautan dan tombol sekunder |
| `lagoon-800` | `#1D5754` | Teks di atas `lagoon-50` |
| `sand-100` | `#F4EBD9` | Latar sorotan hangat |
| `sand-300` | `#E3CFA4` | Aksen di atas latar gelap, tombol di section gelap |
| `sand-500` | `#C2A472` | Garis aksen, ornamen; **bukan teks di latar terang** |
| `sand-800` | `#6B5226` | Teks di atas `sand-100` |
| `ink-900` | `#16222E` | Teks isi |
| `ink-600` | `#4A5866` | Teks sekunder |
| `ink-500` | `#5E6B78` | Placeholder, keterangan kecil |
| `ink-400` | `#7D8A97` | Hanya untuk elemen nonaktif dan dekoratif |

### Dashboard

| Token | Hex | Peran |
|---|---|---|
| `canvas` | `#F6F7F9` | Latar aplikasi |
| `surface` | `#FFFFFF` | Kartu, tabel, panel |
| `border-subtle` | `#E4E7EC` | Pemisah dan garis kartu (dekoratif) |
| `border-input` | `#848E9F` | Garis input dan kontrol (≥ 3:1) |
| `text-strong` | `#101828` | Judul, angka |
| `text-muted` | `#475467` | Teks isi sekunder |
| `text-subtle` | `#667085` | Keterangan di atas `canvas` |
| `primary` | `ocean-800` | Tombol primer, item navigasi aktif |
| `accent` | `lagoon-600` | Indikator terpilih, focus ring |

### Nada status

Dipakai oleh `StatusBadge` di kedua sisi. Format: teks gelap di atas latar lembut, plus titik warna.

| Nada | Teks / Latar | Contoh status |
|---|---|---|
| neutral | `#344054` / `#EEF0F3` | Draf, Belum ditagih, Belum disiapkan |
| info | `#1D4E89` / `#EAF1FA` | Menunggu Verifikasi, Dihubungi, Berlangsung |
| warning | `#8A5A0F` / `#FDF3E1` | Menunggu Pembayaran, Dibayar sebagian, Sisa *n* kursi |
| success | `#1F6B4A` / `#E9F5EE` | Terkonfirmasi, Lunas, Siap Berangkat, Berhasil |
| danger | `#9B3328` / `#FBECEA` | Dibatalkan, Lewat jatuh tempo, Penuh, Gagal |
| accent | `#5B3F8C` / `#F1ECF8` | Penawaran Dikirim, Negosiasi, Custom Trip |

### Kontras yang sudah diverifikasi (WCAG 2.2)

| Pasangan | Rasio | Hasil |
|---|---|---|
| `ink-900` di `ivory-50` | 15.21 | AAA |
| `ink-600` di `ivory-50` / `ivory-100` | 6.88 / 6.32 | AA |
| `ink-500` di `ivory-50` / putih | 5.15 / 5.45 | AA |
| `lagoon-700` di `ivory-50` | 5.87 | AA, untuk teks tautan |
| `lagoon-600` di `ivory-50` | 4.46 | Gagal untuk teks; hanya non-teks |
| `sand-600` (`#9C7B45`) di `ivory-50` | 3.71 | Hanya teks ≥ 24 px |
| `ivory-50` di `ocean-900` | 14.64 | AAA |
| `sand-300` di `ocean-900` | 10.15 | AAA |
| putih di `lagoon-700` (tombol) | 6.22 | AA |
| `ocean-900` di `sand-300` (tombol) | 10.15 | AAA |
| `text-muted` di putih | 7.69 | AAA |
| `text-subtle` di `canvas` | 4.64 | AA |
| Semua pasangan nada status | 5.38–9.16 | AA |
| `border-input` di putih / publik `#938771` di `ivory-50` | 3.31 / 3.33 | Lolos 3:1 non-teks |
| Focus ring `lagoon-600` di putih | 4.73 | Lolos 3:1 non-teks |

Teks di atas foto selalu memakai scrim `ocean-950` (gradien bawah ke atas, opasitas 0→65%) agar kontras ≥ 4.5:1 terlepas dari isi foto.

### Grafik

Urutan kategori awal: `ocean-700`, `lagoon-500`, `sand-500`, `#C7684F` (terakota), `#7A5C8E` (plum), `ink-400`. Divalidasi ulang dengan skill `dataviz` saat Phase 4 (perbedaan untuk buta warna, kontras ≥ 3:1 terhadap latar, label langsung bila memungkinkan).

## 3. Tipografi

| Peran | Typeface | Catatan |
|---|---|---|
| Display (publik) | **Instrument Serif** (400, italic) | Judul editorial ≥ 28 px saja. Italic untuk penekanan satu-dua kata |
| UI & isi (publik + dashboard) | **Plus Jakarta Sans** (variable 400–700) | Typeface yang dirancang untuk identitas kota Jakarta. Angka tabel memakai `tabular-nums` (dukungan fitur `tnum` diverifikasi saat Phase 1) |

Dimuat dengan `next/font/google` (self-hosted saat build, `display: swap`).

### Skala publik (mobile → desktop, `clamp`)

| Token | Ukuran | Line-height | Font |
|---|---|---|---|
| `display-xl` | 44 → 88 px | 1.0 | Instrument Serif, tracking −0.01em |
| `display-lg` | 36 → 64 px | 1.05 | Instrument Serif |
| `display-md` | 30 → 44 px | 1.1 | Instrument Serif |
| `heading` | 20 → 24 px | 1.3 | Jakarta 600 |
| `body-lg` | 17 → 19 px | 1.6 | Jakarta 400 |
| `body` | 16 px | 1.65 | Jakarta 400 |
| `small` | 14 px | 1.5 | Jakarta 500 |
| `eyebrow` | 12 px | 1.4 | Jakarta 600, kapital, tracking 0.16em |

Lebar baris isi maksimal ±68 karakter.

### Skala dashboard

| Token | Ukuran / LH | Bobot |
|---|---|---|
| `page-title` | 22 / 28 | 600 |
| `section-title` | 16 / 24 | 600 |
| `body` | 14 / 20 | 400 |
| `table` | 13.5 / 20 | 400 (angka `tabular-nums`) |
| `caption` | 12 / 16 | 500 |
| `kpi` | 28 / 32 | 600, `tabular-nums` |

## 4. Ruang dan tata letak

- Basis 4 px (skala Tailwind standar).
- **Publik:** container 1280 px (hero dan galeri hingga 1440 px). Gutter 20 px mobile, 32 px tablet, 48 px desktop. Ritme section 64–80 px mobile, 112–128 px desktop. Grid 12 kolom dengan komposisi asimetris (misalnya 7/5, 5/7) agar beranda tidak terasa seperti deretan grid kartu yang sama.
- **Dashboard:** sidebar 256 px (dilipat 64 px), konten maksimal 1440 px, padding 24 px desktop dan 16 px mobile. Jarak antar-kartu 16–24 px.
- Breakpoint: `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`.

## 5. Bentuk dan kedalaman

| | Publik | Dashboard |
|---|---|---|
| Radius foto | 2 px (hampir tegas, editorial) | 6 px |
| Radius kartu / panel | 4 px | 8 px |
| Radius input & tombol | 6 px | 6 px |
| Pill | hanya chip filter & badge | badge |
| Garis | hairline 1 px `ivory-200` | 1 px `border-subtle` |
| Bayangan | hanya elemen melayang (panel booking sticky, menu, dialog) | `shadow-xs` pada kartu, `shadow-lg` pada popover/dialog |

## 6. Fotografi

- **Arah visual:** cahaya alami (pagi/senja), skala lanskap yang luas, manusia kecil dalam bingkai, warna natural tanpa filter berlebihan. Hindari foto stok generik (orang menunjuk peta, koper, pose lompat).
- **Rasio:** hero 16:9 (mobile 4:5), kartu paket 4:3, destinasi mosaik campuran 3:4 dan 4:3, artikel 3:2.
- **Variasi:** setiap destinasi punya foto cover sendiri; foto yang sama tidak dipakai di dua section yang terlihat bersamaan.
- **Teknis:** `next/image` dengan `sizes` yang tepat, `priority` hanya untuk hero, `placeholder="blur"`, gambar lain lazy load.

## 7. Gerak

- Library `motion` lewat `LazyMotion` + `m`, hanya di website publik dan beberapa transisi dashboard (sheet, kanban).
- Durasi 180–400 ms, easing `[0.22, 1, 0.36, 1]`. Masuk dengan fade + geser 12–16 px saat section terlihat (sekali saja).
- Hero: zoom-out halus 1.04 → 1 selama 1,6 detik saat muat. Tidak ada parallax berat, autoplay video, atau carousel otomatis.
- `prefers-reduced-motion: reduce` → semua animasi non-esensial dimatikan.

## 8. Komponen dasar

| Komponen | Ketentuan |
|---|---|
| Tombol | Varian: `primary` (ocean-900/800), `secondary` (garis), `ghost`, `link`, `danger`. Tinggi 44 px publik, 36 px dashboard (target sentuh minimal 44 px di mobile). Satu tombol primer per area pandang |
| Input | Label di atas (tidak hanya placeholder), teks bantuan dan error di bawah, border ≥ 3:1, focus ring 2 px `lagoon-600` + offset 2 px |
| Kartu paket | Foto 4:3, eyebrow destinasi · durasi, judul Jakarta 600, harga "mulai dari", baris ketersediaan (contoh: "4 Nov · sisa 3 kursi"). Tanpa badge diskon mencolok |
| Badge status | Nada status di §2, titik warna + teks; tidak hanya mengandalkan warna |
| Tabel | Header lengket, baris 44 px, angka rata kanan, aksi baris di menu `⋯`, baris dapat diklik ke detail. Di < 768 px berubah menjadi daftar kartu |
| Chip filter | Pill bergaris; aktif = isi `ocean-900` teks ivory; dapat dihapus satu per satu |
| Empty state | Ikon garis besar, satu kalimat penjelasan, satu aksi |
| Skeleton | Mengikuti bentuk konten, warna `ivory-100` / `#EEF0F3`, animasi pulse lembut |

## 9. Ikon

Lucide, stroke 1.75, ukuran 16 px (dashboard) dan 20 px (publik). Ikon selalu disertai teks, kecuali tombol ikon yang memiliki `aria-label` dan tooltip.

## 10. Implementasi token

Token didefinisikan di `app/globals.css` dengan `@theme` Tailwind v4 (palet mentah). Token semantik shadcn (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`, …) dipetakan per lingkup:

```css
.theme-public    { --background: var(--color-ivory-50); --primary: var(--color-ocean-900); --ring: var(--color-lagoon-600); /* … */ }
.theme-dashboard { --background: var(--color-canvas);   --primary: var(--color-ocean-800); --ring: var(--color-lagoon-600); /* … */ }
```

Layout `(public)` memakai `.theme-public` dan layout dashboard memakai `.theme-dashboard`. Komponen `ui/` hanya memakai token semantik, sehingga satu komponen tampil sesuai konteksnya. Mode gelap tidak termasuk cakupan showcase, tetapi struktur token sudah memungkinkannya.

## 11. Yang dihindari

Template travel ala Bootstrap, gradien berlebihan, hero penuh teks dan banyak CTA yang bersaing, badge promo murahan ("HOT!!", "DISKON 70%"), kartu yang terlalu membulat, foto stok yang berulang, paragraf padat, teks di atas foto tanpa scrim, warna sebagai satu-satunya pembeda status.
