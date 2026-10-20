# Struktur Komponen

## 1. Struktur folder

```text
src/
  app/
    layout.tsx                    # <html lang="id">, font, Providers, Toaster
    globals.css                   # token Tailwind v4 (@theme), base, print
    robots.ts
    (public)/
      layout.tsx                  # PromoBar, SiteHeader, SiteFooter, DemoLauncher
      page.tsx                    # beranda
      not-found.tsx · error.tsx
      destinasi/  paket/  custom-trip/  konfirmasi/  jurnal/  tentang/  kontak/  demo/  kredit-foto/
    (dashboard)/
      dashboard/
        layout.tsx                # AppShell
        page.tsx                  # overview
        not-found.tsx · error.tsx
        inquiries/  bookings/  customers/  packages/  destinations/  departures/
        operations/  payments/  invoices/  costing/  content/  articles/  testimonials/
        reports/  team/  settings/
    print/
      layout.tsx                  # tanpa chrome, CSS cetak
      invoices/[id]/  manifest/[departureId]/

  components/
    ui/                           # primitif shadcn yang sudah dikustomisasi (button, input, dialog, sheet, …)
    shared/                       # dipakai publik & dashboard
    public/                       # komponen website publik
    dashboard/                    # kerangka & pola dashboard

  features/
    <modul>/                      # destinations, packages, departures, inquiries, bookings, customers,
                                  # payments, invoices, operations, costing, content, reports, team, demo
      components/                 # UI khusus modul (publik maupun dashboard)
      hooks/                      # useXxx (query) · useXxxAction (mutasi)
      schemas/                    # skema Zod form
      labels.ts                   # label & warna status bahasa Indonesia
      columns.tsx                 # definisi kolom tabel dashboard (bila ada)

  domain/
    entities/                     # interface entitas (satu file per agregat)
    types/                        # value object & enum bersama (ID, IDR, DateOnly, Actor, …)
    rules/                        # fungsi murni + *.test.ts
      availability.ts  booking-lifecycle.ts  payment-status.ts  invoice-schedule.ts
      cancellation.ts  inquiry-pipeline.ts  customer-identity.ts  trip-readiness.ts
      costing.ts  metrics.ts  validate-database.ts

  repositories/
    interfaces/                   # BookingRepository, PackageRepository, … + DataSource
    mock/                         # LocalDatabase, StorageAdapter, migrations, implementasi repository
    index.ts                      # composition root: getDataSource()

  services/
    booking-service.ts  inquiry-service.ts  payment-service.ts  departure-service.ts
    package-service.ts  destination-service.ts  operations-service.ts  costing-service.ts
    content-service.ts  team-service.ts  demo-service.ts  system-jobs.ts  activity-log.ts
    queries/                      # read model: fungsi murni atas snapshot (list + filter + join)
    catalog-server.ts             # akses fixture read-only untuk render server halaman publik

  data/
    fixtures/                     # konten editorial: destinasi, paket, artikel, site content, media
    seed/
      build-seed.ts               # buildSeed(anchor)
      scenarios/                  # departure, booking, inquiry yang ditulis tangan
      generators/                 # nama, kota, waktu (PRNG ber-seed)
      seed.test.ts                # invarian + daftar periksa skenario

  stores/
    db-store.ts                   # snapshot + version + status hydration
    ui-store.ts                   # sidebar, persona, view, panduan demo

  hooks/
    use-now.ts                    # jam bersama (null saat SSR/hydration), berdetak 30 detik
    use-url-search-input.ts       # kotak pencarian yang tersinkron ke query string

  lib/
    format.ts                     # formatIDR, formatIDRCompact, formatDate, formatDateRange, formatDuration, formatPhone
    dates.ts                      # clock, today() WIB, addDays, diffDays untuk DateOnly
    ids.ts  prng.ts  phone.ts  cn.ts  result.ts
```

## 2. Konvensi

| Topik | Aturan |
|---|---|
| Server vs client | Default server component. `'use client'` hanya pada island yang butuh store, state, atau event. Nama island diberi akhiran yang jelas bila perlu (`DepartureListLive`) |
| Data di komponen | Komponen presentasi menerima props. Hanya komponen "container" di `features/*/components` yang memanggil hook |
| Status & label | Satu sumber di `features/<modul>/labels.ts` → dipakai `StatusBadge` dan filter. Tidak ada string status yang ditulis ulang di komponen |
| Penamaan file | `kebab-case.tsx`; komponen `PascalCase`; hook `useXxx`; aksi `useXxxAction` |
| Teks UI | Bahasa Indonesia, kalimat pendek, tanpa jargon teknis untuk pengguna publik |
| Angka | Selalu lewat `lib/format`. Kolom angka di tabel rata kanan dengan `tabular-nums` |
| Ikon | Lucide, `strokeWidth` 1.75, ukuran 16/20. Ikon tanpa teks wajib `aria-label` |
| Aksi simulasi | Dibungkus `SimulatedAction`, yang menambahkan penanda "Simulasi" dan dialog penjelasan |

## 3. Inventaris komponen

### shared

| Komponen | Fungsi |
|---|---|
| `Logo` | Wordmark NusaVista Journey (varian terang/gelap, ukuran) |
| `SmartImage` | Pembungkus `next/image` dengan `MediaAsset` (alt, blur, kredit opsional) |
| `Money`, `DateText`, `DurationText` | Tampilan angka dan tanggal yang konsisten |
| `StatusBadge` | Badge status dari `labels.ts` (nada: neutral, info, success, warning, danger, accent) |
| `TripTypeBadge` | Open / Private / Custom |
| `SeatMeter` | Visual kursi: terkonfirmasi · ditahan · sisa (publik dan dashboard) |
| `EmptyState`, `ErrorState`, `Skeleton*` | State standar |
| `SimulatedAction`, `DemoNotice` | Penanda aksi simulasi dan catatan "data fiktif" |
| `StepProgress` | Indikator langkah untuk alur booking dan inquiry |
| `ClientOnly` | Merender anak hanya setelah mount (untuk nilai bergantung waktu) |

### public

| Komponen | Fungsi |
|---|---|
| `PromoBar` | Banner promo dari Site Content (bisa ditutup) |
| `SiteHeader`, `MobileNav` | Navigasi utama; header transparan di atas hero, padat saat scroll; menu mobile layar penuh |
| `SiteFooter` | Tautan, kontak, penanda demo, kredit Kalsara |
| `Hero` | Foto sinematik, judul editorial, satu CTA, dan `TripSearch` |
| `TripSearch` | Destinasi · jenis trip · bulan → `/paket?…` |
| `SectionHeading` | Eyebrow + judul display + deskripsi singkat |
| `DestinationMosaic` | Grid editorial asimetris untuk destinasi unggulan |
| `PackageCard` | Kartu paket (varian: standar, horizontal, ringkas) dengan harga "mulai dari" dan indikator ketersediaan |
| `DepartureStrip` | Daftar keberangkatan terdekat yang dapat di-scroll |
| `TripModelShowcase` | Section Private & Custom Trip (split editorial) |
| `ValueList` | Section "Kenapa bersama kami" |
| `ArticleFeature`, `ArticleCard` | Konten editorial |
| `FaqAccordion` | FAQ |
| `ClosingCta` | CTA penutup |
| `PackageFilters`, `ActiveFilterChips`, `SortSelect` | Filter daftar paket (sheet di mobile) |
| `Gallery`, `Lightbox` | Galeri detail paket dan destinasi |
| `ItineraryTimeline` | Itinerary per hari (accordion di mobile) |
| `InclusionList`, `PolicyBlock`, `MeetingPoint` | Detail paket |
| `BookingPanel` | Panel sticky detail paket: pilih departure (open), kalkulasi tier harga (private), CTA |
| `MobileBookingBar` | CTA bawah layar di mobile |
| `DepartureSelector` | Pilihan keberangkatan dengan sisa kursi live |
| `BookingFlow`, `PrivateRequestFlow`, `CustomTripFlow` | Wizard multi-langkah |
| `TravelerFields` | Field data peserta berulang |
| `ConfirmationSummary` | Ringkasan di halaman konfirmasi |
| `DemoLauncher` | Tombol "Demo" mengambang + panel |
| `TestimonialCarousel` | Testimoni berlabel ilustrasi |

### dashboard

| Komponen | Fungsi |
|---|---|
| `AppShell`, `SidebarNav`, `Topbar` | Kerangka: sidebar 7 grup yang bisa dilipat (sheet di mobile), topbar dengan breadcrumb |
| `DemoModeBadge`, `DemoPanel` | Indikator Demo Mode dan panelnya |
| `PersonaSwitcher` | "Lihat sebagai" |
| `PageHeader` | Judul, deskripsi, aksi utama, tab |
| `KpiCard` | Angka utama, delta periode, subteks, tautan |
| `ChartCard` | Kerangka grafik + ringkasan teks + toggle tabel data |
| `DataTable` | Sort, paginasi, pilih baris, kolom responsif (berubah jadi daftar kartu di mobile) |
| `FilterBar`, `SearchInput`, `DateRangeFilter` | Filter yang tersinkron ke query string |
| `DetailLayout` | Dua kolom: konten utama + sidebar ringkasan (bertumpuk di mobile) |
| `Timeline` | ActivityEvent untuk satu entitas |
| `EntityLink` | Tautan konsisten ke entitas lain (kode + nama) |
| `ConfirmDialog` | Konfirmasi aksi berisiko, dengan ringkasan dampak |
| `FormSection`, `FormActions` | Tata letak form panjang |
| `KanbanBoard`, `KanbanColumn`, `KanbanCard` | Pipeline inquiry (dnd-kit + alternatif keyboard) |
| `MonthCalendar` | Kalender keberangkatan |
| `PermissionGate` | Menonaktifkan aksi dengan tooltip bila persona tidak punya izin |

### Komponen fitur utama (contoh)

| Modul | Komponen |
|---|---|
| bookings | `BookingDetail`, `PaymentSummaryCard`, `InstallmentSchedule`, `CancelBookingDialog`, `RecordPaymentDialog`, `TravelerEditor` |
| inquiries | `InquiryBoard`, `InquiryDetail`, `QuotationBuilder`, `ConvertInquiryDialog`, `FollowUpComposer` |
| packages | `PackageForm`, `ItineraryBuilder`, `PricingEditor`, `MediaPicker`, `PublishControl` |
| departures | `DepartureCalendar`, `DepartureForm`, `CapacityEditor`, `ManifestTable` |
| operations | `ReadinessBoard`, `ChecklistPanel`, `GuideAssigner`, `VendorAssignments` |
| costing | `CostItemTable`, `ParticipantSlider`, `ProfitSummary`, `ProfitCurveChart`, `CostBreakdownChart` |
| reports | `ReportFilters`, satu komponen per grafik |
| content | `HomepageContentForm`, `FeaturedPicker`, `AboutContentForm`, `ArticleEditor` |
| demo | `DemoGuide`, `DemoResetButton`, `SeedAgeBanner` |
| home (publik) | `HomeHero`, `DestinationMosaic`, `FeaturedTrips`, `TripModels`, `DepartureTimetable`, `WhyUs`, `JournalSpread`, `HomeFaq` |

Catatan Phase 2: `BookingPanel`, `DepartureList`, `PackageGallery`, `PackageExplorer`, dan `PackageFilterPanel` tinggal di `features/packages/components` karena memanggil hook data live. Komponen presentasi murni (`PackageCard`, `ArticleCard`, `ItineraryTimeline`, `FlowShell`, `SectionHeading`) ada di `components/public`. Primitif form bersama: `Field`/`FieldGroup`, `ChipToggle`, `ChoiceCard`, `QuantityStepper` (`components/shared`), dan `Calendar` (`components/ui`).
