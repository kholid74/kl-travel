import { Clock, MapPin } from "lucide-react"
import type { TourPackage } from "@/domain/entities"
import { FITNESS_LABEL } from "@/domain/labels"

/** "30 hari atau lebih", "15–29 hari", "Kurang dari 7 hari" for each cancellation tier. */
export function cancellationRows(policy: TourPackage["cancellationPolicy"]) {
  const tiers = [...policy].sort((a, b) => b.minDaysBefore - a.minDaysBefore)
  return tiers.map((tier, index) => {
    const upper = index > 0 ? tiers[index - 1].minDaysBefore - 1 : null
    const label =
      upper === null
        ? `${tier.minDaysBefore} hari atau lebih`
        : tier.minDaysBefore === 0
          ? `Kurang dari ${upper + 1} hari`
          : `${tier.minDaysBefore}–${upper} hari`
    return { label, feePercent: tier.feePercent }
  })
}

export function paymentTermsText(terms: TourPackage["paymentTerms"]): string {
  return terms.depositPercent >= 100
    ? "Dibayar penuh setelah booking diverifikasi."
    : `DP ${terms.depositPercent}% untuk mengonfirmasi kursi, pelunasan paling lambat ${terms.balanceDueDaysBefore} hari sebelum keberangkatan. Booking yang dibuat kurang dari ${terms.balanceDueDaysBefore} hari sebelum berangkat dibayar penuh.`
}

/** Meeting point, participant requirements, payment, terms, and cancellation policy. */
export function PackagePolicies({ pkg }: { pkg: TourPackage }) {
  const { meetingPoint, requirements } = pkg
  return (
    <div className="grid gap-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-base font-semibold text-ocean-900">Titik kumpul</h3>
          <p className="mt-3 flex gap-2.5 text-sm font-medium text-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0 text-lagoon-700" aria-hidden="true" />
            <span>
              {meetingPoint.name}
              <span className="block font-normal text-muted-foreground">{meetingPoint.address}</span>
            </span>
          </p>
          {meetingPoint.time && (
            <p className="mt-2 flex gap-2.5 text-sm text-foreground">
              <Clock className="mt-0.5 size-4 shrink-0 text-lagoon-700" aria-hidden="true" />
              Kumpul pukul {meetingPoint.time}
            </p>
          )}
          {meetingPoint.notes && <p className="mt-3 text-sm text-muted-foreground">{meetingPoint.notes}</p>}
        </div>
        <div>
          <h3 className="text-base font-semibold text-ocean-900">Syarat peserta</h3>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Tingkat aktivitas</dt>
            <dd className="font-medium">{FITNESS_LABEL[requirements.fitness]}</dd>
            {requirements.minAge !== undefined && (
              <>
                <dt className="text-muted-foreground">Usia minimal</dt>
                <dd className="font-medium">{requirements.minAge} tahun</dd>
              </>
            )}
          </dl>
          {requirements.notes.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground marker:text-sand-500">
              {requirements.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-base font-semibold text-ocean-900">Kebijakan pembatalan</h3>
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Biaya pembatalan berdasarkan jarak ke tanggal keberangkatan</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 font-medium">
                  Dibatalkan
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Biaya
                </th>
              </tr>
            </thead>
            <tbody>
              {cancellationRows(pkg.cancellationPolicy).map((row) => (
                <tr key={row.label} className="border-b border-border">
                  <th scope="row" className="py-2 text-left font-normal">
                    {row.label} sebelum berangkat
                  </th>
                  <td className="py-2 text-right font-medium tabular-nums">{row.feePercent}% dari total</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Tanpa biaya bila booking belum terkonfirmasi atau bila keberangkatan dibatalkan oleh kami.
          </p>
        </div>
        <div>
          <h3 className="text-base font-semibold text-ocean-900">Pembayaran</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{paymentTermsText(pkg.paymentTerms)}</p>
          <h3 className="mt-8 text-base font-semibold text-ocean-900">Syarat & ketentuan</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-sand-500">
            {pkg.terms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
