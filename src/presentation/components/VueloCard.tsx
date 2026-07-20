import type { Vuelo } from '../../domain/entities/Vuelo';
import { formatFecha, formatPrecio } from '../utils/formatters';
import { Badge } from './Badge';
import { Button } from './Button';
import { FlightRoute } from './FlightRoute';

export interface OcupacionVuelo {
  confirmadas: number;
  capacidad: number;
}

interface VueloCardProps {
  vuelo: Vuelo;
  onClick?: () => void;
  ocupacion?: OcupacionVuelo;
  onReservar?: () => void;
}

export function VueloCard({ vuelo, onClick, ocupacion, onReservar }: VueloCardProps) {
  const origen = vuelo.origen_detalle;
  const destino = vuelo.destino_detalle;

  const porcentaje = ocupacion
    ? Math.min(100, Math.round((ocupacion.confirmadas / Math.max(1, ocupacion.capacidad)) * 100))
    : 0;
  const colorBarra =
    porcentaje >= 90 ? 'bg-primary' : porcentaje >= 70 ? 'bg-yellow-400' : 'bg-green-400';

  return (
    <article
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-dark-border bg-dark-surface shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-dark via-primary to-primary-light" />

      <div className="p-6">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary-light transition-colors group-hover:bg-primary/20">
            Vuelo #{vuelo.id}
          </span>
          <Badge estado={vuelo.estado} />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-3xl font-black tracking-tight text-white transition-colors group-hover:text-primary-light">
              {origen?.codigo_iata ?? `#${vuelo.origen}`}
            </p>
            <p className="truncate text-sm text-gray-300">{origen?.ciudad ?? ''}</p>
            <p className="mt-1 text-xs text-gray-500">{formatFecha(vuelo.fecha_salida)}</p>
          </div>

          <FlightRoute animarEnHover />

          <div className="min-w-0 text-right">
            <p className="text-3xl font-black tracking-tight text-white transition-colors group-hover:text-primary-light">
              {destino?.codigo_iata ?? `#${vuelo.destino}`}
            </p>
            <p className="truncate text-sm text-gray-300">{destino?.ciudad ?? ''}</p>
            <p className="mt-1 text-xs text-gray-500">{formatFecha(vuelo.fecha_llegada)}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-dark-border bg-dark/50 px-4 py-3 transition-colors group-hover:border-primary/20 group-hover:bg-dark/70">
          <div>
            <p className="text-xs text-gray-500">Desde</p>
            <p className="text-xl font-black text-gradient-primary">{formatPrecio(vuelo.precio)}</p>
          </div>
          {vuelo.aeronave_detalle && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Aeronave</p>
              <p className="text-sm font-semibold text-gray-300">{vuelo.aeronave_detalle.modelo}</p>
            </div>
          )}
        </div>

        {onReservar && (
          <Button
            className="mt-4 w-full"
            onClick={(e) => {
              e.stopPropagation();
              onReservar();
            }}
          >
            Reservar vuelo
          </Button>
        )}

        {ocupacion && (
          <div className="mt-4 rounded-xl border border-dark-border bg-dark/40 p-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold uppercase tracking-wide">Ocupación</span>
              <span className="font-bold text-gray-200">
                {ocupacion.confirmadas}/{ocupacion.capacidad} · {porcentaje}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-dark">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorBarra}`}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
