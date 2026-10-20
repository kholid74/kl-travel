import type { Guide, Role, Testimonial, User, Vendor } from "@/domain/entities"
import type { Fixture } from "./types"

export const ROLES: Role[] = [
  {
    id: "role_owner",
    key: "owner",
    name: "Owner",
    description: "Akses penuh ke seluruh modul, termasuk tim dan pengaturan.",
    permissions: [
      "inquiries.manage",
      "bookings.manage",
      "bookings.cancel",
      "payments.record",
      "payments.verify",
      "packages.manage",
      "packages.publish",
      "departures.manage",
      "operations.manage",
      "costing.manage",
      "content.manage",
      "reports.view",
      "team.manage",
      "settings.manage",
    ],
  },
  {
    id: "role_sales",
    key: "sales",
    name: "Sales",
    description: "Mengelola inquiry, penawaran, booking, dan pelanggan.",
    permissions: ["inquiries.manage", "bookings.manage", "payments.record", "reports.view"],
  },
  {
    id: "role_operations",
    key: "operations",
    name: "Operasional",
    description: "Mengelola paket, keberangkatan, dan persiapan trip.",
    permissions: ["packages.manage", "departures.manage", "operations.manage", "costing.manage", "reports.view"],
  },
  {
    id: "role_finance",
    key: "finance",
    name: "Finance",
    description: "Mencatat dan memverifikasi pembayaran, refund, serta HPP.",
    permissions: ["payments.record", "payments.verify", "bookings.cancel", "costing.manage", "reports.view"],
  },
  {
    id: "role_content",
    key: "content",
    name: "Content",
    description: "Mengelola konten website, artikel, testimoni, dan publikasi paket.",
    permissions: ["content.manage", "packages.manage", "packages.publish"],
  },
]

export const USERS: Fixture<User>[] = [
  { id: "usr_rania", name: "Rania Prameswari", email: "rania@nusavista.example", title: "Pemilik & Direktur", roleId: "role_owner", status: "active" },
  { id: "usr_dimas", name: "Dimas Prakoso", email: "dimas@nusavista.example", title: "Sales Lead", roleId: "role_sales", status: "active" },
  { id: "usr_sekar", name: "Sekar Ayuningtyas", email: "sekar@nusavista.example", title: "Sales Executive", roleId: "role_sales", status: "active" },
  { id: "usr_bayu", name: "Bayu Saputra", email: "bayu@nusavista.example", title: "Operations Manager", roleId: "role_operations", status: "active" },
  { id: "usr_lestari", name: "Lestari Handayani", email: "lestari@nusavista.example", title: "Finance & Admin", roleId: "role_finance", status: "active" },
  { id: "usr_nadia", name: "Nadia Putri", email: "nadia@nusavista.example", title: "Content & Marketing", roleId: "role_content", status: "active" },
  { id: "usr_fajar", name: "Fajar Nugroho", email: "fajar@nusavista.example", title: "Sales Executive", roleId: "role_sales", status: "invited" },
]

export const DEFAULT_PERSONA_ID = "usr_rania"

export const GUIDES: Fixture<Guide>[] = [
  { id: "gde_kornelis", name: "Kornelis Ndun", phone: "+6281100002001", languages: ["Indonesia", "Inggris"], destinationIds: ["dst_labuan_bajo"], status: "active" },
  { id: "gde_agustinus", name: "Agustinus Laka", phone: "+6281100002002", languages: ["Indonesia", "Inggris"], destinationIds: ["dst_labuan_bajo"], status: "active" },
  { id: "gde_made", name: "Made Wiratama", phone: "+6281100002003", languages: ["Indonesia", "Inggris", "Jepang"], destinationIds: ["dst_bali", "dst_nusa_penida"], status: "active" },
  { id: "gde_kadek", name: "Kadek Ayu Lestari", phone: "+6281100002004", languages: ["Indonesia", "Inggris"], destinationIds: ["dst_bali", "dst_nusa_penida"], status: "active" },
  { id: "gde_lalu", name: "Lalu Ahmad Fauzi", phone: "+6281100002005", languages: ["Indonesia", "Inggris"], destinationIds: ["dst_lombok"], status: "active" },
  { id: "gde_yonas", name: "Yonas Mambrasar", phone: "+6281100002006", languages: ["Indonesia", "Inggris"], destinationIds: ["dst_raja_ampat"], status: "active" },
  { id: "gde_arief", name: "Arief Setiawan", phone: "+6281100002007", languages: ["Indonesia", "Inggris"], destinationIds: ["dst_bromo"], status: "active" },
  { id: "gde_rara", name: "Rara Kusumawardhani", phone: "+6281100002008", languages: ["Indonesia", "Inggris", "Belanda"], destinationIds: ["dst_yogyakarta"], status: "active" },
  { id: "gde_hendra", name: "Hendra Wijaya", phone: "+6281100002009", languages: ["Indonesia", "Mandarin"], destinationIds: ["dst_belitung"], status: "inactive" },
]

export const VENDORS: Fixture<Vendor>[] = [
  { id: "vnd_samudra_nusa", name: "KM Samudra Nusa", category: "kapal", destinationIds: ["dst_labuan_bajo"], contactName: "Pak Hasan", phone: "+6281100003001", notes: "Phinisi 8 kabin, kapasitas 16 tamu." },
  { id: "vnd_lintas_komodo", name: "Lintas Komodo Speedboat", category: "kapal", destinationIds: ["dst_labuan_bajo"], contactName: "Pak Yusuf", phone: "+6281100003002" },
  { id: "vnd_wayag_marine", name: "Wayag Marine Charter", category: "kapal", destinationIds: ["dst_raja_ampat"], contactName: "Pak Ronald", phone: "+6281100003003" },
  { id: "vnd_cemoro_jeep", name: "Paguyuban Jip Cemoro", category: "transportasi", destinationIds: ["dst_bromo"], contactName: "Mas Agus", phone: "+6281100003004" },
  { id: "vnd_lombok_trans", name: "Lombok Trans Rental", category: "transportasi", destinationIds: ["dst_lombok"], contactName: "Pak Zainal", phone: "+6281100003005" },
  { id: "vnd_jogja_hiace", name: "Jogja Hiace Lestari", category: "transportasi", destinationIds: ["dst_yogyakarta"], contactName: "Pak Bambang", phone: "+6281100003006" },
  { id: "vnd_bali_driver", name: "Kolektif Driver Bali", category: "transportasi", destinationIds: ["dst_bali", "dst_nusa_penida"], contactName: "Bli Wayan", phone: "+6281100003007" },
  { id: "vnd_pondok_kelayang", name: "Pondok Kelayang", category: "akomodasi", destinationIds: ["dst_belitung"], contactName: "Ibu Lina", phone: "+6281100003008" },
  { id: "vnd_sembalun_lodge", name: "Sembalun Lodge", category: "akomodasi", destinationIds: ["dst_lombok"], contactName: "Pak Ramli", phone: "+6281100003009" },
  { id: "vnd_ubud_taman", name: "Taman Sawah Ubud", category: "akomodasi", destinationIds: ["dst_bali"], contactName: "Ibu Komang", phone: "+6281100003010" },
  { id: "vnd_kri_homestay", name: "Homestay Kri Indah", category: "akomodasi", destinationIds: ["dst_raja_ampat"], contactName: "Mama Ester", phone: "+6281100003011" },
  { id: "vnd_pesisir_bajo", name: "Dapur Pesisir Bajo", category: "restoran", destinationIds: ["dst_labuan_bajo"], contactName: "Ibu Nur", phone: "+6281100003012" },
  { id: "vnd_penida_snorkel", name: "Penida Snorkel Bersama", category: "aktivitas", destinationIds: ["dst_nusa_penida"], contactName: "Bli Ketut", phone: "+6281100003013" },
  { id: "vnd_merapi_jeep", name: "Komunitas Jip Lereng Merapi", category: "aktivitas", destinationIds: ["dst_yogyakarta"], contactName: "Mas Joko", phone: "+6281100003014" },
  { id: "vnd_lensa_nusantara", name: "Lensa Nusantara Studio", category: "dokumentasi", destinationIds: ["dst_labuan_bajo", "dst_raja_ampat", "dst_bali"], contactName: "Mbak Tika", phone: "+6281100003015" },
  { id: "vnd_kaldera_inn", name: "Penginapan Kaldera Cemoro Lawang", category: "akomodasi", destinationIds: ["dst_bromo"], contactName: "Pak Slamet", phone: "+6281100003016" },
  { id: "vnd_ndalem_jogja", name: "Ndalem Prawirotaman Guesthouse", category: "akomodasi", destinationIds: ["dst_yogyakarta"], contactName: "Ibu Sri", phone: "+6281100003017" },
  { id: "vnd_kelayang_boat", name: "Kelayang Boat Service", category: "kapal", destinationIds: ["dst_belitung"], contactName: "Pak Amir", phone: "+6281100003018" },
  { id: "vnd_gili_boat", name: "Gili Sea Shuttle", category: "kapal", destinationIds: ["dst_lombok"], contactName: "Pak Lalu Hamdi", phone: "+6281100003019" },
]

export const TESTIMONIALS: (Fixture<Testimonial> & { daysAgo: number })[] = [
  { id: "tst_dinda", authorName: "Dinda, Bandung", quote: "Jadwalnya rapi dan guide-nya sabar menunggu kami yang paling lambat naik ke Padar. Kabin kapal juga lebih bersih dari yang kami bayangkan.", packageId: "pkg_lbj_sailing_3h2m", status: "published", daysAgo: 40 },
  { id: "tst_raka", authorName: "Raka, Jakarta", quote: "Pertama kali ikut open trip sendirian dan langsung dapat teman perjalanan. Informasi sebelum berangkat sangat jelas.", packageId: "pkg_brm_ijen_3h2m", status: "published", daysAgo: 55 },
  { id: "tst_maria", authorName: "Maria & Yoga, Surabaya", quote: "Bulan madu kami tenang sekali. Semua sudah diatur, kami tinggal menikmati.", packageId: "pkg_bali_honeymoon_5h4m", status: "published", daysAgo: 70 },
  { id: "tst_siregar", authorName: "Keluarga Siregar, Medan", quote: "Anak-anak paling suka kelas membatik dan jip Merapi. Jadwalnya tidak melelahkan untuk orang tua kami.", packageId: "pkg_yog_family_4h3m", status: "published", daysAgo: 92 },
  { id: "tst_ayu", authorName: "Ayu, Makassar", quote: "Raja Ampat memang jauh, tapi semua transfer berjalan lancar dan homestay-nya hangat sekali.", packageId: "pkg_ra_wayag_piaynemo_5h4m", status: "published", daysAgo: 110 },
  { id: "tst_bima", authorName: "Bima, Semarang", quote: "Pendakian Rinjani berat, tapi guide dan porternya luar biasa membantu.", packageId: "pkg_lbk_rinjani_3h2m", status: "hidden", daysAgo: 130 },
]
