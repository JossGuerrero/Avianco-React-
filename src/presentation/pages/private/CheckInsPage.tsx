import { useMemo } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { Badge } from '../../components/Badge';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { labelReserva } from '../../utils/labels';

export function CheckInsPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  const reservas = useLista(useCaseFactory.reservas);
  const puertas = useLista(useCaseFactory.puertas);
  const puertasPorId = useMemo(() => new Map(puertas.map((p) => [p.id, p])), [puertas]);

  return (
    <CrudPage
      titulo="Check-ins"
      nombreEntidad="check-in"
      useCases={useCaseFactory.checkins}
      puedeMutar={isStaff}
      columns={[
        { header: 'ID', render: (c) => <span className="text-gray-400">#{c.id}</span> },
        { header: 'Reserva', render: (c) => `Reserva #${c.reserva}` },
        {
          header: 'Puerta',
          render: (c) =>
            c.puerta == null ? (
              <span className="text-gray-400">Por asignar</span>
            ) : (
              (puertasPorId.get(c.puerta)?.codigo ?? `#${c.puerta}`)
            ),
        },
        {
          header: 'Tarjeta de embarque',
          render: (c) => <span className="font-mono text-xs">{c.tarjeta_embarque || '—'}</span>,
        },
        { header: 'Estado', render: (c) => <Badge estado={c.estado} /> },
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
          name: 'puerta',
          label: 'Puerta',
          tipo: 'select',
          placeholder: 'Por asignar',
          options: puertas
            .filter((p) => p.activa)
            .map((p) => ({ value: String(p.id), label: p.codigo })),
        },
        { name: 'tarjeta_embarque', label: 'Tarjeta de embarque', tipo: 'text', placeholder: 'Ej: TKT-00123' },
        { name: 'estado', label: 'Estado', tipo: 'text', requerido: true, placeholder: 'Ej: pendiente' },
      ]}
      aInput={(v) => ({
        reserva: Number(v.reserva),
        puerta: v.puerta ? Number(v.puerta) : null,
        tarjeta_embarque: String(v.tarjeta_embarque).trim(),
        estado: String(v.estado).trim(),
      })}
    />
  );
}
