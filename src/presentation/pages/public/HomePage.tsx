import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
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
import { FlyingPlaneDecor } from '../../components/FlyingPlaneDecor';
import { ImagenConFallback } from '../../components/ImagenConFallback';
import { PlaneIcon } from '../../components/PlaneIcon';
import { useHomePageAnimations } from '../../hooks/useHomePageAnimations';
import { AVIATION_IMAGES, AVIATION_IMAGES_FALLBACK } from '../../utils/aviationImages';
import {
  FILTROS_VACIOS,
  filtrarVuelos,
  type FiltrosVuelo,
} from '../../utils/filtrosVuelo';

const EXPERIENCIAS = [
  {
    titulo: 'Red de aeropuertos',
    descripcion: 'Conectamos ciudades con terminales modernas y operación confiable.',
    imagen: AVIATION_IMAGES.aeropuertos,
    fallback: AVIATION_IMAGES_FALLBACK.aeropuertos,
  },
  {
    titulo: 'Reserva en minutos',
    descripcion: 'Busca, compara y confirma tu vuelo con un proceso simple y seguro.',
    imagen: AVIATION_IMAGES.clienteReservas,
    fallback: AVIATION_IMAGES_FALLBACK.clienteReservas,
  },
  {
    titulo: 'Flota preparada',
    descripcion: 'Aeronaves listas para despegar con estándares de calidad Avianco.',
    imagen: AVIATION_IMAGES.aeronaves,
    fallback: AVIATION_IMAGES_FALLBACK.aeronaves,
  },
] as const;

export function HomePage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const [vuelos, setVuelos] = useState<Vuelo[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vueloDetalle, setVueloDetalle] = useState<Vuelo | null>(null);
  const [filtros, setFiltros] = useState<FiltrosVuelo>(FILTROS_VACIOS);
  const statVuelosRef = useRef<HTMLParagraphElement>(null);
  const statPromosRef = useRef<HTMLParagraphElement>(null);

  const {
    pageRef,
    headerRef,
    heroRef,
    heroBgRef,
    heroPlaneRef,
    heroBadgeRef,
    heroTitleRef,
    heroSubtitleRef,
    heroCtasRef,
    heroStatsRef,
  } = useHomePageAnimations({ listo: !loading });

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

  useEffect(() => {
    if (loading) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const animarContador = (elemento: HTMLParagraphElement | null, valor: number) => {
      if (!elemento) return;
      const estado = { actual: 0 };
      gsap.to(estado, {
        actual: valor,
        duration: 1.4,
        delay: 1.1,
        ease: 'power2.out',
        onUpdate: () => {
          elemento.textContent = String(Math.round(estado.actual));
        },
      });
    };

    animarContador(statVuelosRef.current, vuelos.length);
    animarContador(statPromosRef.current, promociones.length);
  }, [loading, vuelos.length, promociones.length]);

  return (
    <div ref={pageRef} className="min-h-screen bg-dark text-white">
      <header
        ref={headerRef}
        className="sticky top-0 z-20 border-b border-dark-border/80 bg-dark/90 backdrop-blur-md"
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 transition-transform duration-200 group-hover:scale-105">
              <PlaneIcon size="md" className="text-white" />
            </span>
            <span className="text-2xl font-black tracking-tight">
              <span className="text-primary">AVIAN</span>CO
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {token ? (
              <Link
                to="/dashboard"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold shadow-md shadow-primary/20 transition-all duration-200 hover:bg-primary-dark"
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
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold shadow-md shadow-primary/20 transition-all duration-200 hover:bg-primary-dark"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <section ref={heroRef} className="relative overflow-hidden">
        <div ref={heroBgRef} className="absolute inset-0 will-change-transform">
          <ImagenConFallback
            src={AVIATION_IMAGES.clienteVuelos}
            fallbackSrc={AVIATION_IMAGES_FALLBACK.clienteVuelos}
            variante="vuelos"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/90 to-dark/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/20 to-dark/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(211,47,47,0.2),transparent_55%)]" />
        <FlyingPlaneDecor />

        <div
          ref={heroPlaneRef}
          className="pointer-events-none absolute left-0 top-0 z-10 motion-reduce:hidden"
          aria-hidden="true"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/30 shadow-xl shadow-primary/40 backdrop-blur-sm sm:h-20 sm:w-20">
            <PlaneIcon size="lg" className="rotate-90 text-white sm:scale-125" />
          </div>
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-10 pt-12 text-center sm:pb-12 sm:pt-16">
          <span
            ref={heroBadgeRef}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-light backdrop-blur-sm"
          >
            <PlaneIcon size="sm" />
            Experiencia de vuelo Avianco
          </span>
          <h1
            ref={heroTitleRef}
            className="max-w-4xl text-4xl font-black leading-tight sm:text-6xl lg:text-7xl"
          >
            Vuela alto con <span className="text-primary">Avianco</span>
          </h1>
          <p
            ref={heroSubtitleRef}
            className="mx-auto mt-5 max-w-2xl text-base text-gray-200 sm:text-lg"
          >
            Encuentra vuelos programados, promociones exclusivas y reserva en minutos. Tu próximo
            destino está a un clic de despegar.
          </p>
          <div ref={heroCtasRef} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#vuelos"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold shadow-lg shadow-primary/30 transition-all duration-200 hover:bg-primary-dark hover:shadow-primary/40"
            >
              Explorar vuelos
            </a>
            {!token && (
              <Link
                to="/register"
                className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold backdrop-blur-sm transition-all duration-200 hover:border-white/40 hover:bg-white/15"
              >
                Crear cuenta gratis
              </Link>
            )}
          </div>

          <div
            ref={heroStatsRef}
            className="mt-8 grid w-full max-w-3xl grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-dark/55 p-4 backdrop-blur-md sm:gap-6 sm:p-5"
          >
            <div>
              <p ref={statVuelosRef} className="text-2xl font-black text-white sm:text-3xl">
                {loading ? '0' : vuelos.length}
              </p>
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">Vuelos disponibles</p>
            </div>
            <div className="border-x border-white/10 px-2">
              <p ref={statPromosRef} className="text-2xl font-black text-white sm:text-3xl">
                {loading ? '0' : promociones.length}
              </p>
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">Promociones activas</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white sm:text-3xl">24/7</p>
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">Reservas en línea</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:pb-8 sm:pt-8">
        <div className="home-animate text-center">
          <p className="home-animate-item text-sm font-bold uppercase tracking-widest text-primary-light">
            Experiencia completa
          </p>
          <h2 className="home-animate-item mt-2 text-3xl font-black sm:text-4xl">
            ¿Por qué volar con <span className="text-primary">Avianco</span>?
          </h2>
          <p className="home-animate-item mx-auto mt-3 max-w-2xl text-gray-400">
            Operación aérea, reservas y atención al pasajero en una sola plataforma.
          </p>
        </div>

        <div className="home-animate home-experiencias-grid mt-5 grid gap-4 md:grid-cols-3 md:gap-5">
          {EXPERIENCIAS.map((item) => (
            <article
              key={item.titulo}
              className="home-animate-item home-experiencia-card group relative overflow-hidden rounded-2xl border border-dark-border bg-dark-surface shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-primary/10"
            >
              <div className="relative h-36 overflow-hidden sm:h-40">
                <ImagenConFallback
                  src={item.imagen}
                  fallbackSrc={item.fallback}
                  variante="vuelos"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/30 to-transparent" />
                <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/90 text-white shadow-lg">
                  <PlaneIcon size="sm" />
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold text-white">{item.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.descripcion}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 pb-14">
        {promociones.length > 0 && (
          <section className="mt-6 sm:mt-8">
            <div className="home-animate flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="home-animate-item text-sm font-bold uppercase tracking-widest text-primary-light">
                  Ahorra en tu viaje
                </p>
                <h2 className="home-animate-item mt-1 text-2xl font-bold sm:text-3xl">
                  Promociones <span className="text-primary">activas</span>
                </h2>
              </div>
              <span className="home-animate-item rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-light">
                {promociones.length} disponible{promociones.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="home-animate mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {promociones.map((promo) => (
                <div key={promo.id} className="home-animate-item">
                  <PromocionCard promocion={promo} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="vuelos" className={promociones.length > 0 ? 'mt-10' : 'mt-6'}>
          <div className="home-animate">
            <div className="home-animate-item relative overflow-hidden rounded-3xl border border-dark-border bg-dark-surface p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-primary-dark/20 blur-3xl" />

            <div className="relative">
              <p className="text-sm font-bold uppercase tracking-widest text-primary-light">
                Planifica tu viaje
              </p>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                Vuelos <span className="text-primary">programados</span>
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">
                Filtra por origen, destino o fecha y reserva el vuelo que mejor se adapte a tu
                itinerario.
              </p>

              <div className="mt-6">
                <VueloSearchBar
                  opcionesAeropuertos={opcionesAeropuertos}
                  filtros={filtros}
                  onChange={setFiltros}
                  cargandoOpciones={loading}
                />
              </div>
            </div>
            </div>
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

          <div className="home-animate mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="home-animate-item">
                    <SkeletonCard />
                  </div>
                ))
              : vuelosFiltrados.map((vuelo) => (
                  <div key={vuelo.id} className="home-animate-item">
                    <VueloCard
                      vuelo={vuelo}
                      onClick={() => setVueloDetalle(vuelo)}
                      onReservar={
                        vuelo.estado === EstadoVuelo.Programado
                          ? () => navigate(token ? `/checkout/${vuelo.id}` : '/login')
                          : undefined
                      }
                    />
                  </div>
                ))}
          </div>
        </section>
      </main>

      <section className="relative mx-4 mb-16 overflow-hidden rounded-3xl border border-dark-border sm:mx-auto sm:max-w-6xl">
        <ImagenConFallback
          src={AVIATION_IMAGES.controlTower}
          fallbackSrc={AVIATION_IMAGES_FALLBACK.controlTower}
          variante="default"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/85 to-dark/50" />
        <div className="home-animate relative flex flex-col items-start gap-4 px-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-14">
          <div className="max-w-xl">
            <p className="home-animate-item text-sm font-bold uppercase tracking-widest text-primary-light">
              Listo para despegar
            </p>
            <h2 className="home-animate-item mt-2 text-2xl font-black sm:text-3xl">
              Tu próximo destino te espera
            </h2>
            <p className="home-animate-item mt-2 text-sm text-gray-300 sm:text-base">
              Únete a Avianco y gestiona reservas, vuelos y promociones desde un solo lugar.
            </p>
          </div>
          {!token ? (
            <Link
              to="/register"
              className="home-animate-item shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-bold shadow-lg shadow-primary/30 transition-all duration-200 hover:bg-primary-dark"
            >
              Comenzar ahora
            </Link>
          ) : (
            <Link
              to="/dashboard"
              className="home-animate-item shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-bold shadow-lg shadow-primary/30 transition-all duration-200 hover:bg-primary-dark"
            >
              Ir a mi panel
            </Link>
          )}
        </div>
      </section>

      <footer className="border-t border-dark-border bg-dark-surface/50">
        <div className="home-animate mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <div className="home-animate-item flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary-light">
              <PlaneIcon size="sm" />
            </span>
            <p className="text-sm font-semibold text-gray-300">
              Avianco © {new Date().getFullYear()}
            </p>
          </div>
          <p className="home-animate-item text-center text-sm text-gray-500">
            Sistema de gestión aérea — Vuelos, reservas y operaciones
          </p>
        </div>
      </footer>

      <VueloDetalleModal vuelo={vueloDetalle} onClose={() => setVueloDetalle(null)} />
    </div>
  );
}
