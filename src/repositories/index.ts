import { validateDatabase } from "@/domain/rules/validate-database"
import type { DataSource } from "./interfaces"
import { LocalDatabase } from "./mock/local-database"
import { createBrowserStorage } from "./mock/storage"

let instance: DataSource | null = null

/**
 * Composition root. Services obtain the data source here and never import the mock
 * implementation directly, so an API-backed DataSource can replace it later.
 */
export function getDataSource(): DataSource {
  if (typeof window === "undefined") {
    throw new Error("The demo data source only exists in the browser. Use services/catalog-server on the server.")
  }
  instance ??= new LocalDatabase({
    storage: createBrowserStorage(),
    afterCommit:
      process.env.NODE_ENV === "development"
        ? (db) => {
            const issues = validateDatabase(db, new Date().toISOString())
            if (issues.length) console.warn("[demo-data] invariant violations", issues)
          }
        : undefined,
  })
  return instance
}

export type { DataSource, DataSourceState, UnitOfWork } from "./interfaces"
