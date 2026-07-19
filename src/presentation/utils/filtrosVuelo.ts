import type { Vuelo } from '../../domain/entities/Vuelo';

export interface FiltrosVuelo {
  origen: string;
  destino: string;
  fecha: string;
}

export const FILTROS_VACIOS: FiltrosVuelo = { origen: '', destino: '', fecha: '' };

export function hayFiltrosActivos(filtros: FiltrosVuelo): boolean {
  return Boolean(filtros.origen || filtros.destino || filtros.fecha);
}

export function filtrarVuelos(vuelos: Vuelo[], filtros: FiltrosVuelo): Vuelo[] {
  return vuelos.filter((vuelo) => {
    if (filtros.origen && String(vuelo.origen) !== filtros.origen) return false;
    if (filtros.destino && String(vuelo.destino) !== filtros.destino) return false;
    if (filtros.fecha) {
      const salida = new Date(vuelo.fecha_salida);
      if (Number.isNaN(salida.getTime())) return false;
      const fechaLocal = new Intl.DateTimeFormat('en-CA').format(salida);
      if (fechaLocal !== filtros.fecha) return false;
    }
    return true;
  });
}
