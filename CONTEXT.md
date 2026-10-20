# NusaVista Journey — Travel Operator

Bahasa bersama untuk showcase operator travel fiktif NusaVista Journey: website publik untuk calon wisatawan dan dashboard operasional untuk tim internal. Istilah kanonik ditulis dalam bahasa Inggris (dipakai di kode); label UI dalam bahasa Indonesia.

## Katalog

**Destination**:
Tempat wisata yang dipasarkan, misalnya Labuan Bajo atau Bromo, dikelompokkan per region dan kategori.
_Label UI_: Destinasi · _Avoid_: Location, spot, area

**Region**:
Pengelompokan geografis destinasi untuk filter, misalnya "Bali & Nusa Tenggara".
_Label UI_: Wilayah · _Avoid_: Province (provinsi adalah atribut terpisah)

**Tour Package**:
Produk perjalanan yang dijual, dengan satu destinasi utama, durasi, itinerary, harga, dan kebijakan.
_Label UI_: Paket Wisata · _Avoid_: Product, tour, trip (tanpa kualifikasi)

**Trip Type**:
Model bisnis sebuah paket: Open Trip, Private Trip, atau Custom Trip.
_Label UI_: Jenis Trip · _Avoid_: Category, package type

**Open Trip**:
Paket dengan jadwal keberangkatan tetap; peserta dari berbagai pemesan bergabung dalam satu grup dan membeli kursi per orang.
_Avoid_: Group tour, sharing trip

**Private Trip**:
Paket siap jual yang dioperasikan eksklusif untuk satu grup pemesan, dengan tanggal dan ukuran grup pilihan pemesan; harga melalui penawaran.
_Avoid_: Exclusive trip, VIP trip

**Custom Trip**:
Perjalanan yang dirancang dari nol berdasarkan kebutuhan pelanggan; paketnya baru ada setelah penawaran disetujui dan tidak pernah tampil di katalog publik.
_Avoid_: Tailor-made package, bespoke

**Itinerary Day**:
Rencana kegiatan untuk satu hari dalam sebuah paket.
_Label UI_: Hari ke-n · _Avoid_: Schedule, rundown

**Duration**:
Lama perjalanan dalam hari dan malam, ditulis dengan konvensi "3H2M" (3 Hari 2 Malam).
_Avoid_: Length, nights-only

## Keberangkatan

**Departure**:
Satu kejadian operasional dari sebuah paket pada tanggal tertentu, dengan kapasitas kursi, guide, dan biaya operasional sendiri.
_Label UI_: Keberangkatan · _Avoid_: Schedule, batch, trip date

**Scheduled Departure**:
Departure Open Trip yang dijadwalkan operator dan kursinya dijual ke publik.
_Label UI_: Jadwal Open Trip

**Private Departure**:
Departure yang dibuat khusus untuk satu booking Private Trip atau Custom Trip; kapasitasnya sama dengan ukuran grup dan tidak dijual ke publik.

**Capacity**:
Jumlah kursi maksimum sebuah departure.
_Label UI_: Kapasitas · _Avoid_: Quota (kuota adalah sisa kursi, bukan kapasitas)

**Seat Allocation**:
Kursi yang terpakai secara pasti oleh booking yang sudah Confirmed atau Completed.
_Label UI_: Kursi terkonfirmasi

**Seat Hold**:
Penahanan kursi sementara oleh booking Pending atau Awaiting Payment sampai batas waktunya habis.
_Label UI_: Kursi ditahan · _Avoid_: Reservation, temporary booking

**Available Seats**:
Kapasitas dikurangi Seat Allocation dan Seat Hold yang masih aktif; tidak pernah negatif.
_Label UI_: Sisa kursi / Sisa kuota · _Avoid_: Free seats, remaining quota (sebagai angka yang diisi manual)

**Minimum Participants**:
Jumlah kursi terkonfirmasi minimal agar Scheduled Departure layak dijalankan.
_Label UI_: Minimum peserta · _Avoid_: Quorum

**Guaranteed Departure**:
Scheduled Departure yang Seat Allocation-nya sudah mencapai Minimum Participants.
_Label UI_: Pasti Berangkat

## Penjualan

**Inquiry**:
Permintaan atau pertanyaan calon pelanggan yang belum menjadi booking, untuk Private Trip, Custom Trip, atau pertanyaan umum.
_Label UI_: Inquiry · _Avoid_: Lead (sebagai nama record), ticket, request

**Pipeline Stage**:
Posisi sebuah inquiry dalam proses penjualan: New, Contacted, Quotation Sent, Negotiation, Won, Lost.
_Label UI_: Tahap · _Avoid_: Inquiry status

**Quotation**:
Penawaran harga tertulis untuk sebuah inquiry, berversi dan punya masa berlaku.
_Label UI_: Penawaran · _Avoid_: Quote, estimate, proposal

**Conversion**:
Tindakan mengubah inquiry berstatus Won menjadi booking, tanpa membuat Customer ganda.
_Label UI_: Konversi ke booking

**Customer**:
Orang yang menghubungi, memesan, dan bertanggung jawab atas pembayaran; dikenali secara unik dari nomor telepon atau email.
_Label UI_: Pelanggan · _Avoid_: Client, buyer, user, account

**Prospect**:
Customer yang baru memiliki inquiry dan belum pernah memiliki booking aktif.
_Label UI_: Prospek

**Traveler**:
Orang yang ikut dalam perjalanan; bisa sama atau berbeda dengan Customer yang memesan.
_Label UI_: Peserta · _Avoid_: Passenger, guest, pax (sebagai nama entitas)

**Lead Traveler**:
Peserta yang menjadi kontak utama selama perjalanan untuk satu booking.
_Label UI_: Peserta utama

**Pax**:
Satuan hitung jumlah peserta. Dipakai untuk angka, bukan nama entitas.

**Booking**:
Pemesanan atas sebuah departure untuk satu atau lebih traveler oleh satu customer.
_Label UI_: Booking · _Avoid_: Order, reservation, transaction

**Booking Status**:
Tahap siklus hidup booking: Pending, Awaiting Payment, Confirmed, Completed, Cancelled. Terpisah dari Payment Status.
_Label UI_: Status booking

**Booking Source**:
Kanal asal booking atau inquiry, misalnya Website, WhatsApp, Instagram, Referral.
_Label UI_: Sumber · _Avoid_: Channel, origin

## Keuangan

**Invoice**:
Tagihan resmi untuk satu booking, berisi rincian harga dan jadwal pembayaran.
_Label UI_: Invoice · _Avoid_: Bill, receipt (kuitansi adalah bukti bayar)

**Installment**:
Satu bagian jadwal pembayaran sebuah invoice, yaitu DP atau pelunasan, dengan nominal dan tanggal jatuh tempo.
_Label UI_: Termin · _Avoid_: Partial invoice

**Deposit**:
Termin pertama yang mengunci booking menjadi Confirmed.
_Label UI_: DP (Down Payment) · _Avoid_: Booking fee, uang muka (pakai "DP")

**Balance Payment**:
Termin terakhir yang melunasi sisa tagihan sebelum batas waktu tertentu menjelang keberangkatan.
_Label UI_: Pelunasan

**Payment**:
Catatan uang masuk atau keluar (refund) untuk sebuah booking. Hanya payment yang terverifikasi yang dihitung.
_Label UI_: Pembayaran · _Avoid_: Transaction

**Payment Verification**:
Pemeriksaan manual oleh tim finance bahwa sebuah payment benar-benar diterima.
_Label UI_: Verifikasi pembayaran

**Payment Status**:
Kondisi pelunasan sebuah booking yang selalu dihitung dari payment terverifikasi dan jadwal termin: Unpaid, Partially Paid, Paid, Overdue, Refund Pending, Refunded.
_Label UI_: Status pembayaran

**Outstanding Balance**:
Total tagihan dikurangi payment terverifikasi bersih untuk booking yang belum dibatalkan.
_Label UI_: Sisa tagihan · _Avoid_: Debt, piutang (di UI)

**Cancellation Fee**:
Bagian harga booking yang menjadi hak operator saat booking dibatalkan, ditentukan oleh tier kebijakan pembatalan paket.
_Label UI_: Biaya pembatalan

**Refund**:
Uang yang dikembalikan kepada customer, sebesar payment terverifikasi dikurangi Cancellation Fee, minimal nol.
_Label UI_: Pengembalian dana

## Costing

**Cost Item**:
Satu komponen biaya operasional sebuah departure atau template paket, misalnya kapal atau tiket masuk.
_Label UI_: Komponen biaya

**Fixed Cost**:
Biaya per departure yang tidak bergantung jumlah peserta, misalnya sewa kapal atau fee guide.
_Label UI_: Biaya tetap

**Variable Cost**:
Biaya per peserta, misalnya tiket masuk atau makan.
_Label UI_: Biaya per peserta

**HPP**:
Harga Pokok Penjualan: total biaya operasional sebuah departure pada jumlah peserta tertentu; dapat dinyatakan per peserta.
_Avoid_: COGS (di UI), modal

**Estimated Profit**:
Selisih pendapatan dan HPP berdasarkan biaya estimasi dan jumlah peserta yang direncanakan. Bukan keuntungan nyata.
_Label UI_: Estimasi laba kotor

**Realized Profit**:
Selisih pendapatan dari booking yang selesai dan biaya aktual yang tercatat, untuk departure yang sudah selesai.
_Label UI_: Laba kotor realisasi

**Gross Margin**:
Laba kotor dibagi pendapatan.
_Label UI_: Margin · _Avoid_: Markup (berbeda)

**Markup**:
Laba kotor dibagi HPP.
_Label UI_: Markup · _Avoid_: Margin (berbeda)

**Break-even Participants**:
Jumlah peserta minimum agar pendapatan menutup HPP sebuah departure.
_Label UI_: Titik impas (pax)

## Operasional

**Trip Operation**:
Persiapan dan pelaksanaan sebuah departure: checklist, guide, vendor, dan manifest.
_Label UI_: Operasional Trip · _Avoid_: Trip (tanpa kualifikasi), job

**Trip Checklist**:
Daftar tugas persiapan untuk satu departure.
_Label UI_: Checklist persiapan

**Trip Readiness**:
Kondisi kesiapan sebuah departure yang diturunkan dari checklist dan tanggal: Not Started, Preparing, Ready, In Progress, Completed, Cancelled.
_Label UI_: Status persiapan

**Manifest**:
Daftar resmi traveler untuk satu departure dari semua booking Confirmed.
_Label UI_: Manifest peserta · _Avoid_: Passenger list, rooming list

**Guide**:
Pemandu wisata yang ditugaskan ke departure; tidak boleh bertugas di dua departure yang tanggalnya tumpang tindih.
_Label UI_: Guide · _Avoid_: Tour leader (kecuali memang peran berbeda)

**Vendor**:
Pihak ketiga penyedia layanan perjalanan, misalnya kapal, hotel, transportasi, atau restoran.
_Label UI_: Vendor · _Avoid_: Supplier, partner

**Vendor Assignment**:
Penugasan vendor untuk satu kategori layanan pada satu departure, beserta status konfirmasinya.
_Label UI_: Penugasan vendor

## Konten & Sistem

**Site Content**:
Konten website publik yang dapat diedit tim, seperti hero, banner promo, paket unggulan, dan halaman Tentang.
_Label UI_: Konten Website

**Article**:
Tulisan panduan atau inspirasi perjalanan di website publik.
_Label UI_: Jurnal / Artikel · _Avoid_: Blog post, news

**Testimonial**:
Kutipan pengalaman pelanggan. Di showcase ini selalu berupa ilustrasi dan diberi label demo.
_Label UI_: Testimoni (ilustrasi)

**User**:
Anggota tim internal yang menggunakan dashboard.
_Label UI_: Anggota tim · _Avoid_: Customer, admin (sebagai nama entitas)

**Role**:
Kumpulan izin yang menentukan aksi yang boleh dilakukan seorang User.
_Label UI_: Peran

**Persona**:
User yang sedang "dipakai" untuk melihat dashboard dalam mode demo, sebagai pengganti login.
_Label UI_: Lihat sebagai

**Demo Data**:
Seluruh data contoh yang hidup di browser pengunjung dan dapat di-reset ke kondisi awal.
_Label UI_: Data demo

**Seed Anchor**:
Tanggal acuan saat data demo dibuat; semua tanggal contoh dihitung relatif terhadapnya.
_Label UI_: Tanggal data demo

**System Job**:
Proses otomatis yang disimulasikan, misalnya melepas Seat Hold yang kedaluwarsa, dan tercatat sebagai aktivitas oleh "Sistem".
_Label UI_: Sistem
