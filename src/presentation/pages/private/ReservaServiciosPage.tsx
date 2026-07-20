import { useMemo } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { labelReserva } from '../../utils/labels';
import { formatPrecio } from '../../utils/formatters';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function ReservaServiciosPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  const reservas = useLista(useCaseFactory.reservas);
  const servicios = useLista(useCaseFactory.servicios);
  const serviciosPorId = useMemo(() => new Map(servicios.map((s) => [s.id, s])), [servicios]);

  return (
    <CrudPage
      titulo="Servicios por reserva"
      destacado="reserva"
      descripcion="Vincula servicios extras a cada reserva con precio y cantidad"
      imagenHero={AVIATION_IMAGES.reservaServicios}
      nombreEntidad="servicio de reserva"
      useCases={useCaseFactory.reservaServicios}
      puedeMutar={isStaff}
      columns={[
        { header: 'Reserva', render: (rs) => `Reserva #${rs.reserva}` },
        { header: 'Servicio', render: (rs) => serviciosPorId.get(rs.servicio)?.nombre ?? `#${rs.servicio}` },
        { header: 'Cantidad', render: (rs) => rs.cantidad },
        {
          header: 'Precio aplicado',
          render: (rs) => <span className="font-semibold">{formatPrecio(rs.precio_aplicado)}</span>,
        },
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
          name: 'servicio',
          label: 'Servicio',
          tipo: 'select',
          requerido: true,
          placeholder: 'Selecciona un servicio',
          options: servicios.map((s) => ({
            value: String(s.id),
            label: `${s.nombre} (${formatPrecio(s.precio)})`,
          })),
        },
        { name: 'cantidad', label: 'Cantidad', tipo: 'number', requerido: true, defaultValue: '1' },
        { name: 'precio_aplicado', label: 'Precio aplicado', tipo: 'number', requerido: true, step: '0.01' },
      ]}
      aInput={(v) => {
        const cantidad = Number(v.cantidad);
        const precio = Number(v.precio_aplicado);
        if (Number.isNaN(cantidad) || cantidad <= 0) return 'La cantidad debe ser mayor a cero';
        if (Number.isNaN(precio) || precio < 0) return 'El precio aplicado debe ser válido';
        return {
          reserva: Number(v.reserva),
          servicio: Number(v.servicio),
          cantidad,
          precio_aplicado: precio,
        };
      }}
    />
  );
}
