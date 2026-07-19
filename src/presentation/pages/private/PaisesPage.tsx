import { CrudPage } from '../../components/CrudPage';
import { BanderaPais } from '../../components/BanderaPais';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { AVIATION_IMAGES } from '../../utils/aviationImages';
import { urlBandera } from '../../utils/banderas';

export function PaisesPage() {
  const isStaff = useAuthStore((state) => state.isStaff);

  return (
    <CrudPage
      titulo="Países"
      destacado="Países"
      descripcion="Catálogo geográfico con códigos ISO y banderas para la red de vuelos"
      imagenHero={AVIATION_IMAGES.paises}
      nombreEntidad="país"
      useCases={useCaseFactory.paises}
      puedeMutar={isStaff}
      columns={[
        {
          header: 'Bandera',
          render: (p) => <BanderaPais codigo={p.codigo} bandera={p.bandera} nombre={p.nombre} />,
        },
        { header: 'Nombre', render: (p) => p.nombre },
        { header: 'Código', render: (p) => <span className="font-mono">{p.codigo}</span> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre', tipo: 'text', requerido: true, placeholder: 'Ej: Colombia' },
        { name: 'codigo', label: 'Código', tipo: 'text', requerido: true, placeholder: 'Ej: CO', maxLength: 3 },
        { name: 'bandera', label: 'Bandera (URL)', tipo: 'url', placeholder: 'Opcional — se genera desde el código ISO' },
      ]}
      aInput={(v) => {
        const codigo = String(v.codigo).trim().toUpperCase();
        const banderaManual = String(v.bandera).trim();
        return {
          nombre: String(v.nombre).trim(),
          codigo,
          bandera: banderaManual || urlBandera(codigo),
        };
      }}
    />
  );
}
