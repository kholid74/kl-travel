# Siklus hidup berbeda per jenis trip, bertemu di Departure

Open Trip dijual per kursi pada Scheduled Departure dan langsung menjadi booking. Private dan Custom Trip selalu melalui Inquiry → Quotation sebelum menjadi booking, karena harga dan tanggalnya baru pasti setelah negosiasi. Saat dikonversi, keduanya menghasilkan **Private Departure** khusus (Custom Trip juga menghasilkan paket `custom` yang `unlisted`). Dengan begitu operasional, manifest, HPP, dan laporan bekerja seragam di atas Departure untuk ketiga jenis trip.

## Considered Options

- **Satu siklus untuk semua jenis**: memaksa private/custom punya kursi dan jadwal sebelum harga disepakati, bertentangan dengan requirement.
- **Booking tanpa departure untuk private/custom**: modul operasional, manifest, dan HPP harus menangani dua bentuk data. Ditolak demi keseragaman.

## Consequences

- Daftar paket di dashboard memuat paket `custom` hasil quotation. Paket ini difilter terpisah dan tidak pernah tampil di katalog publik.
- Private Departure tidak muncul di website publik dan kapasitasnya terkunci ke jumlah peserta booking-nya.
