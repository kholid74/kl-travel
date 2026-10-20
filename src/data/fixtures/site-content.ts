import type { Settings, SiteContent } from "@/domain/entities"

export const SITE_CONTENT: Omit<SiteContent, "updatedAt"> = {
  hero: {
    eyebrow: "Open trip · Private trip · Perjalanan custom",
    title: "Nusantara, dirancang dengan saksama.",
    subtitle: "Grup kecil, jadwal yang jelas, dan harga transparan untuk menjelajah Labuan Bajo hingga Raja Ampat.",
    mediaId: "img-lbj-padar-golden",
    ctaLabel: "Lihat jadwal trip",
  },
  promoBanner: {
    enabled: false,
    message: "Jadwal Sailing Komodo musim kemarau sudah dibuka. Kuota setiap keberangkatan terbatas 16 orang.",
    linkLabel: "Lihat jadwal",
    linkHref: "/paket/sailing-komodo-phinisi-3h2m",
  },
  featuredPackageIds: [
    "pkg_lbj_sailing_3h2m",
    "pkg_ra_wayag_piaynemo_5h4m",
    "pkg_brm_sunrise_1h",
    "pkg_lbk_gili_3h2m",
    "pkg_yog_heritage_3h2m",
    "pkg_bali_honeymoon_5h4m",
  ],
  featuredDestinationIds: ["dst_labuan_bajo", "dst_raja_ampat", "dst_bromo", "dst_bali", "dst_belitung"],
  whyUs: [
    {
      icon: "users",
      title: "Grup kecil, suasana akrab",
      body: "Open trip kami dibatasi 10 sampai 16 peserta agar setiap orang tetap mendapat perhatian guide.",
    },
    {
      icon: "calendar-check",
      title: "Jadwal dan kuota yang jelas",
      body: "Sisa kursi setiap keberangkatan selalu terlihat, begitu juga kapan sebuah trip dipastikan berangkat.",
    },
    {
      icon: "receipt",
      title: "Harga yang transparan",
      body: "Apa yang termasuk dan tidak termasuk ditulis jelas sejak awal, lengkap dengan kebijakan pembatalannya.",
    },
    {
      icon: "compass",
      title: "Bekerja bersama mitra lokal",
      body: "Guide, homestay, dan kapal di setiap destinasi kami pilih dari mitra yang berasal dari daerah setempat.",
    },
  ],
  homepageFaqs: [
    {
      question: "Apa beda open trip, private trip, dan custom trip?",
      answer:
        "Open trip berangkat di jadwal tetap dan Anda bergabung dengan peserta lain. Private trip memakai itinerary yang sudah ada tetapi eksklusif untuk grup Anda di tanggal pilihan. Custom trip kami rancang dari awal sesuai kebutuhan Anda.",
    },
    {
      question: "Bagaimana cara memesan?",
      answer:
        "Pilih jadwal open trip dan isi data peserta, atau kirim permintaan untuk private dan custom trip. Tim kami memverifikasi ketersediaan lalu mengirim invoice berisi jadwal pembayaran.",
    },
    {
      question: "Berapa uang muka yang perlu dibayar?",
      answer:
        "Umumnya DP 30% untuk mengonfirmasi kursi, dan pelunasan paling lambat 14 hari sebelum keberangkatan. Trip satu hari dibayar penuh di awal.",
    },
    {
      question: "Bagaimana jika saya harus membatalkan?",
      answer:
        "Biaya pembatalan bergantung pada jarak ke tanggal keberangkatan, mulai 25% untuk pembatalan 30 hari atau lebih sebelumnya. Rinciannya tertulis di setiap halaman paket.",
    },
    {
      question: "Apakah saya bisa ikut open trip sendirian?",
      answer: "Bisa. Banyak peserta datang sendiri. Kamar atau kabin akan dibagi dengan peserta lain berjenis kelamin sama.",
    },
    {
      question: "Apa yang terjadi bila peserta minimum tidak tercapai?",
      answer:
        "Kami akan menghubungi Anda paling lambat 21 hari sebelum keberangkatan untuk memilih jadwal lain atau menerima pengembalian dana penuh.",
    },
  ],
  about: {
    headline: "Kami merancang perjalanan yang ingin kami jalani sendiri.",
    intro:
      "NusaVista Journey adalah operator perjalanan yang fokus pada destinasi alam dan budaya di Indonesia, dengan grup kecil dan perencanaan yang rapi.",
    story: [
      "Kami percaya perjalanan yang baik dimulai dari hal-hal kecil yang sering terlewat: jadwal yang realistis, waktu istirahat yang cukup, dan informasi yang jujur tentang apa yang akan Anda alami.",
      "Setiap itinerary kami susun bersama guide dan mitra lokal di destinasi. Mereka yang paling memahami kapan laut sedang tenang, jalur mana yang aman, dan tempat makan mana yang layak dikunjungi.",
      "Dari open trip untuk pejalan solo hingga perjalanan privat untuk keluarga, kami ingin setiap tamu pulang dengan cerita yang baik dan keinginan untuk kembali menjelajah Nusantara.",
    ],
    values: [
      { title: "Jujur sejak awal", body: "Harga, risiko cuaca, dan tingkat kesulitan kami sampaikan sebelum Anda memesan." },
      { title: "Keselamatan lebih dulu", body: "Rute bisa berubah bila kondisi tidak aman. Keputusan guide di lapangan selalu kami dukung." },
      { title: "Menghormati tempat yang dikunjungi", body: "Kami mengikuti aturan kawasan konservasi dan mengajak tamu melakukan hal yang sama." },
    ],
    mediaIds: ["img-brm-sea-of-fog", "img-yog-borobudur-sunrise"],
  },
  contact: {
    address: "Kantor demo — Denpasar, Bali",
    email: "halo@nusavista.example",
    whatsappDisplay: "+62 811-0000-1000",
    officeHours: "Senin – Sabtu, 09.00 – 18.00 WITA",
  },
}

export const SETTINGS: Settings = {
  company: {
    name: "NusaVista Journey",
    tagline: "Jelajahi Nusantara, tanpa repot merencanakan.",
    address: "Kantor demo — Denpasar, Bali",
    email: "halo@nusavista.example",
    phoneDisplay: "+62 811-0000-1000",
  },
  booking: {
    pendingHoldHours: 24,
    depositHoldHours: 48,
    salesCutoffDays: 2,
    lowSeatThreshold: 3,
    maxPaxPerBooking: 10,
  },
  payment: {
    defaultDepositPercent: 30,
    defaultBalanceDueDaysBefore: 14,
    bankAccountDisplay: { bank: "Bank Contoh", number: "000-000-0000", holder: "NusaVista Journey (simulasi)" },
  },
  invoice: {
    prefix: "INV/NV",
    footerNote: "Dokumen ini dibuat dalam mode demonstrasi dan bukan tagihan resmi.",
  },
}
