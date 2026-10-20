import type { Metadata } from "next"
import { NewPackageEditor } from "@/features/packages/components/admin/package-editor"

export const metadata: Metadata = { title: "Paket baru" }

export default function NewPackagePage() {
  return <NewPackageEditor />
}
