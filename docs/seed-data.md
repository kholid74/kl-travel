# Rencana Data Seed

Data demo dibangun oleh `buildSeed(anchor)` dan bersifat deterministik untuk satu anchor. Skenario penting ditulis tangan; data pengisi (nama, kota, waktu pembuatan) dihasilkan PRNG ber-seed tetap. Semua tanggal ditulis sebagai offset hari dari anchor (`d(+12)` = 12 hari setelah anchor), sehingga data selalu terasa "baru". Seluruh seed wajib lolos `validateDatabase()` ([domain-model.md §8](domain-model.md#8-invarian-data)).

## 1. Ringkasan jumlah

| Entitas | Target requirement | Rencana |
|---|---|---|
| Destinasi | 8 | 8 |
| Paket | 15–20 | 18 katalog (16 published, 1 draft, 1 archived) + 2 custom `unlisted` = 20 |
| Departure | 20–30 | 22 terjadwal + 5 private = 27 |
| Customer | 40–60 | 70 (15 dengan ≥ 2 booking; 23 prospek) |
| Booking | 30–50 | 71 (diuji pada rentang 60–80) |
| Inquiry | 20–30 | 26 |
| Quotation | — | 17 (termasuk revisi v2 dan yang kedaluwarsa) |
| Invoice | terkait | 68 |
| Payment | terkait | 96 (termasuk menunggu verifikasi dan refund) |
| Traveler | — | 214 |
| ActivityEvent | — | ±530 |
| Guide / Vendor | ada | 9 guide / 19 vendor |
| Checklist | ada | 1 per departure |
| Cost item | ada | template per paket + salinan per departure |
| User / Role | ada | 7 user / 5 role |
| Artikel / Testimoni | ada | 6 / 6 |
| Media | — | ±48 foto Unsplash |

Angka di atas adalah hasil aktual `buildSeed()` (Phase 1). Ukuran dokumen sekitar 640 KB JSON. Data identik untuk waktu pembangunan yang sama dan bergeser utuh mengikuti tanggal anchor (diuji di `seed.test.ts`).

**Mengapa booking dan customer melebihi target.** Angka di requirement adalah *minimum target*. 27 departure dengan okupansi yang masuk akal (trip lampau berjalan di atas titik impas, dua departure penuh) membutuhkan ±173 kursi aktif. Dengan rata-rata ±3 pax per booking, itu berarti ±60 booking aktif. Dengan hanya 46 booking, rata-rata departure terisi 3–4 orang, di bawah minimum peserta hampir semua paket. Hasilnya angka okupansi dan profitabilitas yang tidak kredibel.

## 2. Destinasi

| Slug | Nama | Wilayah | Provinsi | Kategori |
|---|---|---|---|---|
| `labuan-bajo` | Labuan Bajo | Bali & Nusa Tenggara | Nusa Tenggara Timur | bahari, pulau, petualangan |
| `bali` | Bali | Bali & Nusa Tenggara | Bali | budaya, santai |
| `nusa-penida` | Nusa Penida | Bali & Nusa Tenggara | Bali | bahari, pulau |
| `lombok` | Lombok | Bali & Nusa Tenggara | Nusa Tenggara Barat | bahari, pegunungan, pulau |
| `raja-ampat` | Raja Ampat | Papua & Maluku | Papua Barat Daya | bahari, pulau, petualangan |
| `bromo` | Bromo | Jawa | Jawa Timur | pegunungan, petualangan |
| `yogyakarta` | Yogyakarta | Jawa | DI Yogyakarta | budaya, kuliner |
| `belitung` | Belitung | Sumatra & Kepulauan | Kepulauan Bangka Belitung | bahari, pulau, santai |

Deskripsi berisi informasi umum yang aman (musim, akses, karakter tempat), tanpa klaim harga resmi atau aturan yang bisa berubah.

## 3. Paket dan profil biaya

Harga dalam rupiah. **F** = biaya tetap per departure, **v** = biaya per peserta. **Min** = minimum peserta (Open Trip, diset sama dengan titik impas). Margin dihitung dengan rumus [domain-model.md §6.10](domain-model.md#610-hpp-dan-profitabilitas).

### Open Trip

| # | Paket | Destinasi | Durasi | Harga/pax | Kap. | Min | F | v | Margin @penuh | Catatan |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Sailing Komodo — Phinisi Sharing | Labuan Bajo | 3H2M | 3.450.000 | 16 | 9 | 18.500.000 | 1.150.000 | 33,2% | Paling populer; satu departure penuh |
| 2 | Komodo Day Trip Speedboat | Labuan Bajo | 1H | 1.650.000 | 12 | 6 | 6.500.000 | 550.000 | 33,8% | DP 100% (trip 1 hari) |
| 3 | Nusa Penida Barat & Snorkeling Manta | Nusa Penida | 1H | 850.000 | 14 | 7 | 2.500.000 | 475.000 | 23,1% | **Margin tipis**: 7,4% di 8 pax |
| 4 | Lombok & Gili Trawangan | Lombok | 3H2M | 2.650.000 | 14 | 5 | 5.800.000 | 1.250.000 | 37,2% | Satu departure hampir penuh |
| 5 | Rinjani Summit Trek via Sembalun | Lombok | 3H2M | 2.950.000 | 12 | 4 | 4.800.000 | 1.450.000 | 37,3% | Fisik menantang; satu departure ditutup manual |
| 6 | Raja Ampat Wayag & Piaynemo | Raja Ampat | 5H4M | 12.900.000 | 10 | 6 | 46.000.000 | 4.100.000 | 32,6% | **Estimasi rugi** −Rp10,8 jt di 4 pax |
| 7 | Bromo Sunrise Midnight Tour | Bromo | 1H | 495.000 | 14 | 9 | 2.700.000 | 165.000 | 27,7% | **Margin tipis**; volume tinggi; DP 100% |
| 8 | Bromo – Ijen – Madakaripura | Bromo | 3H2M | 2.150.000 | 14 | 6 | 6.200.000 | 950.000 | 35,2% | |
| 9 | Jogja Heritage: Borobudur, Prambanan & Merapi | Yogyakarta | 3H2M | 1.850.000 | 15 | 5 | 4.500.000 | 890.000 | 35,7% | |
| 10 | Belitung Island Hopping | Belitung | 3H2M | 2.250.000 | 14 | 5 | 5.400.000 | 980.000 | 39,3% | Paling sehat |
| 11 | Bali Utara: Munduk & Danau Tamblingan | Bali | 2H1M | 1.450.000 | 12 | 5 | 3.200.000 | 760.000 | 29,2% | **Archived**; hanya departure lampau |

### Private Trip

| # | Paket | Destinasi | Durasi | Tier harga/pax | F | v | Contoh margin | Catatan |
|---|---|---|---|---|---|---|---|---|
| 12 | Private Phinisi Labuan Bajo | Labuan Bajo | 4H3M | 2–3: 14.500.000 · 4–6: 9.750.000 · 7–10: 7.250.000 | 24.000.000 | 1.500.000 | 6,9% @2 · 23,1% @4 · 37,9% @8 | Margin tipis untuk pasangan |
| 13 | Bali Ubud & Sidemen Slow Travel | Bali | 4H3M | 2: 6.900.000 · 3–4: 5.400.000 · 5–8: 4.350.000 | 6.500.000 | 2.600.000 | 15,2% @2 · 21,8% @4 | |
| 14 | Bali Honeymoon Retreat | Bali | 5H4M | 2: 11.800.000 | 4.200.000 | 7.900.000 | 15,3% @2 | `isCustomizable` |
| 15 | Private Nusa Penida | Nusa Penida | 2H1M | 2–3: 2.950.000 · 4–6: 2.250.000 | 2.400.000 | 1.050.000 | 26,7% @4 | |
| 16 | Private Liveaboard Raja Ampat | Raja Ampat | 6H5M | 3–4: 38.500.000 · 5–8: 29.900.000 | 85.000.000 | 3.500.000 | 17,3% @3 · 40,9% @6 | `isCustomizable` |
| 17 | Private Jogja Family Trip | Yogyakarta | 4H3M | 2–4: 3.450.000 · 5–8: 2.850.000 · 9–15: 2.450.000 | 5.600.000 | 1.450.000 | 17,4% @4 · 16,4% @6 | `isCustomizable` |
| 18 | Belitung Timur & Kelayang Retreat | Belitung | 3H2M | 2–4: 3.950.000 · 5–8: 3.250.000 | 4.900.000 | 1.700.000 | — | **Draft**, untuk demo publish |

### Custom (unlisted, dari quotation)

| # | Paket | Dari inquiry | Status |
|---|---|---|---|
| 19 | Custom Trip Raja Ampat Diving — Keluarga Halim | inquiry custom yang dikonversi | departure mendatang, menunggu pembayaran |
| 20 | Custom Trip Bali & Nusa Penida — Rombongan Kantor | inquiry custom yang dikonversi | departure lampau, selesai |

Kebijakan default untuk semua paket: DP 30%, pelunasan H-14, tier pembatalan default. Trip 1 hari memakai DP 100%.

## 4. Departure

Offset relatif terhadap anchor. Kode mengikuti format `LBJ-OT01-261104`.

Kolom kursi: **T** = terkonfirmasi/selesai, **H** = ditahan (hold aktif), **B** = pax booking yang dibatalkan (belum termasuk 2 booking `hold_expired`, yang ditempatkan generator di departure mana pun yang masih muat). Aritmetika ini sudah dicek: tidak ada departure dengan T + H > kapasitas.

| Kelompok | Departure | Kap. | T | H | B | Skenario |
|---|---|---|---|---|---|---|
| Lampau, selesai | Sailing Komodo d(−150) | 16 | 14 | | | Biaya aktual lengkap → laba realisasi |
| | Bromo Sunrise d(−120) | 14 | 14 | | | Penuh, biaya aktual lengkap |
| | Bali Utara d(−95) (paket archived) | 12 | 8 | | 2 | 1 booking batal atas permintaan |
| | Jogja Heritage d(−70) | 15 | 11 | | | Biaya aktual lengkap |
| | Nusa Penida d(−45) | 14 | 10 | | | Biaya aktual **belum lengkap** → "Belum dapat dihitung" |
| | Lombok & Gili d(−12) | 14 | 9 | | | Biaya aktual **belum lengkap** |
| Lampau, dibatalkan | Raja Ampat d(−40) | 10 | | | 3 | Di bawah minimum, refund selesai |
| Berlangsung | Sailing Komodo d(−1) | 16 | 13 | | | Status Berlangsung di operasional |
| Penuh | Sailing Komodo d(+12) | 16 | 16 | | | Penuh oleh kursi terkonfirmasi |
| | Bromo Sunrise d(+5) | 14 | 12 | 2 | | Penuh karena hold; checklist sebagian, **Perlu perhatian** |
| Terbatas | Lombok & Gili d(+20) | 14 | 9 | 3 | | Sisa 2 kursi |
| | Nusa Penida d(+9) | 14 | 8 | 3 | 2 | Sisa 3 kursi; 1 hold berakhir < 6 jam |
| Di bawah minimum | Raja Ampat d(+34) | 10 | 4 | | | Min 6, **estimasi laba negatif** |
| Penjualan ditutup | Rinjani d(+45) | 12 | 6 | | | "Ditutup sementara menunggu pembukaan jalur pendakian" |
| Dibatalkan | Bromo–Ijen d(+28) | 14 | | | 5 | Dibatalkan operator; 1 refund masih diproses |
| Tersedia | Jogja Heritage d(+7) | 15 | 7 | | | Checklist 100% → **Siap Berangkat** |
| | Komodo Day Trip d(+13) | 12 | 5 | | | Tanggal jatuh di dalam Sailing Komodo d(+12); guide belum ditugaskan |
| | Belitung d(+16) | 14 | 6 | 2 | | |
| | Bromo–Ijen d(+52) | 14 | 4 | | | + 1 booking `hold_expired` |
| | Bromo Sunrise d(+33) | 14 | 3 | 2 | | Di bawah minimum; hold milik customer yang sudah "konfirmasi pembayaran" |
| | Sailing Komodo d(+60) | 16 | 2 | 2 | | Hold dari booking website `pending` + 1 booking `hold_expired` |
| | Lombok & Gili d(+95) | 14 | 0 | | | Departure kosong (empty state manifest) |
| Private | Private Phinisi d(−60) | 4 | 4 | | | Selesai |
| | Custom Bali & Nusa Penida d(−25) | 8 | 8 | | | Selesai |
| | Bali Honeymoon d(+18) | 2 | 2 | | | DP diterima |
| | Private Jogja Family d(+40) | 6 | 6 | | | Lunas |
| | Custom Raja Ampat d(+75) | 4 | | 4 | | Menunggu pembayaran (hasil konversi) |
| **Total** | **27** | 328 | 181 | 18 | 12 | |

Guide: Komodo Day Trip d(+13) jatuh di dalam rentang Sailing Komodo d(+12)–d(+14). Guide Labuan Bajo utama sudah ditugaskan ke Sailing Komodo, dan Komodo Day Trip sengaja belum punya guide. Mencoba menugaskan guide yang sama akan ditolak, sehingga pencegahan bentrok jadwal bisa didemokan.

## 5. Booking (71)

| Status | Jumlah | Rincian skenario |
|---|---|---|
| `completed` | 24 | Di departure lampau (scheduled dan private). Semua lunas |
| `confirmed` | 32 | Mayoritas lunas atau DP diterima dengan pelunasan belum jatuh tempo · 2 **pelunasan lewat jatuh tempo** (berangkat < 14 hari) · 1 dengan payment pelunasan **menunggu verifikasi** · booking di trip yang sedang berlangsung |
| `awaiting_payment` | 5 | Hold di Lombok (2 booking) dan Nusa Penida (**berakhir < 6 jam**) · 1 customer di Bromo Sunrise d(+33) sudah "konfirmasi pembayaran" (menunggu verifikasi) · 1 hasil konversi Custom Raja Ampat |
| `pending` | 3 | Dibuat dari website ≤ 20 jam lalu: Bromo Sunrise d(+5) (penyebab "penuh karena hold"), Belitung d(+16) dengan **data peserta belum lengkap**, dan Sailing Komodo d(+60) |
| `cancelled` | 7 | 2 `hold_expired` oleh Sistem · 2 `customer_request` (1 refund selesai, 1 refund diproses) · 3 `departure_cancelled` (Raja Ampat lampau refund selesai; Bromo–Ijen: 1 selesai, 1 diproses) |

- Jumlah pax per booking 1–6 (rata-rata ±3; Open Trip sering dipesan rombongan teman atau keluarga). Total traveler ±215, sebagian adalah customer itu sendiri.
- Sumber: website ±40%, WhatsApp ±25%, Instagram ±15%, referral ±10%, sisanya TikTok, Google Ads, repeat, walk-in.
- `createdAt` tersebar d(−180) s.d. hari ini dengan kepadatan naik menjelang musim liburan, sehingga grafik tren memiliki bentuk.
- Diskon hanya di 4 booking (repeat customer dan grup), selalu tercatat sebagai baris diskon.

## 6. Inquiry (26)

| Tahap | Jumlah | Skenario |
|---|---|---|
| New | 5 | 2 dari website hari ini (1 custom, 1 private), 1 general dari kontak, 2 dari WhatsApp/Instagram |
| Contacted | 4 | 2 dengan **follow-up lewat jadwal** (muncul di widget overview) |
| Quotation Sent | 4 | 1 dengan quotation **kedaluwarsa** |
| Negotiation | 3 | 1 dengan quotation revisi (v2) |
| Won | 7 | 5 sudah dikonversi (5 private departure) · 2 **siap dikonversi** (1 private Phinisi, 1 general untuk grup Bromo Sunrise) |
| Lost | 3 | Alasan: harga, pilih kompetitor, tidak ada respons |

Jenis: 13 private, 9 custom, 4 general. Penanggung jawab tersebar di 2 sales dan owner. Setiap inquiry memiliki 0–4 catatan follow-up dan riwayat tahap di ActivityEvent.

## 7. Customer (70)

- 47 customer dengan booking aktif; 15 di antaranya memiliki ≥ 2 booking, dan 4 sudah berstatus **Repeat** (≥ 2 trip selesai). 23 prospek (hanya inquiry, atau booking yang batal). Inquiry yang dikonversi dan sebagian inquiry terbuka milik customer yang sudah pernah booking.
- Nama Indonesia yang beragam daerah (Jawa, Sunda, Batak, Minang, Bali, Bugis, Tionghoa-Indonesia, Flores) dari kumpulan nama depan dan belakang yang dirangkai PRNG.
- Kota asal: Jakarta, Bandung, Surabaya, Semarang, Medan, Makassar, Yogyakarta, Malang, Denpasar, Balikpapan, Palembang, Tangerang Selatan, Bekasi, Depok.

## 8. Tim, guide, vendor

**Role**: Owner (semua izin), Sales, Operasional, Finance, Content.

**User**: Rania Prameswari (Owner) · Dimas Prakoso (Sales Lead) · Sekar Ayuningtyas (Sales Executive) · Bayu Saputra (Operations Manager) · Lestari Handayani (Finance & Admin) · Nadia Putri (Content & Marketing) · Fajar Nugroho (Sales, status *invited*). Persona default: Rania (Owner).

**Guide (9)**: 2 Labuan Bajo, 2 Bali/Nusa Penida, 1 Lombok, 1 Raja Ampat, 1 Bromo, 1 Yogyakarta, 1 Belitung (status *inactive*).

**Vendor (19)**: kapal (5), transportasi (4), akomodasi (6), restoran (1), aktivitas (2), dokumentasi (1). Nama generik fiktif dan tidak meniru usaha nyata. Setiap departure mendapat penugasan vendor transportasi dan akomodasi; statusnya `confirmed` bila item checklist terkait sudah selesai.

## 9. Konten

- **Site Content**: hero Labuan Bajo, banner promo nonaktif secara default (diaktifkan saat demo), 6 paket unggulan, 5 destinasi unggulan, 4 poin keunggulan, 6 FAQ, halaman Tentang.
- **Artikel (6)**: panduan musim terbaik ke Labuan Bajo · persiapan Bromo dini hari · etika snorkeling di Raja Ampat · 48 jam di Yogyakarta · Belitung untuk keluarga · Nusa Penida sisi barat vs timur. 5 published, 1 draft.
- **Testimoni (6)**: nama depan dan kota fiktif, terhubung ke paket, selalu tampil dengan label "Ilustrasi". 5 tampil, 1 tersembunyi.

## 10. Foto

- ±48 foto: 5 per destinasi (1 cover + 4 galeri), 6 untuk artikel, 2 untuk halaman Tentang. Tidak ada foto yang dipakai dua kali sebagai cover.
- Setiap foto diverifikasi lewat halaman Unsplash-nya (judul, lokasi, deskripsi) bahwa memang menampilkan destinasi yang benar.
- Diunduh ke `public/images/<destinasi>/<nama>.jpg`, sisi terpanjang maksimal 2400 px. `blurDataURL` dibuat oleh script build-time. Kredit tersimpan di katalog media dan ditampilkan di `/kredit-foto`.
- Bukti transfer adalah ilustrasi SVG bertuliskan "CONTOH", bukan foto.

## Keamanan data fiktif

| Data | Aturan |
|---|---|
| Email customer | Domain cadangan RFC 2606: `@example.com`, `@example.net`, `@example.org` |
| Email tim dan perusahaan | `@nusavista.example` |
| Telepon | Format Indonesia `+62 811-0000-xxxx`. Hanya ditampilkan; tidak pernah dijadikan tautan `tel:` atau `wa.me` |
| Rekening | "Bank Contoh · 000-000-0000 · a.n. NusaVista Journey (simulasi)" |
| Alamat kantor | "Kantor demo — Denpasar, Bali", tanpa nama jalan atau nomor nyata |
| Identitas | Tidak ada NIK, nomor paspor, atau data kesehatan |
| Klaim | Tidak ada izin usaha, keanggotaan asosiasi, penghargaan, "sejak tahun …", jumlah pelanggan, atau rating terverifikasi |

## 11. Daftar periksa skenario

Requirement §8 dan alur demo harus bisa ditunjukkan dengan data seed tanpa persiapan:

- [ ] Kelima status booking ada
- [ ] Departure penuh (terkonfirmasi saja, dan penuh karena hold)
- [ ] Trip mendatang, sedang berlangsung, dan selesai
- [ ] Pembayaran tertunda: DP, pelunasan lewat jatuh tempo, menunggu verifikasi, refund diproses
- [ ] Inquiry lost dengan alasan, inquiry won siap dikonversi
- [ ] Paket dengan margin sehat, margin tipis, dan estimasi rugi
- [ ] Laba realisasi tersedia dan "Belum dapat dihitung"
- [ ] Hold hampir habis dan hold yang sudah dibatalkan Sistem
- [ ] Data peserta belum lengkap
- [ ] Customer repeat dan prospek
- [ ] Quotation revisi dan kedaluwarsa
- [ ] Paket draft (untuk demo publish), archived, dan custom
- [ ] Bentrok jadwal guide dapat dicoba
