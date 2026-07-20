import { CrudPage } from '../../components/CrudPage';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function TiposAvionPage() {
  const isStaff = useAuthStore((state) => state.isStaff);

  return (
    <CrudPage
      titulo="Tipos de avión"
      destacado="avión"
      descripcion="Catálogo de modelos: fabricante, autonomía y especificaciones técnicas"
      imagenHero={AVIATION_IMAGES.tiposAvion}
      nombreEntidad="tipo de avión"
      useCases={useCaseFactory.tiposAvion}
      puedeMutar={isStaff}
      columns={[
        { header: 'Nombre', render: (t) => t.nombre },
        { header: 'Fabricante', render: (t) => t.fabricante },
        { header: 'Autonomía', render: (t) => `${t.autonomia_km} km` },
        { header: 'Descripción', render: (t) => t.descripcion || '—' },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre', tipo: 'text', requerido: true, placeholder: 'Ej: A320neo' },
        { name: 'fabricante', label: 'Fabricante', tipo: 'text', requerido: true, placeholder: 'Ej: Airbus' },
        { name: 'autonomia_km', label: 'Autonomía (km)', tipo: 'number', requerido: true, placeholder: 'Ej: 6300' },
        { name: 'descripcion', label: 'Descripción', tipo: 'text' },
      ]}
      aInput={(v) => {
        const autonomia = Number(v.autonomia_km);
        if (Number.isNaN(autonomia) || autonomia <= 0) return 'La autonomía debe ser un número positivo';
        return {
          nombre: String(v.nombre).trim(),
          fabricante: String(v.fabricante).trim(),
          autonomia_km: autonomia,
          descripcion: String(v.descripcion).trim(),
        };
      }}
    />
  );
}
