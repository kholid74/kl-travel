import type { Metadata } from "next"
import { NewDestinationEditor } from "@/features/destinations/components/admin/destination-admin"

export const metadata: Metadata = { title: "Destinasi baru" }

export default function NewDestinationPage() {
  return <NewDestinationEditor />
}
