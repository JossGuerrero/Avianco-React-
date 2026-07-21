import { useMemo } from 'react';
import type { Asiento } from '../../domain/entities/Asiento';

interface SeatMapSelectorProps {
  capacidad: number;
  asientos: Asiento[];
  codigosOcupados?: Set<string>;
  value: string;
  onChange: (codigo: string) => void;
  permiteSeleccionarOcupados?: boolean;
}

interface SeatCell {
  codigo: string;
  disponible: boolean;
  clase?: string;
}

const COLUMNAS = ['A', 'B', 'C', 'D', 'E', 'F'];
const MAX_FILAS_GENERADAS = 50;

function generarMapaTemporal(capacidad: number): SeatCell[][] {
  const totalAsientos = Math.max(1, Math.min(capacidad, MAX_FILAS_GENERADAS * COLUMNAS.length));
  const filas: SeatCell[][] = [];
  for (let fila = 1; (fila - 1) * COLUMNAS.length < totalAsientos; fila++) {
    const celdas: SeatCell[] = [];
    for (const columna of COLUMNAS) {
      if ((fila - 1) * COLUMNAS.length + celdas.length >= totalAsientos) break;
      celdas.push({ codigo: `${fila}${columna}`, disponible: true });
    }
    filas.push(celdas);
  }
  return filas;
}

function agruparAsientosReales(asientos: Asiento[]): SeatCell[][] {
  const porFila = new Map<number, Asiento[]>();
  for (const asiento of asientos) {
    const grupo = porFila.get(asiento.fila) ?? [];
    grupo.push(asiento);
    porFila.set(asiento.fila, grupo);
  }
  return [...porFila.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, grupo]) =>
      grupo
        .sort((a, b) => a.columna.localeCompare(b.columna))
        .map((a) => ({ codigo: a.codigo, disponible: a.disponible, clase: a.clase })),
    );
}

export function SeatMapSelector({
  capacidad,
  asientos,
  codigosOcupados,
  value,
  onChange,
  permiteSeleccionarOcupados = false,
}: SeatMapSelectorProps) {
  const esMapaReal = asientos.length > 0;

  const filas = useMemo(() => {
    const base = esMapaReal ? agruparAsientosReales(asientos) : generarMapaTemporal(capacidad);
    if (!codigosOcupados || codigosOcupados.size === 0) return base;
    return base.map((fila) =>
      fila.map((celda) =>
        codigosOcupados.has(celda.codigo.toUpperCase())
          ? { ...celda, disponible: false }
          : celda,
      ),
    );
  }, [esMapaReal, asientos, capacidad, codigosOcupados]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider text-gray-400 uppercase flex items-center gap-1.5">
          <svg className="h-4 w-4 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          Selección de Asiento
        </span>
      </div>

      {!esMapaReal && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-[11px] text-yellow-300/90 leading-relaxed animate-fade-in">
          <strong>Nota:</strong> No se detectó un mapa cargado para esta aeronave. Se generó una distribución estimada para {capacidad} asientos.
        </div>
      )}

      <div className="mt-2 max-h-72 overflow-x-auto overflow-y-auto rounded-xl border border-dark-border bg-dark p-4">
        <div className="mx-auto mb-3 h-2 w-24 rounded-full bg-dark-border" aria-hidden />
        <div className="mx-auto flex w-max flex-col items-center gap-1.5">
          {filas.map((fila, i) => {
            const mitad = Math.ceil(fila.length / 2);
            return (
              <div key={i} className="flex items-center gap-1.5">
                {fila.map((asiento, j) => {
                  const seleccionado = value === asiento.codigo;
                  const esVIP =
                    asiento.clase?.toUpperCase() === 'VIP' ||
                    asiento.clase?.toUpperCase() === 'PRIMERA' ||
                    asiento.clase?.toUpperCase() === 'BUSINESS';

                  let clases = '';
                  if (seleccionado) {
                    clases =
                      'border-primary bg-gradient-to-b from-primary-light to-primary text-white scale-110 shadow-md shadow-primary/30 ring-2 ring-primary-light/35';
                  } else if (!asiento.disponible) {
                    clases = permiteSeleccionarOcupados
                      ? 'border-primary/40 bg-primary/15 text-primary-light/80 hover:bg-primary/30 hover:scale-105'
                      : 'cursor-not-allowed border-dark-border/40 bg-dark-surface/30 text-gray-600/40 line-through';
                  } else if (esVIP) {
                    clases =
                      'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/25 hover:border-amber-500 hover:scale-105';
                  } else {
                    clases =
                      'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-500 hover:scale-105';
                  }

                  return (
                    <button
                      key={asiento.codigo}
                      type="button"
                      disabled={!permiteSeleccionarOcupados && !asiento.disponible}
                      onClick={() => onChange(seleccionado ? '' : asiento.codigo)}
                      title={
                        asiento.disponible
                          ? `${asiento.codigo}${asiento.clase ? ` · Clase ${asiento.clase}` : ''}`
                          : `${asiento.codigo} · Ocupado`
                      }
                      className={`h-8 w-8 rounded-lg border text-[10px] font-black transition-all duration-200 focus:outline-none ${clases} ${
                        j === mitad ? 'ml-5' : ''
                      }`}
                    >
                      {asiento.codigo}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-green-500/40 bg-green-500/10" />
          Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-primary/25 bg-primary/10" />
          Ocupado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-primary bg-primary" />
          Seleccionado
        </span>
        {value && <span className="ml-auto font-semibold text-white">Asiento: {value}</span>}
      </div>
    </div>
  );
}
