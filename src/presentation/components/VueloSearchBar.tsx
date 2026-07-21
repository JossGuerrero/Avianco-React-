import { FormInput } from './FormInput';
import { FormSelect, type SelectOption } from './FormSelect';
import { Button } from './Button';
import { PlaneIcon } from './PlaneIcon';
import { FILTROS_VACIOS, hayFiltrosActivos, type FiltrosVuelo } from '../utils/filtrosVuelo';

interface VueloSearchBarProps {
  opcionesAeropuertos: SelectOption[];
  filtros: FiltrosVuelo;
  onChange: (filtros: FiltrosVuelo) => void;
  cargandoOpciones?: boolean;
}

export function VueloSearchBar({
  opcionesAeropuertos,
  filtros,
  onChange,
  cargandoOpciones = false,
}: VueloSearchBarProps) {
  const placeholderOrigen = cargandoOpciones ? 'Cargando aeropuertos…' : 'Cualquier origen';
  const placeholderDestino = cargandoOpciones ? 'Cargando aeropuertos…' : 'Cualquier destino';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dark-border bg-dark-surface shadow-lg">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary-dark via-primary to-primary-light" />
      <div className="border-b border-dark-border bg-dark/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary-light animate-float motion-reduce:animate-none">
            <PlaneIcon size="sm" />
          </span>
          <p className="text-sm font-bold text-white">Buscar vuelos</p>
          {hayFiltrosActivos(filtros) && (
            <span className="ml-auto rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary-light">
              Filtros activos
            </span>
          )}
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <FormSelect
            label="Origen"
            value={filtros.origen}
            onChange={(e) => onChange({ ...filtros, origen: e.target.value })}
            placeholder={placeholderOrigen}
            disabled={cargandoOpciones}
            options={opcionesAeropuertos.filter((o) => o.value !== filtros.destino)}
          />
          <FormSelect
            label="Destino"
            value={filtros.destino}
            onChange={(e) => onChange({ ...filtros, destino: e.target.value })}
            placeholder={placeholderDestino}
            disabled={cargandoOpciones}
            options={opcionesAeropuertos.filter((o) => o.value !== filtros.origen)}
          />
          <FormInput
            label="Fecha de salida"
            type="date"
            value={filtros.fecha}
            onChange={(e) => onChange({ ...filtros, fecha: e.target.value })}
          />
          <Button
            variant="secondary"
            disabled={!hayFiltrosActivos(filtros)}
            onClick={() => onChange(FILTROS_VACIOS)}
            className="lg:mb-0.5"
          >
            Limpiar
          </Button>
        </div>
      </div>
    </div>
  );
}
