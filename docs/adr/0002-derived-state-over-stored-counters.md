# Sisa kursi, status pembayaran, dan KPI dihitung, bukan disimpan

Sisa kursi, status pembayaran, sisa tagihan, status keberangkatan, kesiapan trip, dan semua KPI dihitung oleh fungsi murni di `src/domain/rules` dari data sumber (booking, traveler, payment, checklist). Tidak ada kolom `availableSeats` atau `paymentStatus` yang bisa diedit. Requirement melarang kuota yang diisi manual dan angka keuangan yang tidak konsisten. Menyimpan counter membuka peluang data tidak sinkron setiap kali ada booking, pembatalan, atau hold yang kedaluwarsa.

## Consequences

- Hold yang kedaluwarsa langsung tidak dihitung karena aturan membandingkan `holdExpiresAt` dengan waktu sekarang. System Job yang membatalkan booking kedaluwarsa hanya merapikan status dan mencatat aktivitas, bukan sumber kebenaran.
- Status booking tetap disimpan karena merupakan keputusan bisnis (misalnya pembatalan). Transisinya dijaga aturan yang sama sehingga tidak kontradiktif dengan pembayaran.
- Dengan volume data showcase (ratusan record), perhitungan ulang di setiap render cukup murah. Selector di-memo per versi database.
