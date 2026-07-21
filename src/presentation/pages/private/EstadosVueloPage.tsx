import { useMemo } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { Badge } from '../../components/Badge';
import { EstadoVuelo } from '../../../domain/enums/EstadoVuelo';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { labelVuelo } from '../../utils/labels';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function EstadosVueloPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  const vuelos = useLista(useCaseFactory.vuelos);
  const vuelosPorId = useMemo(() => new Map(vuelos.map((v) => [v.id, v])), [vuelos]);

  return (
    <CrudPage
      titulo="Estados de vuelo"
      destacado="vuelo"
      descripcion="Historial de cambios de estado — solo se agregan registros, no se editan"
      imagenHero={AVIATION_IMAGES.estadosVuelo}
      nombreEntidad="registro de estado"
      useCases={useCaseFactory.estadosVuelo}
      puedeMutar={isStaff}
      permitirEditar={false}
      columns={[
        { header: 'ID', render: (e) => <span className="text-gray-400">#{e.id}</span> },
        {
          header: 'Vuelo',
          render: (e) => {
            const vuelo = vuelosPorId.get(e.vuelo);
            return vuelo ? labelVuelo(vuelo) : `Vuelo #${e.vuelo}`;
          },
        },
        { header: 'Estado', render: (e) => <Badge estado={e.estado} /> },
        { header: 'Descripción', render: (e) => e.descripcion || '—' },
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
          name: 'estado',
          label: 'Estado',
          tipo: 'select',
          requerido: true,
          options: Object.values(EstadoVuelo).map((e) => ({ value: e, label: e })),
        },
        { name: 'descripcion', label: 'Descripción', tipo: 'text', placeholder: 'Motivo del cambio' },
      ]}
      aInput={(v) => ({
        vuelo: Number(v.vuelo),
        estado: String(v.estado) as EstadoVuelo,
        descripcion: String(v.descripcion).trim(),
      })}
    />
  );
}
