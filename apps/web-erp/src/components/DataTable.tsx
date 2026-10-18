import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, AlertCircle, Inbox } from 'lucide-react';
import { Button } from './Button.js';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  pageSize?: number;
  initialSortKey?: string;
  initialSortDir?: 'asc' | 'desc';
  stickyHeader?: boolean;
  zebra?: boolean;
  compact?: boolean;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No records found',
  emptyAction,
  pageSize = 10,
  initialSortKey,
  initialSortDir = 'asc',
  stickyHeader = true,
  zebra = true,
  compact = true,
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(initialSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [data, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleHeaderClick = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  const alignStyles: Record<'left' | 'center' | 'right', string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={`flex flex-col w-full border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-sm ${className}`}>
      {/* Table Container with Overflow Scroll */}
      <div className="overflow-x-auto w-full max-h-[600px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-slate-200">
          {/* Table Header */}
          <thead
            className={`${
              stickyHeader ? 'sticky top-0 z-10' : ''
            } bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold`}
          >
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    onClick={() => handleHeaderClick(col)}
                    className={`px-4 py-3 select-none ${alignStyles[col.align || 'left']} ${
                      col.sortable ? 'cursor-pointer hover:text-slate-100 hover:bg-slate-800/40 transition-colors' : ''
                    }`}
                  >
                    <div className={`inline-flex items-center space-x-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="shrink-0 text-slate-500">
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-teal-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-teal-400" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800 text-sm">
            {loading ? (
              // Skeleton rows
              Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={`skel-cell-${cIdx}`} className="px-4 py-3.5">
                      <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-rose-400">
                    <AlertCircle className="w-8 h-8" />
                    <p className="font-medium text-sm">{error}</p>
                    {onRetry && (
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        Retry Fetch
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Inbox className="w-8 h-8 text-slate-600" />
                    <p className="text-sm font-medium">{emptyMessage}</p>
                    {emptyAction && <div className="pt-1">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => {
                const rowKey = keyExtractor(row, rIdx);
                const isEven = rIdx % 2 === 0;
                return (
                  <tr
                    key={rowKey}
                    className={`transition-colors hover:bg-slate-800/60 ${
                      zebra && !isEven ? 'bg-slate-900/60' : 'bg-transparent'
                    } ${compact ? 'h-10' : 'h-12'}`}
                  >
                    {columns.map((col) => {
                      const value = row[col.key];
                      const rendered = col.render ? col.render(row, rIdx) : value != null ? String(value) : '—';
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 whitespace-nowrap ${alignStyles[col.align || 'left']}`}
                        >
                          {rendered}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && !error && sortedData.length > 0 && (
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="tnum">
            Showing <span className="font-semibold text-slate-200">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-200">
              {Math.min(currentPage * pageSize, sortedData.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-200">{sortedData.length}</span> entries
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </Button>

            <span className="px-2 font-medium text-slate-300 tnum">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next Page"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
