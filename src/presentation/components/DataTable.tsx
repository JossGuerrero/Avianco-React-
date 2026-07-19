import { useState, type ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { PlaneIcon } from './PlaneIcon';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface ServerPagination {
  page: number;
  hasNext: boolean;
  hasPrevious: boolean;
  count?: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => number;
  loading?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  actions?: (row: T) => ReactNode;
  pagination?: ServerPagination;
}

function BotonPagina({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-dark-border px-3 py-1 transition-all duration-200 hover:border-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  loading = false,
  pageSize = 8,
  emptyMessage = 'Sin registros',
  actions,
  pagination,
}: DataTableProps<T>) {
  const [pageLocal, setPageLocal] = useState(0);

  const totalColumnas = columns.length + (actions ? 1 : 0);

  const totalPagesLocal = Math.max(1, Math.ceil(data.length / pageSize));
  const paginaLocal = Math.min(pageLocal, totalPagesLocal - 1);
  const filas = pagination
    ? data
    : data.slice(paginaLocal * pageSize, (paginaLocal + 1) * pageSize);

  return (
    <div className="overflow-hidden rounded-2xl border border-dark-border bg-dark-surface shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-dark-border bg-gradient-to-r from-dark via-dark-surface to-dark text-xs uppercase tracking-wider text-gray-400">
              {columns.map((col) => (
                <th key={col.header} className={`px-5 py-4 font-bold ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
              {actions && <th className="px-5 py-4 text-right font-bold">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-dark-border/50 last:border-b-0">
                  {Array.from({ length: totalColumnas }, (_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && filas.length === 0 && (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary-light animate-float motion-reduce:animate-none">
                      <PlaneIcon size="lg" />
                    </span>
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              filas.map((fila, index) => (
                <tr
                  key={getRowId(fila)}
                  className={`border-b border-dark-border/50 text-gray-200 transition-colors last:border-b-0 hover:bg-primary/5 ${
                    index % 2 === 0 ? 'bg-dark-surface' : 'bg-dark/30'
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.header} className={`px-5 py-3.5 ${col.className ?? ''}`}>
                      {col.render(fila)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">{actions(fila)}</div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {pagination && !loading && (pagination.hasNext || pagination.hasPrevious) && (
        <div className="flex items-center justify-between border-t border-dark-border px-4 py-3 text-sm text-gray-400">
          <span>
            Página {pagination.page}
            {pagination.count !== undefined && ` · ${pagination.count} registros en total`}
          </span>
          <div className="flex gap-2">
            <BotonPagina
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevious}
            >
              Anterior
            </BotonPagina>
            <BotonPagina
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
            >
              Siguiente
            </BotonPagina>
          </div>
        </div>
      )}

      {!pagination && !loading && totalPagesLocal > 1 && (
        <div className="flex items-center justify-between border-t border-dark-border px-4 py-3 text-sm text-gray-400">
          <span>
            Página {paginaLocal + 1} de {totalPagesLocal} · {data.length} registros
          </span>
          <div className="flex gap-2">
            <BotonPagina onClick={() => setPageLocal(paginaLocal - 1)} disabled={paginaLocal === 0}>
              Anterior
            </BotonPagina>
            <BotonPagina
              onClick={() => setPageLocal(paginaLocal + 1)}
              disabled={paginaLocal >= totalPagesLocal - 1}
            >
              Siguiente
            </BotonPagina>
          </div>
        </div>
      )}
    </div>
  );
}
