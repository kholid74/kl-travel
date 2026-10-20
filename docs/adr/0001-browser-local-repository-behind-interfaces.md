# Data showcase hidup di browser, di balik interface repository

Showcase ini tidak memiliki backend. Seluruh data demo disimpan sebagai satu dokumen berversi di `localStorage` dan diakses UI hanya melalui service dan interface repository yang asinkron. Implementasi mock dapat diganti implementasi API tanpa mengubah komponen. Data berlaku per browser: tidak ada sinkronisasi antarperangkat atau antarpengguna, dan UI tidak boleh mengesankan sebaliknya.

## Consequences

- Setiap transaksi membaca ulang dokumen terbaru dari storage sebelum menulis, sehingga dua tab (website dan dashboard) tidak saling menimpa data lama. Perubahan dari tab lain diterima lewat event `storage`.
- Dokumen membawa `schemaVersion` dan `seedVersion`. Perubahan skema wajib menyertakan migrasi. Dokumen rusak atau tidak dikenal diganti seed baru dengan pemberitahuan.
- Tanggal seed dihitung relatif terhadap **Seed Anchor**, yaitu tanggal saat data pertama kali dibuat di browser itu. Reset membuat ulang data relatif terhadap hari ini. Jika anchor lebih tua dari 14 hari, dashboard menyarankan reset.
- Gambar tidak pernah disimpan di storage. Entitas hanya mereferensikan `MediaAsset` dari katalog statis, sehingga ukuran dokumen tetap jauh di bawah kuota localStorage.
