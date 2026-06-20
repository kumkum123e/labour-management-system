import { useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiSearch } from "react-icons/fi";

export default function DataTable({
  columns,
  data = [],
  searchable = true,
  pageSize = 8,
  filters = null,
  actions,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let rows = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        columns.some((col) =>
          String(row[col.key] ?? "")
            .toLowerCase()
            .includes(q)
        )
      );
    }
    return rows;
  }, [data, search, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="card-panel">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {searchable && (
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-2.5 text-slate-400" />
            <input
              className="form-input pl-9"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
        )}
        {filters}
        {actions}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">
                  No records found
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => (
                <tr key={row.id || row.labourID || row.requestID || i} className="border-b border-slate-100 hover:bg-slate-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2">
                      {col.render ? col.render(row) : row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          {filtered.length} record(s) · Page {page + 1} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-outline-sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <FiChevronLeft />
          </button>
          <button
            type="button"
            className="btn-outline-sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <FiChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
