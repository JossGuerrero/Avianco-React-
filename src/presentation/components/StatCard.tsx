interface StatCardProps {
  etiqueta: string;
  valor: string | number;
  icono: import('react').ReactNode;
  tendencia?: string;
  cargando?: boolean;
}

export function StatCard({ etiqueta, valor, icono, tendencia, cargando }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-dark-border bg-dark-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{etiqueta}</p>
          {cargando ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-dark-border" />
          ) : (
            <p className="mt-1 text-3xl font-black text-white transition-transform duration-300 group-hover:scale-105">
              {valor}
            </p>
          )}
          {tendencia && !cargando && (
            <p className="mt-1 text-xs text-gray-400">{tendencia}</p>
          )}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-light transition-all duration-300 group-hover:bg-primary/25 group-hover:shadow-md group-hover:shadow-primary/20 motion-safe:group-hover:animate-float">
          {icono}
        </div>
      </div>
    </div>
  );
}
