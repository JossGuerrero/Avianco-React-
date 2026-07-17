import type { Vuelo } from '../../domain/entities/Vuelo';
import type { Servicio } from '../../domain/entities/Servicio';
import type { Promocion } from '../../domain/entities/Promocion';
import { TipoEquipaje } from '../../domain/enums/TipoEquipaje';
import { porcentajeDescuento } from '../../domain/services/promocion.service';
import { Button } from './Button';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { formatPrecio } from '../utils/formatters';

export interface DesgloseCarrito {
  precioVuelo: number;
  descuento: number;
  totalServicios: number;
  impuestos: number;
  total: number;
}

interface CarritoResumenProps {
  vuelo: Vuelo;
  asiento: string;
  pasajeroNombre: string;
  servicios: Servicio[];
  serviciosSel: number[];
  onToggleServicio: (id: number) => void;
  equipajeTipo: TipoEquipaje | '';
  onEquipajeTipo: (tipo: TipoEquipaje | '') => void;
  equipajePeso: string;
  onEquipajePeso: (peso: string) => void;
  codigoPromo: string;
  onCodigoPromo: (codigo: string) => void;
  promoAplicada: Promocion | null;
  errorPromo: string | null;
  onAplicarPromo: () => void;
  onQuitarPromo: () => void;
  desglose: DesgloseCarrito;
  comprando: boolean;
  deshabilitado: boolean;
  onConfirmar: () => void;
}

// Sidebar del checkout: resumen de la compra con servicios adicionales
// (catálogo real de /servicios/) y equipaje opcional, sumando en tiempo real.
export function CarritoResumen({
  vuelo,
  asiento,
  pasajeroNombre,
  servicios,
  serviciosSel,
  onToggleServicio,
  equipajeTipo,
  onEquipajeTipo,
  equipajePeso,
  onEquipajePeso,
  codigoPromo,
  onCodigoPromo,
  promoAplicada,
  errorPromo,
  onAplicarPromo,
  onQuitarPromo,
  desglose,
  comprando,
  deshabilitado,
  onConfirmar,
}: CarritoResumenProps) {
  const ruta = `${vuelo.origen_detalle?.codigo_iata ?? `#${vuelo.origen}`} → ${
    vuelo.destino_detalle?.codigo_iata ?? `#${vuelo.destino}`
  }`;
  const seleccionados = servicios.filter((s) => serviciosSel.includes(s.id));

  return (
    <aside className="h-fit rounded-2xl border border-dark-border bg-dark-surface p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Tu carrito</h2>

      {/* Resumen de selección */}
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-gray-400">Vuelo</dt>
          <dd className="font-semibold text-white">{ruta}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-400">Asiento</dt>
          <dd className="font-semibold text-white">{asiento || '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-400">Pasajero</dt>
          <dd className="truncate font-semibold text-white">{pasajeroNombre || '—'}</dd>
        </div>
      </dl>

      {/* Servicios adicionales */}
      {servicios.length > 0 && (
        <div className="mt-4 border-t border-dark-border pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Servicios adicionales
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {servicios.map((servicio) => {
              const activo = serviciosSel.includes(servicio.id);
              return (
                <button
                  key={servicio.id}
                  type="button"
                  onClick={() => onToggleServicio(servicio.id)}
                  title={servicio.descripcion}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                    activo
                      ? 'border-primary bg-primary/20 text-primary-light'
                      : 'border-dark-border bg-dark text-gray-300 hover:border-primary/60 hover:text-white'
                  }`}
                >
                  {servicio.nombre} · {formatPrecio(servicio.precio)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Equipaje opcional */}
      <div className="mt-4 space-y-3 border-t border-dark-border pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">
          Equipaje (opcional)
        </h3>
        <FormSelect
          label="Tipo de equipaje"
          value={equipajeTipo}
          onChange={(e) => onEquipajeTipo(e.target.value as TipoEquipaje | '')}
          placeholder="Sin equipaje adicional"
          options={Object.values(TipoEquipaje).map((tipo) => ({ value: tipo, label: tipo }))}
        />
        {equipajeTipo && (
          <FormInput
            label="Peso (kg)"
            type="number"
            min={0.1}
            step="0.1"
            value={equipajePeso}
            onChange={(e) => onEquipajePeso(e.target.value)}
            placeholder="Ej: 23"
          />
        )}
      </div>

      {/* Código promocional */}
      <div className="mt-4 border-t border-dark-border pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">
          Código promocional
        </h3>
        {promoAplicada ? (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm">
            <span className="font-semibold text-green-300">
              {promoAplicada.codigo} · −{porcentajeDescuento(promoAplicada)}%
            </span>
            <button
              type="button"
              onClick={onQuitarPromo}
              className="text-xs text-gray-400 transition-colors hover:text-white"
            >
              Quitar
            </button>
          </div>
        ) : (
          <div className="mt-2 flex items-end gap-2">
            <div className="flex-1">
              <FormInput
                label="Código"
                value={codigoPromo}
                onChange={(e) => onCodigoPromo(e.target.value)}
                placeholder="Ej: VERANO26"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!codigoPromo.trim()}
              onClick={onAplicarPromo}
            >
              Aplicar
            </Button>
          </div>
        )}
        {errorPromo && <p className="mt-2 text-xs text-primary-light">{errorPromo}</p>}
      </div>

      {/* Desglose en tiempo real */}
      <dl className="mt-4 space-y-2 border-t border-dark-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-400">Tarifa del vuelo</dt>
          <dd className="text-white">{formatPrecio(desglose.precioVuelo)}</dd>
        </div>
        {desglose.descuento > 0 && promoAplicada && (
          <div className="flex justify-between">
            <dt className="text-gray-400">Descuento ({promoAplicada.codigo})</dt>
            <dd className="text-green-300">−{formatPrecio(desglose.descuento)}</dd>
          </div>
        )}
        {seleccionados.map((servicio) => (
          <div key={servicio.id} className="flex justify-between">
            <dt className="truncate pr-2 text-gray-400">+ {servicio.nombre}</dt>
            <dd className="text-white">{formatPrecio(servicio.precio)}</dd>
          </div>
        ))}
        <div className="flex justify-between">
          <dt className="text-gray-400">Impuestos (12%)</dt>
          <dd className="text-white">{formatPrecio(desglose.impuestos)}</dd>
        </div>
        <div className="flex justify-between border-t border-dark-border pt-2">
          <dt className="font-bold text-white">Total</dt>
          <dd className="text-lg font-black text-primary-light">{formatPrecio(desglose.total)}</dd>
        </div>
      </dl>

      <Button
        className="mt-4 w-full"
        isLoading={comprando}
        disabled={deshabilitado}
        onClick={onConfirmar}
      >
        Confirmar y pagar
      </Button>
    </aside>
  );
}
