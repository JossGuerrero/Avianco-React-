import { CrudPage } from '../../components/CrudPage';
import { ClaseTarifa } from '../../../domain/enums/ClaseTarifa';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function TarifasPage() {
  const isStaff = useAuthStore((state) => state.isStaff);

  return (
    <CrudPage
      titulo="Tarifas"
      destacado="Tarifas"
      descripcion="Catálogo de tarifas, clases y descuentos aplicables a los vuelos"
      imagenHero={AVIATION_IMAGES.tarifas}
      nombreEntidad="tarifa"
      useCases={useCaseFactory.tarifas}
      puedeMutar={isStaff}
      columns={[
        { header: 'Nombre', render: (t) => t.nombre },
        { header: 'Clase', render: (t) => <span className="capitalize">{t.clase}</span> },
        { header: 'Descuento', render: (t) => `${Number(t.descuento)}%` },
        { header: 'Descripción', render: (t) => t.descripcion || '—' },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre', tipo: 'text', requerido: true, placeholder: 'Ej: Promo básica' },
        {
          name: 'clase',
          label: 'Clase',
          tipo: 'select',
          requerido: true,
          options: Object.values(ClaseTarifa).map((c) => ({ value: c, label: c })),
        },
        { name: 'descripcion', label: 'Descripción', tipo: 'text' },
        { name: 'descuento', label: 'Descuento (%)', tipo: 'number', requerido: true, step: '0.01', placeholder: 'Ej: 15' },
      ]}
      aInput={(v) => {
        const descuento = Number(v.descuento);
        if (Number.isNaN(descuento) || descuento < 0) return 'El descuento debe ser un número válido';
        return {
          nombre: String(v.nombre).trim(),
          clase: String(v.clase) as ClaseTarifa,
          descripcion: String(v.descripcion).trim(),
          descuento,
        };
      }}
    />
  );
}
