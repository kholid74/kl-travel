/**
 * Downloadable itinerary as an A4 PDF, built in the browser so dashboard-made packages work
 * too. Loaded with a dynamic import from the download button: @react-pdf/renderer never
 * reaches the page's initial JavaScript.
 */
import { Document, Font, Image, Link, Page, pdf, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { DateOnly } from "@/lib/dates"
import { formatDate, formatDateRange, formatDuration, formatIDR } from "@/lib/format"
import type { TourPackage } from "@/domain/entities"
import { FITNESS_LABEL, TRIP_TYPE_LABEL } from "@/domain/labels"
import { startingPrice } from "@/domain/rules/pricing"
import { mealsText } from "@/components/public/itinerary-timeline"
import { cancellationRows, paymentTermsText } from "./components/package-policies"

export interface ItineraryPdfInput {
  pkg: TourPackage
  destinationName: string
  regionLabel: string
  /** Downscaled JPEG data URL of the cover photo, or undefined to leave it out. */
  cover?: { dataUrl: string; credit: string }
  /** Upcoming open-trip departures as shown on the page (bookable ones first). */
  departures: { id: string; startDate: DateOnly; endDate: DateOnly; pricePerPax: number; available: number; bookable: boolean }[]
  selectedDepartureId?: string
  url: string
  today: DateOnly
}

const C = {
  ocean: "#0b2540",
  lagoon: "#246b67",
  sand: "#9c7b45",
  ink: "#16222e",
  muted: "#5e6b78",
  subtle: "#7d8a97",
  line: "#e4e7ec",
  ivory: "#f4eee3",
}

let fontsRegistered = false
function registerFonts(origin: string) {
  if (fontsRegistered) return
  Font.register({
    family: "Jakarta",
    fonts: [
      { src: `${origin}/fonts/pdf/PlusJakartaSans-Regular.ttf` },
      { src: `${origin}/fonts/pdf/PlusJakartaSans-SemiBold.ttf`, fontWeight: 600 },
      { src: `${origin}/fonts/pdf/PlusJakartaSans-Bold.ttf`, fontWeight: 700 },
    ],
  })
  Font.register({
    family: "Instrument",
    fonts: [
      { src: `${origin}/fonts/pdf/InstrumentSerif-Regular.ttf` },
      { src: `${origin}/fonts/pdf/InstrumentSerif-Italic.ttf`, fontStyle: "italic" },
    ],
  })
  // Indonesian words must not be split with English hyphenation rules.
  Font.registerHyphenationCallback((word) => [word])
  fontsRegistered = true
}

const s = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 60,
    paddingHorizontal: 44,
    fontFamily: "Jakarta",
    fontSize: 9.5,
    color: C.ink,
    // The "fi"/"fl" ligature glyphs only map back to "f", so copied or searched text would read
    // "konfrmasi". Plain letters keep the PDF text accurate.
    fontFeatureSettings: { liga: false, clig: false },
  },
  // lineHeight lives here, not on the Page: on the Page it throws the page-number footer (a
  // render-prop Text) off the page. Unitless values resolve against this fontSize (14.25pt).
  body: { fontSize: 9.5, lineHeight: 1.5 },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 },
  wordmark: { fontFamily: "Instrument", fontSize: 20, color: C.ocean, lineHeight: 1 },
  wordmarkSub: { fontSize: 5.5, letterSpacing: 3.2, color: C.ocean, fontWeight: 600, marginTop: 2 },
  docLabel: { fontSize: 7, letterSpacing: 2, color: C.muted, fontWeight: 600, textAlign: "right" },
  docCode: { fontSize: 9, color: C.ocean, fontWeight: 600, textAlign: "right", marginTop: 2 },
  cover: { width: "100%", height: 190, objectFit: "cover", borderRadius: 2 },
  credit: { fontSize: 6.5, color: C.subtle, marginTop: 3 },
  eyebrow: { fontSize: 7.5, letterSpacing: 1.6, color: C.lagoon, fontWeight: 600, textTransform: "uppercase" },
  title: { fontFamily: "Instrument", fontSize: 28, color: C.ocean, lineHeight: 1.1, marginTop: 6 },
  summary: { fontSize: 10.5, color: C.muted, marginTop: 8, lineHeight: 1.55 },
  facts: { flexDirection: "row", flexWrap: "wrap", marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 10 },
  fact: { width: "20%", paddingRight: 8 },
  factLabel: { fontSize: 7, color: C.muted },
  factValue: { fontSize: 9, fontWeight: 600, marginTop: 2 },
  h2: { fontFamily: "Instrument", fontSize: 18, color: C.ocean, marginBottom: 8 },
  section: { marginTop: 20 },
  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, color: C.sand },
  bulletText: { flex: 1 },
  twoCol: { flexDirection: "row", gap: 20 },
  col: { flex: 1 },
  h3: { fontSize: 9.5, fontWeight: 700, color: C.ocean, marginBottom: 5 },
  day: { flexDirection: "row", paddingVertical: 9, borderTopWidth: 1, borderColor: C.line },
  dayNum: { width: 58 },
  dayLabel: { fontSize: 7, letterSpacing: 1.4, color: C.lagoon, fontWeight: 700 },
  dayBig: { fontFamily: "Instrument", fontSize: 22, color: C.sand, lineHeight: 1 },
  dayBody: { flex: 1 },
  dayTitle: { fontSize: 10.5, fontWeight: 700, color: C.ocean },
  dayMeta: { fontSize: 8, color: C.muted, marginTop: 4 },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 2 },
  tr: { flexDirection: "row", borderTopWidth: 1, borderColor: C.line, paddingVertical: 4, paddingHorizontal: 8 },
  trHead: { flexDirection: "row", backgroundColor: C.ivory, paddingVertical: 4, paddingHorizontal: 8 },
  th: { fontSize: 7.5, color: C.muted, fontWeight: 600 },
  selected: { backgroundColor: "#e8f3f1" },
  note: { fontSize: 7.5, color: C.muted, marginTop: 5 },
  footer: { position: "absolute", left: 44, right: 44, bottom: 24, borderTopWidth: 1, borderColor: C.line, paddingTop: 6, fontSize: 6.5, color: C.subtle },
})

function Bullets({ items, muted = false }: { items: string[]; muted?: boolean }) {
  return (
    <View>
      {items.map((item) => (
        <View key={item} style={s.bulletRow} wrap={false}>
          <Text style={s.bulletDot}>–</Text>
          <Text style={[s.bulletText, muted ? { color: C.muted } : {}]}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

function DayBlock({ day }: { day: TourPackage["itinerary"][number] }) {
  const meals = mealsText(day.meals)
  return (
    <View style={s.day} wrap={false}>
      <View style={s.dayNum}>
        <Text style={s.dayLabel}>HARI</Text>
        <Text style={s.dayBig}>{String(day.day).padStart(2, "0")}</Text>
      </View>
      <View style={s.dayBody}>
        <Text style={s.dayTitle}>{day.title}</Text>
        <Text style={{ marginTop: 3 }}>{day.description}</Text>
        {day.activities.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <Bullets items={day.activities} />
          </View>
        )}
        {(meals || day.accommodation) && (
          <Text style={s.dayMeta}>
            {meals ? `Makan: ${meals}` : ""}
            {meals && day.accommodation ? "   ·   " : ""}
            {day.accommodation ? `Menginap: ${day.accommodation}` : ""}
          </Text>
        )}
      </View>
    </View>
  )
}

export function ItineraryDocument({ pkg, destinationName, regionLabel, cover, departures, selectedDepartureId, url, today }: ItineraryPdfInput) {
  const open = pkg.tripType === "open"
  const from = startingPrice(pkg)
  const groupLabel = open
    ? `Maks. ${pkg.groupSize.max} orang`
    : pkg.groupSize.min === pkg.groupSize.max
      ? `${pkg.groupSize.min} orang`
      : `${pkg.groupSize.min}–${pkg.groupSize.max} orang`
  const facts = [
    { label: "Durasi", value: formatDuration(pkg.durationDays, pkg.durationNights, "long") },
    { label: "Jenis trip", value: TRIP_TYPE_LABEL[pkg.tripType] },
    { label: open ? "Ukuran grup" : "Peserta", value: groupLabel },
    { label: "Tingkat aktivitas", value: FITNESS_LABEL[pkg.requirements.fitness] },
    { label: "Harga mulai", value: from ? `${formatIDR(from)} /org` : "Sesuai penawaran" },
  ]
  const shownDepartures = departures.slice(0, 6)

  return (
    <Document title={`Itinerary ${pkg.title}`} author="NusaVista Journey (demo)" subject={`${pkg.title} · ${destinationName}`} creator="NusaVista Journey showcase" language="id">
      <Page size="A4" style={s.page}>
        <Text
          style={s.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Dokumen demonstrasi · NusaVista Journey adalah brand fiktif · diunduh ${formatDate(today, "long")}   ·   Halaman ${pageNumber} dari ${totalPages}`
          }
        />

        <View style={s.body}>
          <View style={s.brandRow} fixed>
            <View>
              <Text style={s.wordmark}>NusaVista</Text>
              <Text style={s.wordmarkSub}>JOURNEY</Text>
            </View>
            <View>
              <Text style={s.docLabel}>ITINERARY</Text>
              <Text style={s.docCode}>{pkg.code}</Text>
            </View>
          </View>

          {cover && (
            <View>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt; the PDF title carries the meaning */}
              <Image src={cover.dataUrl} style={s.cover} />
              <Text style={s.credit}>Foto: {cover.credit} / Unsplash</Text>
            </View>
          )}

          <View style={{ marginTop: cover ? 14 : 0 }}>
            <Text style={s.eyebrow}>
              {destinationName} · {regionLabel}
            </Text>
            <Text style={s.title}>{pkg.title}</Text>
            <Text style={s.summary}>{pkg.summary}</Text>
          </View>

          <View style={s.facts}>
            {facts.map((fact) => (
              <View key={fact.label} style={s.fact}>
                <Text style={s.factLabel}>{fact.label}</Text>
                <Text style={s.factValue}>{fact.value}</Text>
              </View>
            ))}
          </View>

          {pkg.highlights.length > 0 && (
            <View style={s.section}>
              <Text style={s.h3}>Sorotan perjalanan</Text>
              <Bullets items={pkg.highlights} />
            </View>
          )}

          {open && shownDepartures.length > 0 && (
            <View style={s.section} wrap={false}>
              <Text style={s.h3}>Jadwal keberangkatan</Text>
              <View style={s.table}>
                <View style={s.trHead}>
                  <Text style={[s.th, { flex: 2 }]}>Tanggal</Text>
                  <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Harga per orang</Text>
                  <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Kursi</Text>
                </View>
                {shownDepartures.map((d) => (
                  <View key={d.id} style={[s.tr, d.id === selectedDepartureId ? s.selected : {}]}>
                    <Text style={{ flex: 2, fontWeight: d.id === selectedDepartureId ? 700 : 400 }}>
                      {formatDateRange(d.startDate, d.endDate)}
                      {d.id === selectedDepartureId ? "  · pilihan Anda" : ""}
                    </Text>
                    <Text style={{ flex: 1, textAlign: "right" }}>{formatIDR(d.pricePerPax)}</Text>
                    <Text style={{ flex: 1, textAlign: "right", color: d.bookable ? C.ink : C.muted }}>{d.bookable ? `Sisa ${d.available}` : "Tidak tersedia"}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.note}>Sisa kursi per {formatDate(today, "long")}. Ketersediaan dapat berubah; cek jadwal terbaru di website.</Text>
            </View>
          )}

          {!open && pkg.pricing.kind === "tiered" && (
            <View style={s.section} wrap={false}>
              <Text style={s.h3}>Harga per orang menurut ukuran grup</Text>
              <View style={s.table}>
                {pkg.pricing.tiers.map((tier, index) => (
                  <View key={tier.minPax} style={index === 0 ? [s.tr, { borderTopWidth: 0 }] : s.tr}>
                    <Text style={{ flex: 1 }}>{tier.minPax === tier.maxPax ? `${tier.minPax} orang` : `${tier.minPax}–${tier.maxPax} orang`}</Text>
                    <Text style={{ flex: 1, textAlign: "right", fontWeight: 600 }}>{formatIDR(tier.pricePerPax)}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.note}>Private trip berangkat di tanggal pilihan Anda. Harga final tercantum di penawaran resmi.</Text>
            </View>
          )}

          <View style={s.section}>
            {pkg.itinerary.length === 0 && <Text style={s.h2}>Rencana perjalanan</Text>}
            {pkg.itinerary.map((day, index) =>
              index === 0 ? (
                // The heading travels with day 1 so it never sits alone at the bottom of a page.
                <View key={day.id} wrap={false}>
                  <Text style={s.h2}>Rencana perjalanan</Text>
                  <DayBlock day={day} />
                </View>
              ) : (
                <DayBlock key={day.id} day={day} />
              ),
            )}
          </View>

          <View style={[s.section, s.twoCol]} wrap={false}>
            <View style={s.col}>
              <Text style={s.h3}>Sudah termasuk</Text>
              <Bullets items={pkg.inclusions} />
            </View>
            <View style={s.col}>
              <Text style={s.h3}>Belum termasuk</Text>
              <Bullets items={pkg.exclusions} muted />
            </View>
          </View>

          <View style={[s.section, s.twoCol]} wrap={false}>
            <View style={s.col}>
              <Text style={s.h3}>Titik kumpul</Text>
              <Text style={{ fontWeight: 600 }}>{pkg.meetingPoint.name}</Text>
              <Text style={{ color: C.muted }}>{pkg.meetingPoint.address}</Text>
              {pkg.meetingPoint.time && <Text style={{ marginTop: 2 }}>Kumpul pukul {pkg.meetingPoint.time}</Text>}
              {pkg.meetingPoint.notes && <Text style={s.note}>{pkg.meetingPoint.notes}</Text>}
            </View>
            <View style={s.col}>
              <Text style={s.h3}>Syarat peserta</Text>
              <Text>Tingkat aktivitas: {FITNESS_LABEL[pkg.requirements.fitness]}</Text>
              {pkg.requirements.minAge !== undefined && <Text>Usia minimal: {pkg.requirements.minAge} tahun</Text>}
              {pkg.requirements.notes.length > 0 && (
                <View style={{ marginTop: 3 }}>
                  <Bullets items={pkg.requirements.notes} muted />
                </View>
              )}
            </View>
          </View>

          <View style={[s.section, s.twoCol]} wrap={false}>
            <View style={s.col}>
              <Text style={s.h3}>Kebijakan pembatalan</Text>
              {cancellationRows(pkg.cancellationPolicy).map((row) => (
                <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ color: C.muted }}>Dibatalkan {row.label.toLowerCase()} sebelum berangkat</Text>
                  <Text style={{ fontWeight: 600 }}>{row.feePercent === 0 ? "Tanpa biaya" : `${row.feePercent}%`}</Text>
                </View>
              ))}
            </View>
            <View style={s.col}>
              <Text style={s.h3}>Pembayaran</Text>
              <Text style={{ color: C.muted }}>{paymentTermsText(pkg.paymentTerms)}</Text>
            </View>
          </View>

          {pkg.terms.length > 0 && (
            <View style={s.section}>
              <Text style={s.h3} minPresenceAhead={30}>
                Syarat dan ketentuan
              </Text>
              <Bullets items={pkg.terms} muted />
            </View>
          )}

          <View style={[s.section, { borderTopWidth: 1, borderColor: C.line, paddingTop: 10 }]} wrap={false}>
            <Text style={{ fontSize: 8.5 }}>
              Detail terbaru dan pemesanan:{" "}
              <Link src={url} style={{ color: C.lagoon }}>
                {url.replace(/^https?:\/\//, "")}
              </Link>
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

/** Builds the PDF in the browser and returns it as a Blob ready to download. */
export async function renderItineraryPdf(input: ItineraryPdfInput, origin: string): Promise<Blob> {
  registerFonts(origin)
  return pdf(<ItineraryDocument {...input} />).toBlob()
}
