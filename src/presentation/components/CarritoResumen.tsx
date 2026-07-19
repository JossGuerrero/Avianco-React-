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
    <aside className="h-fit rounded-3xl border border-dark-border bg-gradient-to-b from-dark-surface to-dark p-6 shadow-xl space-y-5">
      <div className="flex items-center gap-2 border-b border-dark-border pb-3">
        <svg className="h-5 w-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <h2 className="text-xs font-black uppercase tracking-widest text-white">Resumen de Compra</h2>
      </div>

      {/* Resumen de selección */}
      <div className="rounded-2xl bg-dark/40 p-4 border border-dark-border/40 space-y-3 text-xs animate-fade-in">
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400 font-medium">Itinerario:</span>
          <span className="font-bold text-white tracking-wide bg-dark-surface px-2 py-0.5 rounded border border-dark-border/50">{ruta}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400 font-medium">Asiento asignado:</span>
          <span className={`font-mono px-2 py-0.5 rounded font-black ${asiento ? 'text-primary-light bg-primary/10 border border-primary/20' : 'text-gray-500 bg-dark-surface/50 border border-dark-border/30'}`}>
            {asiento || 'Sin asignar'}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400 font-medium">Pasajero titular:</span>
          <span className="truncate font-semibold text-gray-200 max-w-[150px]">{pasajeroNombre || 'No seleccionado'}</span>
        </div>
      </div>

      {/* Servicios adicionales */}
      {servicios.length > 0 && (
        <div className="space-y-2.5 border-t border-dark-border pt-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Servicios Extra Disponibles
          </h3>
          <div className="grid gap-2">
            {servicios.map((servicio) => {
              const activo = serviciosSel.includes(servicio.id);
              return (
                <button
                  key={servicio.id}
                  type="button"
                  onClick={() => onToggleServicio(servicio.id)}
                  title={servicio.descripcion}
                  className={`flex items-center justify-between rounded-2xl border p-3 text-left transition-all duration-200 ${
                    activo
                      ? 'border-primary/65 bg-primary/10 text-white'
                      : 'border-dark-border bg-dark/30 text-gray-400 hover:border-dark-border/80 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col pr-2">
                    <span className="text-xs font-bold leading-tight">{servicio.nombre}</span>
                    <span className="text-[9px] text-gray-500 mt-0.5 truncate max-w-[170px]">{servicio.descripcion}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-primary-light">{formatPrecio(servicio.precio)}</span>
                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${activo ? 'bg-primary border-primary' : 'border-dark-border'}`}>
                      {activo && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
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
