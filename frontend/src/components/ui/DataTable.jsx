import { useState, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender } from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DataTable({ columns, data, searchable = true, pageSize = 9999 }) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data, columns, state: { sorting, globalFilter },
    onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div className="space-y-5">
      {searchable && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Search records..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200/80 text-sm focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 bg-white transition-all placeholder:text-gray-400" />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200/80 shadow-card bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-brand-600 to-brand-500">
              {table.getHeaderGroups().map(hg =>
                hg.headers.map(h => (
                  <th key={h.id} onClick={h.column.getToggleSortingHandler()}
                    className="px-5 py-3.5 text-left text-[11px] font-bold text-white/90 uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors first:rounded-tl-xl last:rounded-tr-xl">
                    <div className="flex items-center gap-1.5">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === 'asc' ? <ChevronUp className="h-3 w-3 text-white/70" /> :
                       h.column.getIsSorted() === 'desc' ? <ChevronDown className="h-3 w-3 text-white/70" /> :
                       <ChevronsUpDown className="h-3 w-3 text-white/30" />}
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/80">
            {table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-5 py-12 text-center text-gray-400 text-sm">No records found</td></tr>
            ) : table.getRowModel().rows.map((row, i) => (
              <tr key={row.id} className={`transition-colors hover:bg-brand-50/40 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-5 py-3.5 text-gray-700 text-[13px]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record count */}
      <div className="flex items-center justify-end text-sm">
        <span className="text-gray-400 text-xs font-medium">
          {table.getFilteredRowModel().rows.length} records
        </span>
      </div>
    </div>
  );
}
