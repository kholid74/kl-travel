import { CalendarCheck, Compass, HeartHandshake, Leaf, Receipt, ShieldCheck, Users, type LucideIcon } from "lucide-react"

/** Icons an editor can pick for "Kenapa bersama kami" in Site Content. */
export const WHY_US_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  users: { icon: Users, label: "Grup" },
  "calendar-check": { icon: CalendarCheck, label: "Jadwal" },
  receipt: { icon: Receipt, label: "Harga" },
  compass: { icon: Compass, label: "Arah" },
  shield: { icon: ShieldCheck, label: "Aman" },
  leaf: { icon: Leaf, label: "Alam" },
  handshake: { icon: HeartHandshake, label: "Mitra" },
}
