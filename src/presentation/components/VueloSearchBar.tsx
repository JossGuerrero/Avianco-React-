import { FormInput } from './FormInput';
import { FormSelect, type SelectOption } from './FormSelect';
import { Button } from './Button';
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
    <div className="rounded-2xl border border-dark-border bg-dark-surface p-4 sm:p-5">
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
  );
}
