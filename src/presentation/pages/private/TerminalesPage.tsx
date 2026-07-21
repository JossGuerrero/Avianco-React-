import { useMemo } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { labelAeropuerto } from '../../utils/labels';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function TerminalesPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  const aeropuertos = useLista(useCaseFactory.aeropuertos);
  const aeropuertosPorId = useMemo(
    () => new Map(aeropuertos.map((a) => [a.id, a])),
    [aeropuertos],
  );

  return (
    <CrudPage
      titulo="Terminales"
      destacado="Terminales"
      descripcion="Infraestructura aeroportuaria: terminales por aeropuerto"
      imagenHero={AVIATION_IMAGES.terminales}
      nombreEntidad="terminal"
      useCases={useCaseFactory.terminales}
      puedeMutar={isStaff}
      columns={[
        { header: 'Nombre', render: (t) => t.nombre },
        {
          header: 'Aeropuerto',
          render: (t) => {
            const aeropuerto = aeropuertosPorId.get(t.aeropuerto);
            return aeropuerto ? labelAeropuerto(aeropuerto) : `#${t.aeropuerto}`;
          },
        },
        { header: 'Descripción', render: (t) => t.descripcion || '—' },
      ]}
      campos={[
        {
          name: 'aeropuerto',
          label: 'Aeropuerto',
          tipo: 'select',
          requerido: true,
          placeholder: 'Selecciona un aeropuerto',
          options: aeropuertos.map((a) => ({ value: String(a.id), label: labelAeropuerto(a) })),
        },
        { name: 'nombre', label: 'Nombre', tipo: 'text', requerido: true, placeholder: 'Ej: Terminal 1' },
        { name: 'descripcion', label: 'Descripción', tipo: 'text' },
      ]}
      aInput={(v) => ({
        aeropuerto: Number(v.aeropuerto),
        nombre: String(v.nombre).trim(),
        descripcion: String(v.descripcion).trim(),
      })}
    />
  );
}
