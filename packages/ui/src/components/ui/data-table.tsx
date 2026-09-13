"use client";
import React, { useState, useMemo } from "react";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@sp/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyText?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Axtarış...",
  pageSize = 10,
  emptyText = "Məlumat tapılmadı",
  className,
  onRowClick,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  const filteredData = useMemo(() => {
    if (!query || !searchKey) return data;
    const lowerQuery = query.toLowerCase();
    return data.filter((row) => {
      const val = row[searchKey];
      return val != null && String(val).toLowerCase().includes(lowerQuery);
    });
  }, [data, query, searchKey]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA == null && valB == null) return 0;
      if (valA == null) return sortAsc ? 1 : -1;
      if (valB == null) return sortAsc ? -1 : 1;
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortAsc]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className={cn("data-table-container", className)}>
      {searchKey && (
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}

      <div className="table-wrap" tabIndex={0} role="region" aria-label="Məlumat cədvəli">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(col.sortable && "cursor-pointer select-none")}
                  aria-sort={col.sortable ? sortKey === col.key ? sortAsc ? "ascending" : "descending" : "none" : undefined}
                  scope="col"
                >
                  {col.sortable ? <button type="button" className="th-content" onClick={() => handleSort(col.key)}>{col.header}<ArrowUpDown size={14} /></button> : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className={cn(onRowClick && "cursor-pointer hover-row")}
                  onClick={() => onRowClick && onRowClick(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && onRowClick && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onRowClick(row); }
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : String(row[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="empty-cell">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="table-pagination">
          <span className="pagination-info">
            Səhifə {currentPage} / {totalPages} (Cəmi: {sortedData.length})
          </span>
          <div className="pagination-buttons">
            <button
              className="btn btn-sm outline"
              disabled={currentPage <= 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
            >
              <ChevronLeft size={16} /> Əvvəlki
            </button>
            <button
              className="btn btn-sm outline"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            >
              Növbəti <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
