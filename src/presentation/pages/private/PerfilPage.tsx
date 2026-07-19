import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { ProximosViajes } from '../../components/ProximosViajes';
import { formatFechaCorta } from '../../utils/formatters';

export function PerfilPage() {
  const { user, isStaff } = useAuthStore();
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([]);

  useEffect(() => {
    let cancelado = false;
    useCaseFactory.pasajeros
      .getAll()
      .then((data) => {
        if (!cancelado) setPasajeros(data);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const miPerfilPasajero = useMemo(
    () => pasajeros.find((p) => p.usuario === user?.id) ?? null,
    [pasajeros, user],
  );

  return (
    <div>
      <h1 className="text-3xl font-black">
        Mi <span className="text-primary">perfil</span>
      </h1>

      <section className="mt-8 max-w-2xl rounded-2xl border border-dark-border bg-dark-surface p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-dark to-primary text-2xl font-black">
            {(user?.username ?? '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.username}</h2>
            <p className="text-sm text-gray-400">{user?.email || 'Sin email registrado'}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-dark-border pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">Rol</dt>
            <dd className="mt-1 font-semibold">{isStaff ? 'Staff / Administrador' : 'Cliente'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">ID de usuario</dt>
            <dd className="mt-1 font-mono">#{user?.id}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 max-w-2xl rounded-2xl border border-dark-border bg-dark-surface p-8">
        <h2 className="text-lg font-bold">Perfil de pasajero</h2>
        {miPerfilPasajero ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">Nombre</dt>
              <dd className="mt-1">{miPerfilPasajero.nombre_completo || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">Pasaporte</dt>
              <dd className="mt-1 font-mono">{miPerfilPasajero.numero_pasaporte}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">Nacionalidad</dt>
              <dd className="mt-1">{miPerfilPasajero.nacionalidad}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">Nacimiento</dt>
              <dd className="mt-1">{formatFechaCorta(miPerfilPasajero.fecha_nacimiento)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-gray-400">
            Aún no tienes un perfil de pasajero.{' '}
            <Link to="/pasajeros" className="font-semibold text-primary-light hover:underline">
              Créalo aquí
            </Link>{' '}
            para poder reservar vuelos.
          </p>
        )}
      </section>

      <ProximosViajes />
    </div>
  );
}
