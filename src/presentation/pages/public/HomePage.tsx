import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Vuelo } from '../../../domain/entities/Vuelo';
import type { Promocion } from '../../../domain/entities/Promocion';
import { EstadoVuelo } from '../../../domain/enums/EstadoVuelo';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { VueloCard } from '../../components/VueloCard';
import { VueloDetalleModal } from '../../components/VueloDetalleModal';
import { PromocionCard } from '../../components/PromocionCard';
import { SkeletonCard } from '../../components/Skeleton';
import { VueloSearchBar } from '../../components/VueloSearchBar';
import {
  FILTROS_VACIOS,
  filtrarVuelos,
  type FiltrosVuelo,
} from '../../utils/filtrosVuelo';

export function HomePage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const [vuelos, setVuelos] = useState<Vuelo[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vueloDetalle, setVueloDetalle] = useState<Vuelo | null>(null);
  const [filtros, setFiltros] = useState<FiltrosVuelo>(FILTROS_VACIOS);

  // El GET público de /aeropuertos/ requiere token, así que las opciones del
  // buscador se derivan de los vuelos ya cargados (traen *_detalle anidado).
  const opcionesAeropuertos = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const vuelo of vuelos) {
      if (vuelo.origen_detalle) {
        mapa.set(vuelo.origen, `${vuelo.origen_detalle.codigo_iata} · ${vuelo.origen_detalle.ciudad}`);
      }
      if (vuelo.destino_detalle) {
        mapa.set(vuelo.destino, `${vuelo.destino_detalle.codigo_iata} · ${vuelo.destino_detalle.ciudad}`);
      }
    }
    return [...mapa.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, label]) => ({ value: String(id), label }));
  }, [vuelos]);

  const vuelosFiltrados = useMemo(() => filtrarVuelos(vuelos, filtros), [vuelos, filtros]);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const [vuelosData, promosData] = await Promise.all([
          useCaseFactory.getVuelosUseCase.execute(EstadoVuelo.Programado),
          useCaseFactory.getPromocionesUseCase.execute(true).catch(() => [] as Promocion[]),
        ]);
        if (!cancelado) {
          setVuelos(vuelosData);
          setPromociones(promosData);
        }
      } catch {
        if (!cancelado) setError('No se pudieron cargar los vuelos. Intenta de nuevo más tarde.');
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-dark text-white">
      <header className="sticky top-0 z-10 border-b border-dark-border bg-dark/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-2xl font-black tracking-tight">
            <span className="text-primary">AVIAN</span>CO
          </Link>
          <div className="flex items-center gap-3">
            {token ? (
              <Link
                to="/dashboard"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold transition-all duration-200 hover:bg-primary-dark"
              >
                Mi panel
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-300 transition-all duration-200 hover:text-white"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold transition-all duration-200 hover:bg-primary-dark"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <section className="bg-gradient-to-br from-dark via-dark to-primary-dark/60">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-20">
          <h1 className="text-4xl font-black sm:text-6xl">
            Vuela alto con <span className="text-primary">Avianco</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-gray-300">
            Encuentra los mejores vuelos y promociones. Reserva en minutos y despega hacia tu
            próximo destino.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        {promociones.length > 0 && (
          <section className="mt-12 animate-fade-in">
            <h2 className="text-2xl font-bold">
              Promociones <span className="text-primary">activas</span>
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {promociones.map((promo) => (
                <PromocionCard key={promo.id} promocion={promo} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            Vuelos <span className="text-primary">programados</span>
          </h2>

          <div className="mt-6">
            <VueloSearchBar
              opcionesAeropuertos={opcionesAeropuertos}
              filtros={filtros}
              onChange={setFiltros}
              cargandoOpciones={loading}
            />
          </div>

          {error && (
            <p className="mt-6 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light">
              {error}
            </p>
          )}

          {!loading && !error && vuelos.length === 0 && (
            <p className="mt-6 text-gray-400">No hay vuelos programados por el momento.</p>
          )}

          {!loading && !error && vuelos.length > 0 && vuelosFiltrados.length === 0 && (
            <div className="mt-6 rounded-xl border border-dark-border bg-dark-surface p-6 text-center">
              <p className="text-gray-300">
                No encontramos vuelos con esos filtros de origen, destino o fecha.
              </p>
              <button
                onClick={() => setFiltros(FILTROS_VACIOS)}
                className="mt-2 text-sm font-semibold text-primary-light hover:underline"
              >
                Limpiar filtros y ver todos los vuelos
              </button>
            </div>
          )}

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
              : vuelosFiltrados.map((vuelo) => (
                  <VueloCard
                    key={vuelo.id}
                    vuelo={vuelo}
                    onClick={() => setVueloDetalle(vuelo)}
                    onReservar={
                      vuelo.estado === EstadoVuelo.Programado
                        ? () => navigate(token ? `/checkout/${vuelo.id}` : '/login')
                        : undefined
                    }
                  />
                ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-dark-border py-6 text-center text-sm text-gray-500">
        Avianco © {new Date().getFullYear()} — Sistema de gestión aérea
      </footer>

      <VueloDetalleModal vuelo={vueloDetalle} onClose={() => setVueloDetalle(null)} />
    </div>
  );
}
