import { useMemo } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { Badge } from '../../components/Badge';
import { ClaseTarifa } from '../../../domain/enums/ClaseTarifa';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { labelVuelo } from '../../utils/labels';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function AsientosPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  const vuelos = useLista(useCaseFactory.vuelos);
  const vuelosPorId = useMemo(() => new Map(vuelos.map((v) => [v.id, v])), [vuelos]);

  return (
    <CrudPage
      titulo="Asientos"
      destacado="Asientos"
      descripcion="Disponibilidad por vuelo, fila, columna y clase de tarifa"
      imagenHero={AVIATION_IMAGES.asientos}
      nombreEntidad="asiento"
      useCases={useCaseFactory.asientos}
      puedeMutar={isStaff}
      columns={[
        { header: 'Código', render: (a) => <span className="font-mono font-bold">{a.codigo}</span> },
        {
          header: 'Vuelo',
          render: (a) => {
            const vuelo = vuelosPorId.get(a.vuelo);
            return vuelo ? labelVuelo(vuelo) : `Vuelo #${a.vuelo}`;
          },
        },
        { header: 'Clase', render: (a) => <span className="capitalize">{a.clase}</span> },
        { header: 'Posición', render: (a) => `Fila ${a.fila} · Col ${a.columna}` },
        { header: 'Estado', render: (a) => <Badge estado={a.disponible ? 'disponible' : 'ocupado'} /> },
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
        { name: 'codigo', label: 'Código', tipo: 'text', requerido: true, placeholder: 'Ej: 12A', maxLength: 4 },
        {
          name: 'clase',
          label: 'Clase',
          tipo: 'select',
          requerido: true,
          options: Object.values(ClaseTarifa).map((c) => ({ value: c, label: c })),
        },
        { name: 'fila', label: 'Fila', tipo: 'number', requerido: true, placeholder: 'Ej: 12' },
        { name: 'columna', label: 'Columna', tipo: 'text', requerido: true, placeholder: 'Ej: A', maxLength: 2 },
        { name: 'disponible', label: 'Disponible', tipo: 'checkbox' },
      ]}
      aInput={(v) => {
        const fila = Number(v.fila);
        if (Number.isNaN(fila) || fila <= 0) return 'La fila debe ser un número positivo';
        return {
          vuelo: Number(v.vuelo),
          codigo: String(v.codigo).trim().toUpperCase(),
          clase: String(v.clase) as ClaseTarifa,
          fila,
          columna: String(v.columna).trim().toUpperCase(),
          disponible: Boolean(v.disponible),
        };
      }}
    />
  );
}
