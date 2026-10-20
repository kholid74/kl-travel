import { toDateOnlyWIB } from "@/lib/dates"
import { formatDate, formatDateRange, formatIDR, formatPhone } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Settings } from "@/domain/entities"
import { PAYMENT_METHOD_LABEL } from "@/domain/labels"
import type { InstallmentCoverage } from "@/domain/rules/payment-status"
import { Logo } from "@/components/shared/logo"
import type { InvoiceView } from "@/services/queries/invoices"

const COVERAGE_LABEL: Record<InstallmentCoverage["status"], string> = {
  paid: "Lunas",
  partial: "Sebagian",
  unpaid: "Belum dibayar",
  overdue: "Lewat jatuh tempo",
}

const STAMP: Partial<Record<InvoiceView["status"], { label: string; className: string }>> = {
  paid: { label: "Lunas", className: "border-tone-success text-tone-success" },
  void: { label: "Dibatalkan", className: "border-tone-danger text-tone-danger" },
  overdue: { label: "Lewat jatuh tempo", className: "border-tone-danger text-tone-danger" },
}

/**
 * The invoice as the customer would receive it. Shared by the dashboard detail and the
 * A4 print page, so both always show the same numbers.
 */
export function InvoiceDocument({ view, settings, pax }: { view: InvoiceView; settings: Settings; pax: number }) {
  const { invoice, booking, customer, pkg, departure, fin, coverage, payments } = view
  const subtotal = invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const verified = payments.filter((p) => p.status === "verified")
  const stamp = STAMP[view.status]
  const bank = settings.payment.bankAccountDisplay

  return (
    <article className="relative bg-white text-[0.8125rem] leading-relaxed text-ink-900 print:text-[11px]">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
        <div>
          <Logo className="text-ocean-900" />
          <p className="mt-3 text-xs text-text-muted">
            {settings.company.address}
            <br />
            {settings.company.email}
            <br />
            {settings.company.phoneDisplay}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold tracking-[0.2em] text-text-muted uppercase">Invoice</p>
          <p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{invoice.number}</p>
          <p className="text-xs text-text-muted">Diterbitkan {formatDate(toDateOnlyWIB(invoice.issuedAt), "long")}</p>
          {stamp && (
            <p className={cn("mt-3 inline-block -rotate-3 rounded border-2 px-3 py-1 text-xs font-bold tracking-widest uppercase", stamp.className)}>{stamp.label}</p>
          )}
        </div>
      </header>

      <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-2 print:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold text-text-muted">Ditagihkan kepada</h2>
          <p className="mt-1 font-semibold text-text-strong">{customer?.fullName}</p>
          {customer && (
            <p className="text-text-muted">
              {formatPhone(customer.phone)}
              {customer.email && (
                <>
                  <br />
                  {customer.email}
                </>
              )}
              {customer.city && (
                <>
                  <br />
                  {customer.city}
                </>
              )}
            </p>
          )}
        </div>
        <div>
          <h2 className="text-xs font-semibold text-text-muted">Perjalanan</h2>
          <p className="mt-1 font-semibold text-text-strong">{pkg?.title}</p>
          <p className="text-text-muted">
            {departure && formatDateRange(departure.startDate, departure.endDate)} · {pax} peserta
            <br />
            Booking {booking.code}
          </p>
        </div>
      </section>

      <table className="mt-6 w-full">
        <thead>
          <tr className="border-b border-line text-left text-xs text-text-muted">
            <th className="py-2 font-medium">Deskripsi</th>
            <th className="py-2 text-right font-medium">Jumlah</th>
            <th className="py-2 text-right font-medium">Harga satuan</th>
            <th className="py-2 text-right font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.id} className="border-b border-line">
              <td className="py-2 pr-4">{line.label}</td>
              <td className="py-2 text-right tabular-nums">{line.quantity}</td>
              <td className="py-2 text-right tabular-nums">{formatIDR(line.unitPrice)}</td>
              <td className="py-2 text-right tabular-nums">{formatIDR(line.quantity * line.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {invoice.discount > 0 && (
            <>
              <tr>
                <td colSpan={3} className="pt-3 text-right text-text-muted">
                  Subtotal
                </td>
                <td className="pt-3 text-right tabular-nums">{formatIDR(subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="text-right text-text-muted">
                  Diskon
                </td>
                <td className="text-right tabular-nums">−{formatIDR(invoice.discount)}</td>
              </tr>
            </>
          )}
          <tr>
            <td colSpan={3} className="pt-3 text-right font-semibold">
              Total
            </td>
            <td className="pt-3 text-right text-base font-semibold text-text-strong tabular-nums">{formatIDR(fin.total)}</td>
          </tr>
        </tfoot>
      </table>

      {!invoice.voidedAt && (
        <section className="mt-8 break-inside-avoid">
          <h2 className="text-xs font-semibold text-text-muted">Jadwal pembayaran</h2>
          <table className="mt-2 w-full">
            <thead>
              <tr className="border-b border-line text-left text-xs text-text-muted">
                <th className="py-2 font-medium">Termin</th>
                <th className="py-2 font-medium">Jatuh tempo</th>
                <th className="py-2 text-right font-medium">Nominal</th>
                <th className="py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((c) => (
                <tr key={c.installment.id} className="border-b border-line">
                  <td className="py-2">{c.installment.label}</td>
                  <td className="py-2">{formatDate(c.installment.dueDate)}</td>
                  <td className="py-2 text-right tabular-nums">{formatIDR(c.installment.amount)}</td>
                  <td className={cn("py-2 text-right", c.status === "paid" ? "text-tone-success" : c.status === "overdue" ? "font-semibold text-tone-danger" : "text-text-muted")}>
                    {COVERAGE_LABEL[c.status]}
                    {c.status === "partial" && ` · sisa ${formatIDR(c.remaining)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="mt-8 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
        <div className="break-inside-avoid">
          <h2 className="text-xs font-semibold text-text-muted">Pembayaran tercatat</h2>
          {verified.length === 0 ? (
            <p className="mt-2 text-text-muted">Belum ada pembayaran terverifikasi.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {verified.map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span>
                    {formatDate(toDateOnlyWIB(p.paidAt))} · {p.direction === "refund" ? "Refund" : PAYMENT_METHOD_LABEL[p.method]}
                  </span>
                  <span className="tabular-nums">
                    {p.direction === "refund" ? "−" : ""}
                    {formatIDR(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <dl className="grid grid-cols-2 content-start gap-y-1 self-start rounded-md bg-canvas px-4 py-3 print:border print:border-line">
          <dt className="text-text-muted">Total</dt>
          <dd className="text-right tabular-nums">{formatIDR(fin.total)}</dd>
          <dt className="text-text-muted">Diterima</dt>
          <dd className="text-right tabular-nums">{formatIDR(fin.paidNet)}</dd>
          <dt className="font-semibold">{invoice.voidedAt ? "Refund belum ditransfer" : "Sisa tagihan"}</dt>
          <dd className="text-right font-semibold tabular-nums">{formatIDR(invoice.voidedAt ? fin.refundRemaining : fin.outstanding)}</dd>
        </dl>
      </section>

      <footer className="mt-8 border-t border-line pt-4 text-xs text-text-muted">
        {!invoice.voidedAt && (
          <p>
            Pembayaran melalui transfer ke {bank.bank} {bank.number} a.n. {bank.holder}. Cantumkan kode booking {booking.code} pada berita transfer.
          </p>
        )}
        {invoice.voidedAt && <p>Invoice dibatalkan pada {formatDate(toDateOnlyWIB(invoice.voidedAt), "long")} karena booking dibatalkan.</p>}
        <p className="mt-2">{settings.invoice.footerNote} NusaVista Journey adalah merek fiktif.</p>
      </footer>
    </article>
  )
}
