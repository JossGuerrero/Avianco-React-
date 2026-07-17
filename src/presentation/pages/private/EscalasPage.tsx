import { useMemo } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { labelAeropuerto, labelVuelo } from '../../utils/labels';
import { formatFecha } from '../../utils/formatters';

export function EscalasPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  const vuelos = useLista(useCaseFactory.vuelos);
  const aeropuertos = useLista(useCaseFactory.aeropuertos);
  // Copia de las escalas existentes para validar orden duplicado por vuelo.
  const escalas = useLista(useCaseFactory.escalas);
  const vuelosPorId = useMemo(() => new Map(vuelos.map((v) => [v.id, v])), [vuelos]);
  const aeropuertosPorId = useMemo(
    () => new Map(aeropuertos.map((a) => [a.id, a])),
    [aeropuertos],
  );

  return (
    <CrudPage
      titulo="Escalas"
      nombreEntidad="escala"
      useCases={useCaseFactory.escalas}
      puedeMutar={isStaff}
      columns={[
        {
          header: 'Vuelo',
          render: (e) => {
            const vuelo = vuelosPorId.get(e.vuelo);
            return vuelo ? labelVuelo(vuelo) : `Vuelo #${e.vuelo}`;
          },
        },
        {
          header: 'Aeropuerto',
          render: (e) => {
            const aeropuerto = aeropuertosPorId.get(e.aeropuerto);
            return aeropuerto ? labelAeropuerto(aeropuerto) : `#${e.aeropuerto}`;
          },
        },
        { header: 'Orden', render: (e) => e.orden },
        { header: 'Llegada', render: (e) => formatFecha(e.llegada) },
        { header: 'Salida', render: (e) => formatFecha(e.salida) },
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
          name: 'aeropuerto',
          label: 'Aeropuerto',
          tipo: 'select',
          requerido: true,
          placeholder: 'Selecciona un aeropuerto',
          options: aeropuertos.map((a) => ({ value: String(a.id), label: labelAeropuerto(a) })),
        },
        { name: 'orden', label: 'Orden', tipo: 'number', requerido: true, defaultValue: '1' },
        { name: 'llegada', label: 'Llegada', tipo: 'datetime-local', requerido: true },
        { name: 'salida', label: 'Salida', tipo: 'datetime-local', requerido: true },
      ]}
      aInput={(v, editando) => {
        const vueloId = Number(v.vuelo);
        const orden = Number(v.orden);
        if (Number.isNaN(orden) || orden <= 0 || !Number.isInteger(orden)) {
          return 'El orden debe ser un número entero positivo';
        }

        const llegada = new Date(String(v.llegada)).getTime();
        const salida = new Date(String(v.salida)).getTime();
        // En una escala primero se llega y después se sale.
        if (!Number.isNaN(llegada) && !Number.isNaN(salida) && salida <= llegada) {
          return 'La salida de la escala debe ser posterior a su llegada';
        }

        // La escala debe caer dentro de la ventana del vuelo.
        const vuelo = vuelosPorId.get(vueloId);
        if (vuelo) {
          const salidaVuelo = new Date(vuelo.fecha_salida).getTime();
          const llegadaVuelo = new Date(vuelo.fecha_llegada).getTime();
          if (
            !Number.isNaN(salidaVuelo) &&
            !Number.isNaN(llegadaVuelo) &&
            !Number.isNaN(llegada) &&
            !Number.isNaN(salida) &&
            (llegada <= salidaVuelo || salida >= llegadaVuelo)
          ) {
            return 'La escala debe estar entre la salida y la llegada del vuelo';
          }
          if (vuelo.origen === Number(v.aeropuerto) || vuelo.destino === Number(v.aeropuerto)) {
            return 'El aeropuerto de la escala no puede ser el origen ni el destino del vuelo';
          }
        }

        // Orden único dentro del mismo vuelo (sin contar la escala en edición).
        const duplicada = escalas.some(
          (e) => e.vuelo === vueloId && e.orden === orden && e.id !== editando?.id,
        );
        if (duplicada) return `Ya existe una escala con orden ${orden} en este vuelo`;

        return {
          vuelo: vueloId,
          aeropuerto: Number(v.aeropuerto),
          orden,
          llegada: String(v.llegada),
          salida: String(v.salida),
        };
      }}
    />
  );
}
