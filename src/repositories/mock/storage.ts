export interface StorageAdapter {
  readonly persistent: boolean
  read(key: string): string | null
  write(key: string, value: string): void
  remove(key: string): void
}

export function createMemoryStorage(initial: Record<string, string> = {}): StorageAdapter {
  const data = new Map(Object.entries(initial))
  return {
    persistent: false,
    read: (key) => data.get(key) ?? null,
    write: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  }
}

/**
 * localStorage with a memory fallback for private mode, blocked storage, or a full quota.
 * Every access is guarded; a failed write switches the adapter to memory-only.
 */
export function createBrowserStorage(): StorageAdapter {
  const memory = createMemoryStorage()
  let local: Storage | null = null
  try {
    local = window.localStorage
    const probe = "nusavista-demo:probe"
    local.setItem(probe, "1")
    local.removeItem(probe)
  } catch {
    local = null
  }

  const adapter: StorageAdapter = {
    get persistent() {
      return local !== null
    },
    read(key) {
      if (!local) return memory.read(key)
      try {
        return local.getItem(key)
      } catch {
        return memory.read(key)
      }
    },
    write(key, value) {
      memory.write(key, value)
      if (!local) return
      try {
        local.setItem(key, value)
      } catch {
        local = null
      }
    },
    remove(key) {
      memory.remove(key)
      try {
        local?.removeItem(key)
      } catch {
        // ignore
      }
    },
  }
  return adapter
}
