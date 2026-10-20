import { BALI_PENIDA_PACKAGES } from "./bali-penida"
import { JAVA_BELITUNG_PACKAGES } from "./java-belitung"
import { LABUAN_BAJO_PACKAGES } from "./labuan-bajo"
import { LOMBOK_RAJA_AMPAT_PACKAGES } from "./lombok-raja-ampat"
import type { PackageFixture } from "./shared"

export type { CostLine, PackageFixture } from "./shared"

/** The 18 catalog packages. Custom (unlisted) packages are created by the seed builder from quotations. */
export const CATALOG_PACKAGES: PackageFixture[] = [
  ...LABUAN_BAJO_PACKAGES,
  ...BALI_PENIDA_PACKAGES,
  ...LOMBOK_RAJA_AMPAT_PACKAGES,
  ...JAVA_BELITUNG_PACKAGES,
]
