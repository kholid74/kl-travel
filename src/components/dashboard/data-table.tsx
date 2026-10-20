"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** Enables sorting on this column. */
  sortValue?: (row: T) => string | number
  align?: "left" | "right"
  className?: string
  /** Hidden below the xl breakpoint (secondary detail). */
  wide?: boolean
}

type Sort = { key: string; dir: "asc" | "desc" }

const INTERACTIVE = "a,button,input,select,textarea,[role=menuitem],[role=checkbox]"

/**
 * Sortable, paginated table. Rows open their detail page; the primary column is also a
 * real link for keyboard and screen reader users. Below md it becomes a card list.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  getRowHref,
  renderCard,
  empty,
  caption,
  pageSize = 20,
  defaultSort,
}: {
  rows: T[]
  columns: Column<T>[]
  getRowKey: (row: T) => string
  getRowHref?: (row: T) => string
  /** Mobile card for one row. */
  renderCard: (row: T) => ReactNode
  empty: ReactNode
  caption: string
  pageSize?: number
  defaultSort?: Sort
}) {
  const router = useRouter()
  const [sort, setSort] = useState<Sort | undefined>(defaultSort)
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.key === sort.key)
    if (!sort || !column?.sortValue) return rows
    const value = column.sortValue
    const factor = sort.dir === "asc" ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = value(a)
      const y = value(b)
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "id")) * factor
    })
  }, [rows, columns, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pages - 1)
  const visible = sorted.slice(current * pageSize, (current + 1) * pageSize)

  const toggleSort = (key: string) => {
    setPage(0)
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }))
  }

  if (rows.length === 0) return <div className="rounded-lg border border-line bg-card shadow-xs">{empty}</div>

  return (
    <div>
      <div className="hidden overflow-hidden rounded-lg border border-line bg-card shadow-xs md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-table">
            <caption className="sr-only">{caption}</caption>
            <thead className="bg-canvas/70">
              <tr className="border-b border-line">
                {columns.map((column) => {
                  const active = sort?.key === column.key
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                      className={cn(
                        "h-10 px-4 text-xs font-semibold whitespace-nowrap text-text-muted",
                        column.align === "right" ? "text-right" : "text-left",
                        column.wide && "hidden xl:table-cell",
                        column.className,
                      )}
                    >
                      {column.sortValue ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className={cn("inline-flex items-center gap-1 rounded-sm outline-none hover:text-text-strong focus-visible:ring-2 focus-visible:ring-ring", column.align === "right" && "flex-row-reverse")}
                        >
                          {column.header}
                          {active ? (
                            sort!.dir === "asc" ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-50" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const href = getRowHref?.(row)
                return (
                  <tr
                    key={getRowKey(row)}
                    onClick={(event) => {
                      if (!href || (event.target as HTMLElement).closest(INTERACTIVE)) return
                      router.push(href)
                    }}
                    className={cn("border-b border-line last:border-0", href && "cursor-pointer hover:bg-canvas")}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          "h-11 px-4 py-2 align-middle",
                          column.align === "right" && "text-right tabular-nums",
                          column.wide && "hidden xl:table-cell",
                          column.className,
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="grid gap-3 md:hidden" aria-label={caption}>
        {visible.map((row) => {
          const href = getRowHref?.(row)
          return (
            <li key={getRowKey(row)} className="relative rounded-lg border border-line bg-card p-4 shadow-xs">
              {renderCard(row)}
              {href && (
                <Link href={href} className="absolute inset-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring" aria-label="Buka detail">
                  <span className="sr-only">Buka detail</span>
                </Link>
              )}
            </li>
          )
        })}
      </ul>

      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <p className="tabular-nums">
            {current * pageSize + 1}–{Math.min(sorted.length, (current + 1) * pageSize)} dari {sorted.length}
          </p>
          <div className="flex gap-1">
            <Button variant="secondary" size="icon-sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Halaman sebelumnya">
              <ChevronLeft />
            </Button>
            <Button variant="secondary" size="icon-sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Halaman berikutnya">
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
