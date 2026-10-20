"use client"

import { useState, useSyncExternalStore, type ReactNode } from "react"
import { Save } from "lucide-react"
import { toDateOnlyWIB } from "@/lib/dates"
import { formatDate, formatNumber } from "@/lib/format"
import { pad } from "@/lib/ids"
import { cn } from "@/lib/utils"
import type { Settings } from "@/domain/entities"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { useQueryParams } from "@/hooks/use-query-params"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { SectionCard } from "@/components/dashboard/section-card"
import { DemoNotice } from "@/components/shared/demo-notice"
import { Field } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { DataHealth } from "@/features/demo/components/data-health"
import { ResetDemoButton } from "@/features/demo/components/demo-panel"
import { demoStatus } from "@/services/demo-service"
import { getDemoRuntime, setDemoRuntime, subscribeDemoRuntime } from "@/services/runtime"
import { settingsCommands, type SettingsSection } from "@/services/settings-service"
import { useDbStore } from "@/stores/db-store"

const TABS = [
  { value: "perusahaan", label: "Perusahaan" },
  { value: "booking", label: "Booking & Pembayaran" },
  { value: "invoice", label: "Invoice" },
  { value: "demo", label: "Data Demo" },
] as const

function useSettingsSection<S extends SettingsSection>(section: S, saved: Settings[S]) {
  const { user } = usePersona()
  const savedKey = JSON.stringify(saved)
  const [state, setState] = useState({ savedKey, value: saved })
  if (state.savedKey !== savedKey) setState({ savedKey, value: saved })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const command = useCommand(settingsCommands.update, { success: "Pengaturan disimpan", onSuccess: () => setErrors({}) })
  return {
    value: state.value,
    set: (patch: Partial<Settings[S]>) => setState((s) => ({ ...s, value: { ...s.value, ...patch } })),
    dirty: JSON.stringify(state.value) !== savedKey,
    errors,
    reset: () => {
      setErrors({})
      setState({ savedKey, value: saved })
    },
    save: async () => {
      const result = await command.run(user?.id ?? "", section, state.value as Settings[SettingsSection])
      if (!result.ok && result.error.field) setErrors({ [result.error.field]: result.error.message })
    },
    pending: command.pending,
  }
}

function SaveRow({ dirty, pending, onSave, onReset }: { dirty: boolean; pending: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
      {dirty && <span className="mr-auto text-xs text-tone-warning">Ada perubahan yang belum disimpan.</span>}
      <Button variant="ghost" disabled={!dirty || pending} onClick={onReset}>
        Batalkan perubahan
      </Button>
      <PermissionButton permission="settings.manage" disabled={!dirty || pending} onClick={onSave}>
        <Save aria-hidden="true" /> Simpan
      </PermissionButton>
    </div>
  )
}

function NumberField({ label, description, value, onChange, error, suffix }: { label: string; description: ReactNode; value: number; onChange: (n: number) => void; error?: string; suffix: string }) {
  return (
    <Field label={label} description={description} error={error}>
      {(c) => (
        <div className="relative max-w-40">
          <Input {...c} type="number" inputMode="numeric" value={Number.isNaN(value) ? "" : value} onChange={(e) => onChange(e.target.valueAsNumber)} className="pr-14 tabular-nums" />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
        </div>
      )}
    </Field>
  )
}

export function SettingsPage() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(["tab"] as const)
  const tab = TABS.find((t) => t.value === query.tab) ?? TABS[0]
  if (!live) return <PageSkeleton />
  const { db } = live

  return (
    <div>
      <PageHeader title="Pengaturan" description="Profil perusahaan fiktif, aturan booking dan pembayaran, format invoice, dan data demo di browser ini." />
      <div role="tablist" aria-label="Bagian pengaturan" className="mb-6 flex gap-1 overflow-x-auto border-b border-line no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab.value === t.value}
            onClick={() => setQuery({ tab: t.value === "perusahaan" ? null : t.value })}
            className={cn(
              "-mb-px h-10 shrink-0 border-b-2 px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab.value === t.value ? "border-ocean-800 text-text-strong" : "border-transparent text-text-muted hover:text-text-strong",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab.value === "perusahaan" && <CompanySettings saved={db.settings.company} />}
      {tab.value === "booking" && (
        <div className="grid gap-6">
          <BookingSettings saved={db.settings.booking} />
          <PaymentSettings saved={db.settings.payment} />
        </div>
      )}
      {tab.value === "invoice" && <InvoiceSettings saved={db.settings.invoice} counter={db.meta.counters.invoice ?? 0} today={live.today} />}
      {tab.value === "demo" && <DemoDataSettings />}
    </div>
  )
}

function CompanySettings({ saved }: { saved: Settings["company"] }) {
  const s = useSettingsSection("company", saved)
  const v = s.value
  return (
    <SectionCard title="Profil perusahaan" description="Tampil di kop invoice dan manifest. Gunakan data fiktif.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nama" error={s.errors.name}>
          {(c) => <Input {...c} value={v.name} onChange={(e) => s.set({ name: e.target.value })} />}
        </Field>
        <Field label="Tagline" optional>
          {(c) => <Input {...c} value={v.tagline} onChange={(e) => s.set({ tagline: e.target.value })} />}
        </Field>
        <Field label="Alamat" className="md:col-span-2" error={s.errors.address}>
          {(c) => <Textarea {...c} rows={2} value={v.address} onChange={(e) => s.set({ address: e.target.value })} />}
        </Field>
        <Field label="Email" error={s.errors.email}>
          {(c) => <Input {...c} type="email" value={v.email} onChange={(e) => s.set({ email: e.target.value })} />}
        </Field>
        <Field label="Telepon" error={s.errors.phoneDisplay}>
          {(c) => <Input {...c} value={v.phoneDisplay} onChange={(e) => s.set({ phoneDisplay: e.target.value })} />}
        </Field>
      </div>
      <SaveRow dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  )
}

function BookingSettings({ saved }: { saved: Settings["booking"] }) {
  const s = useSettingsSection("booking", saved)
  const v = s.value
  return (
    <SectionCard title="Aturan booking" description="Berlaku langsung: sisa kursi di website, batas waktu hold, dan validasi booking baru memakai nilai ini.">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField label="Hold menunggu verifikasi" suffix="jam" description="Kursi ditahan setelah pelanggan memesan." value={v.pendingHoldHours} onChange={(n) => s.set({ pendingHoldHours: n })} error={s.errors.pendingHoldHours} />
        <NumberField label="Batas pembayaran DP" suffix="jam" description="Setelah invoice terbit." value={v.depositHoldHours} onChange={(n) => s.set({ depositHoldHours: n })} error={s.errors.depositHoldHours} />
        <NumberField label="Tutup penjualan" suffix="hari" description="Sebelum tanggal berangkat." value={v.salesCutoffDays} onChange={(n) => s.set({ salesCutoffDays: n })} error={s.errors.salesCutoffDays} />
        <NumberField label="Ambang “sisa sedikit”" suffix="kursi" description="Label Sisa n kursi di website." value={v.lowSeatThreshold} onChange={(n) => s.set({ lowSeatThreshold: n })} error={s.errors.lowSeatThreshold} />
        <NumberField label="Maksimal peserta per booking" suffix="orang" description="Rombongan lebih besar diarahkan ke private trip." value={v.maxPaxPerBooking} onChange={(n) => s.set({ maxPaxPerBooking: n })} error={s.errors.maxPaxPerBooking} />
      </div>
      <SaveRow dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  )
}

function PaymentSettings({ saved }: { saved: Settings["payment"] }) {
  const s = useSettingsSection("payment", saved)
  const v = s.value
  const bank = (patch: Partial<Settings["payment"]["bankAccountDisplay"]>) => s.set({ bankAccountDisplay: { ...v.bankAccountDisplay, ...patch } })
  return (
    <SectionCard title="Pembayaran" description="DP dan pelunasan default dipakai paket baru dan penawaran custom; paket yang sudah ada tetap memakai aturannya sendiri.">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField label="DP default" suffix="%" description="100% berarti bayar penuh di awal." value={v.defaultDepositPercent} onChange={(n) => s.set({ defaultDepositPercent: n })} error={s.errors.defaultDepositPercent} />
        <NumberField label="Pelunasan" suffix="hari" description="Sebelum tanggal berangkat." value={v.defaultBalanceDueDaysBefore} onChange={(n) => s.set({ defaultBalanceDueDaysBefore: n })} error={s.errors.defaultBalanceDueDaysBefore} />
      </div>
      <h3 className="mt-6 text-sm font-semibold text-text-strong">Rekening yang ditampilkan</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <Field label="Bank" error={s.errors.bank}>
          {(c) => <Input {...c} value={v.bankAccountDisplay.bank} onChange={(e) => bank({ bank: e.target.value })} />}
        </Field>
        <Field label="Nomor rekening" error={s.errors.number}>
          {(c) => <Input {...c} value={v.bankAccountDisplay.number} onChange={(e) => bank({ number: e.target.value })} />}
        </Field>
        <Field label="Atas nama" error={s.errors.holder}>
          {(c) => <Input {...c} value={v.bankAccountDisplay.holder} onChange={(e) => bank({ holder: e.target.value })} />}
        </Field>
      </div>
      <DemoNotice className="mt-4">Rekening ini fiktif dan selalu ditandai simulasi di website. Jangan isi rekening sungguhan.</DemoNotice>
      <SaveRow dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  )
}

function InvoiceSettings({ saved, counter, today }: { saved: Settings["invoice"]; counter: number; today: string }) {
  const s = useSettingsSection("invoice", saved)
  const v = s.value
  const [yyyy, mm] = today.split("-")
  return (
    <SectionCard title="Format invoice" description="Berlaku untuk invoice yang terbit berikutnya; nomor invoice lama tidak berubah.">
      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <Field label="Prefiks nomor" error={s.errors.prefix} description={`Invoice berikutnya: ${(v.prefix || "…").toUpperCase()}/${yyyy}/${mm}/${pad(counter + 1)}`}>
          {(c) => <Input {...c} value={v.prefix} onChange={(e) => s.set({ prefix: e.target.value })} className="uppercase" />}
        </Field>
        <Field label="Catatan kaki" optional description="Tampil di bagian bawah invoice cetak.">
          {(c) => <Textarea {...c} rows={2} value={v.footerNote} onChange={(e) => s.set({ footerNote: e.target.value })} />}
        </Field>
      </div>
      <SaveRow dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  )
}

function DemoDataSettings() {
  const db = useDbStore((state) => state.db)
  const persistent = useDbStore((state) => state.persistent)
  const runtime = useSyncExternalStore(subscribeDemoRuntime, getDemoRuntime, getDemoRuntime)
  if (!db) return null
  // Rendered only after the data loads, so the clock is safe to read.
  const status = demoStatus(db, new Date().toISOString())
  const size = new Blob([JSON.stringify(db)]).size

  return (
    <div className="grid gap-6">
      <SectionCard title="Data demo di browser ini">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Dibuat</dt>
            <dd className="mt-0.5 font-medium text-text-strong">
              {formatDate(status.seedAnchor, "long")} · {status.ageDays === 0 ? "hari ini" : `${status.ageDays} hari lalu`}
            </dd>
            {status.stale && <dd className="text-xs text-tone-warning">Sudah lama; jadwal mulai tidak relevan.</dd>}
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Penyimpanan</dt>
            <dd className="mt-0.5 font-medium text-text-strong">{persistent ? "localStorage browser ini" : "Memori saja (hilang saat dimuat ulang)"}</dd>
            <dd className="text-xs text-muted-foreground">Sekitar {formatNumber(Math.round(size / 1024))} KB · tersinkron antar-tab, tidak antar-perangkat</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Versi data</dt>
            <dd className="mt-0.5 font-medium text-text-strong">
              Skema {db.meta.schemaVersion} · seed {db.meta.seedVersion}
            </dd>
            {status.outdated && <dd className="text-xs text-tone-warning">Versi seed baru tersedia.</dd>}
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <ResetDemoButton variant="secondary" />
          <p className="text-xs text-muted-foreground">Membangun ulang semua data dengan tanggal relatif terhadap hari ini ({formatDate(toDateOnlyWIB(new Date().toISOString()))}).</p>
        </div>
      </SectionCard>

      <SectionCard title="Simulasi jaringan" description="Untuk mendemokan state loading dan kegagalan simpan. Berlaku di tab ini sampai halaman dimuat ulang.">
        <div className="grid gap-4">
          <label className="flex items-start gap-3 text-sm">
            <Switch checked={runtime.latency === "slow"} onCheckedChange={(on) => setDemoRuntime({ latency: on ? "slow" : "normal" })} className="mt-0.5" />
            <span>
              <span className="font-medium text-text-strong">Jaringan lambat</span>
              <span className="block text-muted-foreground">Setiap penyimpanan butuh 2–3 detik, bukan 0,3–0,7 detik.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <Switch checked={runtime.failNextCommand} onCheckedChange={(on) => setDemoRuntime({ failNextCommand: on })} className="mt-0.5" />
            <span>
              <span className="font-medium text-text-strong">Gagalkan penyimpanan berikutnya</span>
              <span className="block text-muted-foreground">Satu aksi berikutnya gagal dengan pesan gangguan jaringan, lalu kembali normal.</span>
            </span>
          </label>
        </div>
      </SectionCard>

      <section aria-label="Ringkasan data">
        <h2 className="mb-3 text-[0.9375rem] font-semibold text-text-strong">Ringkasan data</h2>
        <DataHealth />
      </section>
    </div>
  )
}
