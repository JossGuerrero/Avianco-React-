import { CrudPage } from '../../components/CrudPage';
import { TipoEquipaje } from '../../../domain/enums/TipoEquipaje';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { labelReserva } from '../../utils/labels';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function EquipajesPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  const reservas = useLista(useCaseFactory.reservas);

  return (
    <CrudPage
      titulo="Equipajes"
      destacado="Equipajes"
      descripcion="Control de maletas, peso permitido y tipo de equipaje por reserva"
      imagenHero={AVIATION_IMAGES.equipajes}
      nombreEntidad="equipaje"
      useCases={useCaseFactory.equipajes}
      puedeMutar={isStaff}
      columns={[
        { header: 'ID', render: (e) => <span className="text-gray-400">#{e.id}</span> },
        { header: 'Reserva', render: (e) => `Reserva #${e.reserva}` },
        { header: 'Tipo', render: (e) => <span className="capitalize">{e.tipo}</span> },
        { header: 'Peso', render: (e) => `${Number(e.peso_kg)} kg` },
        { header: 'Descripción', render: (e) => e.descripcion || '—' },
      ]}
      campos={[
        {
          name: 'reserva',
          label: 'Reserva',
          tipo: 'select',
          requerido: true,
          placeholder: 'Selecciona una reserva',
          options: reservas.map((r) => ({ value: String(r.id), label: labelReserva(r) })),
        },
        {
          name: 'tipo',
          label: 'Tipo',
          tipo: 'select',
          requerido: true,
          options: Object.values(TipoEquipaje).map((t) => ({ value: t, label: t })),
        },
        { name: 'peso_kg', label: 'Peso (kg)', tipo: 'number', requerido: true, step: '0.1', placeholder: 'Ej: 23' },
        { name: 'descripcion', label: 'Descripción', tipo: 'text' },
      ]}
      aInput={(v) => {
        const peso = Number(v.peso_kg);
        if (Number.isNaN(peso) || peso <= 0) return 'El peso debe ser un número positivo';
        return {
          reserva: Number(v.reserva),
          tipo: String(v.tipo) as TipoEquipaje,
          peso_kg: peso,
          descripcion: String(v.descripcion).trim(),
        };
      }}
    />
  );
}
