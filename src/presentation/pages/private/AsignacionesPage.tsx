import { useMemo } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { labelVuelo } from '../../utils/labels';

export function AsignacionesPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  const vuelos = useLista(useCaseFactory.vuelos);
  const tripulantes = useLista(useCaseFactory.tripulacion);
  // Copia de las asignaciones existentes para validar duplicados y solapes.
  const asignaciones = useLista(useCaseFactory.asignaciones);
  const vuelosPorId = useMemo(() => new Map(vuelos.map((v) => [v.id, v])), [vuelos]);
  const tripulantesPorId = useMemo(
    () => new Map(tripulantes.map((t) => [t.id, t])),
    [tripulantes],
  );

  return (
    <CrudPage
      titulo="Asignaciones de tripulación"
      nombreEntidad="asignación"
      useCases={useCaseFactory.asignaciones}
      puedeMutar={isStaff}
      columns={[
        {
          header: 'Vuelo',
          render: (a) => {
            const vuelo = vuelosPorId.get(a.vuelo);
            return vuelo ? labelVuelo(vuelo) : `Vuelo #${a.vuelo}`;
          },
        },
        {
          header: 'Tripulante',
          render: (a) => {
            const tripulante = tripulantesPorId.get(a.tripulacion);
            return tripulante
              ? `${tripulante.nombre} ${tripulante.apellido} (${tripulante.rol})`
              : `#${a.tripulacion}`;
          },
        },
      ]}
      campos={[
        {
          name: 'vuelo',
          label: 'Vuelo',
          tipo: 'select',
          requerido: true,
          placeholder: 'Selecciona un vuelo',
          options: vuelos.map((v) => ({ value: String(v.id), label: labelVuelo(v) })),
        },
        {
          name: 'tripulacion',
          label: 'Tripulante',
          tipo: 'select',
          requerido: true,
          placeholder: 'Selecciona un tripulante',
          options: tripulantes
            .filter((t) => t.activo)
            .map((t) => ({ value: String(t.id), label: `${t.nombre} ${t.apellido} (${t.rol})` })),
        },
      ]}
      aInput={(v, editando) => {
        const vueloId = Number(v.vuelo);
        const tripulacionId = Number(v.tripulacion);

        const tripulante = tripulantesPorId.get(tripulacionId);
        if (tripulante && !tripulante.activo) {
          return 'Ese tripulante está inactivo y no puede asignarse a vuelos';
        }

        const otras = asignaciones.filter(
          (a) => a.tripulacion === tripulacionId && a.id !== editando?.id,
        );
        if (otras.some((a) => a.vuelo === vueloId)) {
          return 'Ese tripulante ya está asignado a este vuelo';
        }

        // Solape de horario: el tripulante no puede estar en dos vuelos a la vez.
        const vueloNuevo = vuelosPorId.get(vueloId);
        if (vueloNuevo) {
          const salidaNueva = new Date(vueloNuevo.fecha_salida).getTime();
          const llegadaNueva = new Date(vueloNuevo.fecha_llegada).getTime();
          if (!Number.isNaN(salidaNueva) && !Number.isNaN(llegadaNueva)) {
            for (const asignacion of otras) {
              const otroVuelo = vuelosPorId.get(asignacion.vuelo);
              if (!otroVuelo) continue;
              const salida = new Date(otroVuelo.fecha_salida).getTime();
              const llegada = new Date(otroVuelo.fecha_llegada).getTime();
              if (Number.isNaN(salida) || Number.isNaN(llegada)) continue;
              if (salida < llegadaNueva && llegada > salidaNueva) {
                return `Conflicto de horario: ese tripulante ya está asignado al vuelo #${otroVuelo.id} (${labelVuelo(otroVuelo)})`;
              }
            }
          }
        }

        return { vuelo: vueloId, tripulacion: tripulacionId };
      }}
    />
  );
}
