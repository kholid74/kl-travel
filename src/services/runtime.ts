import { DomainError, fail, ok, type Result } from "@/lib/result"
import { getDataSource, type UnitOfWork } from "@/repositories"

/** Demo-only knobs shown in Pengaturan → Data Demo (architecture.md §5.7). */
export const demoRuntime = {
  latency: "normal" as "normal" | "slow",
  failNextCommand: false,
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function latencyMs() {
  const [min, max] = demoRuntime.latency === "slow" ? [2000, 3000] : [300, 700]
  return min + Math.random() * (max - min)
}

/**
 * Runs a write use case: simulated network latency, optional simulated failure,
 * then one atomic transaction. Domain errors become `{ ok: false }` results.
 */
export async function runCommand<T>(work: (uow: UnitOfWork) => T): Promise<Result<T>> {
  await wait(latencyMs())
  if (demoRuntime.failNextCommand) {
    demoRuntime.failNextCommand = false
    return fail("SIMULATED_FAILURE", "Simulasi gangguan jaringan: perubahan tidak tersimpan. Silakan coba lagi.")
  }
  try {
    return ok(getDataSource().transaction(work))
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, error }
    console.error(error)
    return fail("STORAGE_UNAVAILABLE", "Terjadi kesalahan saat menyimpan data demo. Silakan coba lagi.")
  }
}
