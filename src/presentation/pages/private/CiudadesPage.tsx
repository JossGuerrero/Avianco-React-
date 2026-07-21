import { useMemo } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function CiudadesPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  const paises = useLista(useCaseFactory.paises);
  const paisesPorId = useMemo(() => new Map(paises.map((p) => [p.id, p])), [paises]);

  return (
    <CrudPage
      titulo="Ciudades"
      destacado="Ciudades"
      descripcion="Destinos y ciudades de operación vinculadas a cada país"
      imagenHero={AVIATION_IMAGES.ciudades}
      nombreEntidad="ciudad"
      useCases={useCaseFactory.ciudades}
      puedeMutar={isStaff}
      columns={[
        { header: 'Nombre', render: (c) => c.nombre },
        { header: 'País', render: (c) => paisesPorId.get(c.pais)?.nombre ?? `#${c.pais}` },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre', tipo: 'text', requerido: true, placeholder: 'Ej: Medellín' },
        {
          name: 'pais',
          label: 'País',
          tipo: 'select',
          requerido: true,
          placeholder: 'Selecciona un país',
          options: paises.map((p) => ({ value: String(p.id), label: p.nombre })),
        },
      ]}
      aInput={(v) => ({
        nombre: String(v.nombre).trim(),
        pais: Number(v.pais),
      })}
    />
  );
}
