# Website publik: konten statis dirender server, data hidup diisi di browser

Server tidak bisa membaca localStorage, tetapi first impression website publik bergantung pada render server yang cepat. Halaman publik merender konten yang tidak bergantung waktu (hero, destinasi, deskripsi paket, artikel) dari fixture seed di server. Bagian yang bergantung pada data hidup atau waktu (daftar keberangkatan, sisa kursi, paket buatan dashboard, konten yang diedit) adalah client island. Island ini dirender dengan data awal yang sama dengan server, lalu diganti data dari store setelah hydration.

## Considered Options

- **Seluruh halaman client-side**: paling sederhana, tetapi first paint kosong dan buruk untuk demo penjualan.
- **Render tanggal di server**: seed di server dihitung dari tanggal build, sedangkan seed di browser dihitung dari tanggal kunjungan, sehingga tanggal keberangkatan akan berubah setelah halaman tampil.

## Consequences

- Tidak ada `new Date()`, `Math.random()`, atau format `Intl` yang bergantung ICU di jalur render server. Format rupiah dan tanggal memakai formatter deterministik sendiri.
- Paket yang dibuat di dashboard tidak ada saat build. Dengan Cache Components (default Next.js 16.4), slug di luar `generateStaticParams` dirender saat request, lalu halaman menyelesaikan slug di browser. Halaman "tidak ditemukan" untuk slug yang tidak dikenal juga ditentukan di browser, bukan lewat `notFound()` di server.
- Mengubah atau menyembunyikan paket seed di dashboard menyebabkan konten publik berganti setelah hydration. Ini diterima sebagai konsekuensi demo tanpa backend.
- Dashboard tidak butuh SEO, sehingga seluruh datanya dirender di browser dengan skeleton saat hydration.
