import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Reserva } from '../../domain/entities/Reserva';
import type { Vuelo } from '../../domain/entities/Vuelo';
import type { CheckIn } from '../../domain/entities/CheckIn';
import type { Factura } from '../../domain/entities/Factura';
import type { Puerta } from '../../domain/entities/Puerta';
import { EstadoReserva } from '../../domain/enums/EstadoReserva';
import { EstadoVuelo } from '../../domain/enums/EstadoVuelo';
import { useCaseFactory } from '../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../store/authStore';
import { Badge } from './Badge';
import { Skeleton } from './Skeleton';
import { formatFecha, formatPrecio } from '../utils/formatters';

interface Viaje {
  reserva: Reserva;
  vuelo: Vuelo;
  checkin: CheckIn | null;
  factura: Factura | null;
  puertaCodigo: string | null;
}

export function ProximosViajes() {
  const user = useAuthStore((state) => state.user);
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      if (!user) return;
      setCargando(true);
      setError(null);
      try {
        const [pasajeros, reservas, vuelos, checkins, facturas, puertas] = await Promise.all([
          useCaseFactory.pasajeros.getAll(),
          useCaseFactory.reservas.getAll(),
          useCaseFactory.getVuelosUseCase.execute().catch(() => [] as Vuelo[]),
          useCaseFactory.checkins.getAll().catch(() => [] as CheckIn[]),
          useCaseFactory.facturas.getAll().catch(() => [] as Factura[]),
          useCaseFactory.puertas.getAll().catch(() => [] as Puerta[]),
        ]);

        const misPasajeros = new Set(
          pasajeros.filter((p) => p.usuario === user.id).map((p) => p.id),
        );
        const misReservas = reservas.filter(
          (r) => misPasajeros.has(r.pasajero) && r.estado !== EstadoReserva.Cancelada,
        );

        const vuelosPorId = new Map(vuelos.map((v) => [v.id, v]));
        const faltantes = [...new Set(misReservas.map((r) => r.vuelo))].filter(
          (id) => !vuelosPorId.has(id),
        );
        const extra = await Promise.all(
          faltantes.map((id) => useCaseFactory.vuelos.getById(id).catch(() => null)),
        );
        for (const vuelo of extra) {
          if (vuelo) vuelosPorId.set(vuelo.id, vuelo);
        }

        const checkinPorReserva = new Map(checkins.map((c) => [c.reserva, c]));
        const facturaPorReserva = new Map(facturas.map((f) => [f.reserva, f]));
        const puertasPorId = new Map(puertas.map((p) => [p.id, p]));

        const ahora = Date.now();
        const proximos: Viaje[] = [];
        for (const reserva of misReservas) {
          const vuelo = vuelosPorId.get(reserva.vuelo);
          if (!vuelo || vuelo.estado === EstadoVuelo.Cancelado) continue;
          const salida = new Date(vuelo.fecha_salida).getTime();
          const esProximo =
            vuelo.estado === EstadoVuelo.Abordando || Number.isNaN(salida) || salida > ahora;
          if (!esProximo) continue;
          const checkin = checkinPorReserva.get(reserva.id) ?? null;
          proximos.push({
            reserva,
            vuelo,
            checkin,
            factura: facturaPorReserva.get(reserva.id) ?? null,
            puertaCodigo:
              checkin?.puerta != null
                ? (puertasPorId.get(checkin.puerta)?.codigo ?? `#${checkin.puerta}`)
                : null,
          });
        }
        proximos.sort(
          (a, b) =>
            new Date(a.vuelo.fecha_salida).getTime() - new Date(b.vuelo.fecha_salida).getTime(),
        );

        if (!cancelado) setViajes(proximos);
      } catch {
        if (!cancelado) setError('No se pudieron cargar tus próximos viajes.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [user]);

  return (
    <section className="mt-6 max-w-2xl">
      <h2 className="text-lg font-bold">
        Mis próximos <span className="text-primary">viajes</span>
      </h2>

      {cargando && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {!cargando && error && (
        <p className="mt-4 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light">
          {error}
        </p>
      )}

      {!cargando && !error && viajes.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dark-border bg-dark-surface p-6 text-sm text-gray-400">
          No tienes viajes próximos.{' '}
          <Link to="/vuelos" className="font-semibold text-primary-light hover:underline">
            Busca tu próximo vuelo
          </Link>
          .
        </div>
      )}

      <div className="mt-4 space-y-4">
        {viajes.map(({ reserva, vuelo, checkin, factura, puertaCodigo }) => (
          <article
            key={reserva.id}
            className="rounded-2xl border border-dark-border bg-dark-surface p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xl font-black text-white">
                {vuelo.origen_detalle?.codigo_iata ?? `#${vuelo.origen}`} →{' '}
                {vuelo.destino_detalle?.codigo_iata ?? `#${vuelo.destino}`}
              </p>
              <Badge estado={vuelo.estado} />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Sale {formatFecha(vuelo.fecha_salida)} · Llega {formatFecha(vuelo.fecha_llegada)}
            </p>

            <dl className="mt-4 grid gap-3 border-t border-dark-border pt-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-400">Reserva</dt>
                <dd className="mt-1 font-semibold text-white">
                  #{reserva.id} · asiento <span className="font-mono">{reserva.asiento}</span>
                </dd>
                <dd className="mt-1">
                  <Badge estado={reserva.estado} />
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-400">Check-in</dt>
                {checkin ? (
                  <>
                    <dd className="mt-1">
                      <Badge estado={checkin.estado} />
                    </dd>
                    <dd className="mt-1 text-xs text-gray-400">
                      {puertaCodigo ? `Puerta ${puertaCodigo}` : 'Puerta por asignar'}
                    </dd>
                  </>
                ) : (
                  <dd className="mt-1 text-xs text-gray-400">
                    Pendiente —{' '}
                    <Link to="/reservas" className="font-semibold text-primary-light hover:underline">
                      hazlo en Mis reservas
                    </Link>
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-400">Factura</dt>
                {factura ? (
                  <>
                    <dd className="mt-1 font-semibold text-white">
                      {formatPrecio(factura.total)}
                    </dd>
                    <dd className="mt-1">
                      <Badge estado={factura.estado} />
                    </dd>
                  </>
                ) : (
                  <dd className="mt-1 text-xs text-gray-400">Sin factura asociada</dd>
                )}
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
