import { notFound } from "next/navigation"

/** Unknown dashboard paths render the dashboard 404 inside the app shell. */
export default function MissingDashboardPage() {
  notFound()
}
