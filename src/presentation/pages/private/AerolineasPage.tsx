import { CrudPage } from '../../components/CrudPage';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { PAISES } from '../../utils/paises';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function AerolineasPage() {
  const isStaff = useAuthStore((state) => state.isStaff);

  return (
    <CrudPage
      titulo="Aerolíneas"
      destacado="Aerolíneas"
      descripcion="Catálogo de aerolíneas operadoras: códigos, países y sitios web"
      imagenHero={AVIATION_IMAGES.aerolineas}
      nombreEntidad="aerolínea"
      useCases={useCaseFactory.aerolineas}
      puedeMutar={isStaff}
      columns={[
        {
          header: 'Código',
          render: (a) => (
            <span className="rounded bg-primary/15 px-2 py-0.5 font-mono font-bold text-primary-light">
              {a.codigo}
            </span>
          ),
        },
        { header: 'Nombre', render: (a) => a.nombre },
        { header: 'País', render: (a) => a.pais },
        {
          header: 'Sitio web',
          render: (a) =>
            a.sitio_web ? (
              <a
                href={a.sitio_web}
                target="_blank"
                rel="noreferrer"
                className="text-primary-light hover:underline"
              >
                {a.sitio_web}
              </a>
            ) : (
              '—'
            ),
        },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre', tipo: 'text', requerido: true, placeholder: 'Ej: Avianco Airlines' },
        { name: 'codigo', label: 'Código', tipo: 'text', requerido: true, placeholder: 'Ej: AV', maxLength: 3 },
        { name: 'pais', label: 'País', tipo: 'select', requerido: true, options: PAISES.map((p) => ({ value: p, label: p })) },
        { name: 'sitio_web', label: 'Sitio web', tipo: 'url', placeholder: 'https://...' },
      ]}
      aInput={(v) => ({
        nombre: String(v.nombre).trim(),
        codigo: String(v.codigo).trim().toUpperCase(),
        pais: String(v.pais),
        sitio_web: String(v.sitio_web).trim(),
      })}
    />
  );
}
