import {
  Calculator,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  Inbox,
  LayoutDashboard,
  MapPin,
  Newspaper,
  Package,
  PanelsTopLeft,
  Quote,
  Receipt,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export interface DashboardNavItem {
  label: string
  href: string
  icon: LucideIcon
}

export interface DashboardNavGroup {
  label: string
  items: DashboardNavItem[]
}

/** Information architecture from requirement §5. */
export const DASHBOARD_NAV: DashboardNavGroup[] = [
  { label: "Ringkasan", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Penjualan",
    items: [
      { label: "Inquiry & Leads", href: "/dashboard/inquiries", icon: Inbox },
      { label: "Booking", href: "/dashboard/bookings", icon: Ticket },
      { label: "Pelanggan", href: "/dashboard/customers", icon: Users },
    ],
  },
  {
    label: "Manajemen Trip",
    items: [
      { label: "Paket Wisata", href: "/dashboard/packages", icon: Package },
      { label: "Destinasi", href: "/dashboard/destinations", icon: MapPin },
      { label: "Keberangkatan", href: "/dashboard/departures", icon: CalendarDays },
      { label: "Operasional Trip", href: "/dashboard/operations", icon: ClipboardCheck },
    ],
  },
  {
    label: "Keuangan",
    items: [
      { label: "Pembayaran", href: "/dashboard/payments", icon: Wallet },
      { label: "Invoice", href: "/dashboard/invoices", icon: Receipt },
      { label: "HPP & Costing", href: "/dashboard/costing", icon: Calculator },
    ],
  },
  {
    label: "Konten",
    items: [
      { label: "Konten Website", href: "/dashboard/content", icon: PanelsTopLeft },
      { label: "Artikel", href: "/dashboard/articles", icon: Newspaper },
      { label: "Testimoni", href: "/dashboard/testimonials", icon: Quote },
    ],
  },
  { label: "Analitik", items: [{ label: "Laporan", href: "/dashboard/reports", icon: ChartColumn }] },
  {
    label: "Sistem",
    items: [
      { label: "Tim & Peran", href: "/dashboard/team", icon: ShieldCheck },
      { label: "Pengaturan", href: "/dashboard/settings", icon: Settings },
    ],
  },
]

export function findNavItem(pathname: string): { group: DashboardNavGroup; item: DashboardNavItem } | undefined {
  let best: { group: DashboardNavGroup; item: DashboardNavItem } | undefined
  for (const group of DASHBOARD_NAV) {
    for (const item of group.items) {
      const matches = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
      if (matches && (!best || item.href.length > best.item.href.length)) best = { group, item }
    }
  }
  return best
}
