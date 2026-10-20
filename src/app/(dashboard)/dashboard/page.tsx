import { DataHealth } from "@/features/demo/components/data-health"

/** Phase 1: verifies the data layer end to end. Replaced by the real overview in Phase 3. */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title font-semibold text-text-strong">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ringkasan data demo yang hidup di browser ini.</p>
      </div>
      <DataHealth />
    </div>
  )
}
