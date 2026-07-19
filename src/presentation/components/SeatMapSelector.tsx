import { useMemo } from 'react';
import type { Asiento } from '../../domain/entities/Asiento';

interface SeatMapSelectorProps {
  capacidad: number;
  asientos: Asiento[];
  codigosOcupados?: Set<string>;
  value: string;
  onChange: (codigo: string) => void;
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
    <div>
      <span className="text-sm font-medium text-gray-300">Asiento</span>
      {!esMapaReal && (
        <p className="mt-1 text-xs text-yellow-300/90">
          Este vuelo aún no tiene asientos cargados: se muestra un mapa temporal según la
          capacidad de la aeronave ({capacidad} asientos).
        </p>
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
                  const clases = asiento.disponible
                    ? seleccionado
                      ? 'border-primary bg-primary text-white scale-110 shadow-lg shadow-primary/40'
                      : 'border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/25 hover:scale-105'
                    : 'cursor-not-allowed border-primary/25 bg-primary/10 text-primary-light/40';
                  return (
                    <button
                      key={asiento.codigo}
                      type="button"
                      disabled={!asiento.disponible}
                      onClick={() => onChange(seleccionado ? '' : asiento.codigo)}
                      title={
                        asiento.disponible
                          ? `${asiento.codigo}${asiento.clase ? ` · ${asiento.clase}` : ''}`
                          : `${asiento.codigo} · ocupado`
                      }
                      className={`h-8 w-8 rounded-md border text-[10px] font-bold transition-all duration-150 ${clases} ${
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
