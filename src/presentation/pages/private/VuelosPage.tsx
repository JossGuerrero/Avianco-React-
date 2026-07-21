import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Vuelo } from '../../../domain/entities/Vuelo';
import type { Reserva } from '../../../domain/entities/Reserva';
import { EstadoReserva } from '../../../domain/enums/EstadoReserva';
import { EstadoVuelo } from '../../../domain/enums/EstadoVuelo';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { VueloCard } from '../../components/VueloCard';
import { VueloDetalleModal } from '../../components/VueloDetalleModal';
import { SkeletonCard } from '../../components/Skeleton';
import { VueloSearchBar } from '../../components/VueloSearchBar';
import {
  FILTROS_VACIOS,
  filtrarVuelos,
  hayFiltrosActivos,
  type FiltrosVuelo,
} from '../../utils/filtrosVuelo';
import { getErrorMessage } from '../../utils/formatters';
import { useLista } from '../../utils/useLista';
import { PageHero } from '../../components/PageHero';
import { AVIATION_IMAGES, fallbackDeImagen } from '../../utils/aviationImages';

export function VuelosPage() {
  const navigate = useNavigate();
  const isStaff = useAuthStore((state) => state.isStaff);

  const [vuelos, setVuelos] = useState<Vuelo[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vueloDetalle, setVueloDetalle] = useState<Vuelo | null>(null);
  const [filtros, setFiltros] = useState<FiltrosVuelo>(FILTROS_VACIOS);

  const aeropuertos = useLista(useCaseFactory.aeropuertos);
  const opcionesAeropuertos = useMemo(
    () =>
      [...aeropuertos]
        .sort((a, b) => a.codigo_iata.localeCompare(b.codigo_iata))
        .map((a) => ({ value: String(a.id), label: `${a.codigo_iata} · ${a.ciudad}` })),
    [aeropuertos],
  );

  const cargar = useCallback(
    async (pagina: number) => {
      setLoading(true);
      setError(null);
      try {
        const resultado = await useCaseFactory.vuelos.getPage({
          page: pagina,
          ...(filtros.origen ? { origen: Number(filtros.origen) } : {}),
          ...(filtros.destino ? { destino: Number(filtros.destino) } : {}),
        });
        setVuelos(resultado.items);
        setHasNext(resultado.hasNext);
        setHasPrevious(resultado.hasPrevious);
        setCount(resultado.count);
      } catch (e) {
        setError(getErrorMessage(e, 'No se pudieron cargar los vuelos'));
      } finally {
        setLoading(false);
      }
    },
    [filtros],
  );

  useEffect(() => {
    cargar(page);
  }, [cargar, page]);

  function aplicarFiltros(nuevos: FiltrosVuelo) {
    setFiltros(nuevos);
    setPage(1);
  }

  const vuelosFiltrados = useMemo(() => filtrarVuelos(vuelos, filtros), [vuelos, filtros]);

  useEffect(() => {
    if (!isStaff) return;
    useCaseFactory.reservas
      .getAll()
      .then(setReservas)
      .catch(() => {
      });
  }, [isStaff]);

  const confirmadasPorVuelo = useMemo(() => {
    const conteo = new Map<number, number>();
    for (const reserva of reservas) {
      if (reserva.estado !== EstadoReserva.Confirmada) continue;
      conteo.set(reserva.vuelo, (conteo.get(reserva.vuelo) ?? 0) + 1);
    }
    return conteo;
  }, [reservas]);

  function actualizarVuelo(actualizado: Vuelo) {
    setVuelos((previos) =>
      previos.map((v) => (v.id === actualizado.id ? { ...v, ...actualizado } : v)),
    );
    setVueloDetalle((previo) =>
      previo && previo.id === actualizado.id ? { ...previo, ...actualizado } : previo,
    );
  }

  return (
    <div className="space-y-8">
      <PageHero
        titulo="Planificador de vuelos"
        destacado="vuelos"
        subtitulo={
          isStaff
            ? 'Gestiona la programación, consulta ocupación y cambia estados operativos'
            : 'Encuentra y reserva el vuelo perfecto para tu próximo destino'
        }
        imagen={AVIATION_IMAGES.vuelos}
        imagenFallback={fallbackDeImagen(AVIATION_IMAGES.vuelos)}
        accion={
          count > 0 ? (
            <span className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              {count} vuelos en total
            </span>
          ) : undefined
        }
        compacto
      />

      <VueloSearchBar
          opcionesAeropuertos={opcionesAeropuertos}
          filtros={filtros}
          onChange={aplicarFiltros}
          cargandoOpciones={aeropuertos.length === 0 && loading}
      />

      {error && (
        <p className="mt-6 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light">
          {error}
        </p>
      )}

      {!loading && !error && vuelosFiltrados.length === 0 && (
        hayFiltrosActivos(filtros) ? (
          <div className="rounded-2xl border border-dark-border bg-dark-surface p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="mt-4 text-gray-300">
              No encontramos vuelos con esos filtros de origen, destino o fecha.
            </p>
            <button
              onClick={() => aplicarFiltros(FILTROS_VACIOS)}
              className="mt-2 text-sm font-semibold text-primary-light hover:underline"
            >
              Limpiar filtros y ver todos los vuelos
            </button>
          </div>
        ) : (
          <p className="mt-6 text-gray-400">No hay vuelos registrados.</p>
        )
      )}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
          : vuelosFiltrados.map((vuelo) => (
              <VueloCard
                key={vuelo.id}
                vuelo={vuelo}
                onClick={() => setVueloDetalle(vuelo)}
                onReservar={
                  vuelo.estado === EstadoVuelo.Programado
                    ? () => navigate(`/checkout/${vuelo.id}`)
                    : undefined
                }
                ocupacion={
                  isStaff && vuelo.aeronave_detalle
                    ? {
                        confirmadas: confirmadasPorVuelo.get(vuelo.id) ?? 0,
                        capacidad: vuelo.aeronave_detalle.capacidad,
                      }
                    : undefined
                }
              />
            ))}
      </div>

      {!loading && (hasNext || hasPrevious) && (
        <div className="mt-8 flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={!hasPrevious}
            className="rounded-lg border border-dark-border px-4 py-2 text-gray-300 transition-all duration-200 hover:border-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-gray-400">Página {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext}
            className="rounded-lg border border-dark-border px-4 py-2 text-gray-300 transition-all duration-200 hover:border-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}

      <VueloDetalleModal
        vuelo={vueloDetalle}
        onClose={() => setVueloDetalle(null)}
        onVueloActualizado={actualizarVuelo}
      />
    </div>
  );
}
