import { CrudPage } from '../../components/CrudPage';
import { TipoServicio } from '../../../domain/enums/TipoServicio';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { formatPrecio } from '../../utils/formatters';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function ServiciosPage() {
  const isStaff = useAuthStore((state) => state.isStaff);

  return (
    <CrudPage
      titulo="Servicios"
      destacado="Servicios"
      descripcion="Catálogo de servicios adicionales, complementos y extras de viaje"
      imagenHero={AVIATION_IMAGES.servicios}
      nombreEntidad="servicio"
      useCases={useCaseFactory.servicios}
      puedeMutar={isStaff}
      columns={[
        { header: 'Nombre', render: (s) => s.nombre },
        { header: 'Tipo', render: (s) => <span className="capitalize">{s.tipo}</span> },
        { header: 'Precio', render: (s) => <span className="font-semibold">{formatPrecio(s.precio)}</span> },
        { header: 'Descripción', render: (s) => s.descripcion || '—' },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre', tipo: 'text', requerido: true, placeholder: 'Ej: Maleta extra 23kg' },
        { name: 'descripcion', label: 'Descripción', tipo: 'text' },
        { name: 'precio', label: 'Precio', tipo: 'number', requerido: true, step: '0.01', placeholder: 'Ej: 35.00' },
        {
          name: 'tipo',
          label: 'Tipo',
          tipo: 'select',
          requerido: true,
          options: Object.values(TipoServicio).map((t) => ({ value: t, label: t })),
        },
      ]}
      aInput={(v) => {
        const precio = Number(v.precio);
        if (Number.isNaN(precio) || precio < 0) return 'El precio debe ser un número válido';
        return {
          nombre: String(v.nombre).trim(),
          descripcion: String(v.descripcion).trim(),
          precio,
          tipo: String(v.tipo) as TipoServicio,
        };
      }}
    />
  );
}
