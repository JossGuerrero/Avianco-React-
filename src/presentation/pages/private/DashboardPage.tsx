import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { PageHero } from '../../components/PageHero';
import { StatCard } from '../../components/StatCard';
import { PlaneIcon } from '../../components/PlaneIcon';
import { Button } from '../../components/Button';
import { ImagenConFallback } from '../../components/ImagenConFallback';
import { AVIATION_IMAGES, fallbackDeImagen } from '../../utils/aviationImages';

interface AccesoRapido {
  to: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  soloStaff?: boolean;
  paso?: number;
}

const ACCESOS_STAFF: AccesoRapido[] = [
  {
    to: '/vuelos',
    titulo: 'Planificador de vuelos',
    descripcion: 'Consulta, filtra y gestiona la programación de vuelos del día.',
    imagen: AVIATION_IMAGES.vuelos,
  },
  {
    to: '/aeropuertos',
    titulo: 'Aeropuertos',
    descripcion: 'Inventario de aeropuertos, códigos IATA y ubicaciones.',
    imagen: AVIATION_IMAGES.aeropuertos,
  },
  {
    to: '/aeronaves',
    titulo: 'Aeronaves',
    descripcion: 'Flota activa: matrículas, modelos y capacidad.',
    imagen: AVIATION_IMAGES.aeronaves,
  },
  {
    to: '/tripulacion',
    titulo: 'Tripulación',
    descripcion: 'Personal de vuelo, licencias y roles operativos.',
    imagen: AVIATION_IMAGES.tripulacion,
    soloStaff: true,
  },
  {
    to: '/asignaciones',
    titulo: 'Asignaciones',
    descripcion: 'Vincula tripulantes con vuelos programados.',
    imagen: AVIATION_IMAGES.asignaciones,
    soloStaff: true,
  },
  {
    to: '/escalas',
    titulo: 'Escalas',
    descripcion: 'Configura paradas intermedias y rutas multi-destino.',
    imagen: AVIATION_IMAGES.escalas,
    soloStaff: true,
  },
];

const ACCESOS_CLIENTE: AccesoRapido[] = [
  {
    to: '/vuelos',
    titulo: 'Buscar vuelos',
    descripcion: 'Explora destinos, compara horarios y encuentra el vuelo ideal para ti.',
    imagen: AVIATION_IMAGES.clienteVuelos,
    paso: 1,
  },
  {
    to: '/reservas',
    titulo: 'Mis reservas',
    descripcion: 'Revisa tus viajes confirmados, estados y detalles de cada reserva.',
    imagen: AVIATION_IMAGES.clienteReservas,
    paso: 2,
  },
  {
    to: '/pasajeros',
    titulo: 'Pasajeros',
    descripcion: 'Registra y administra los perfiles de quienes viajan contigo.',
    imagen: AVIATION_IMAGES.clientePasajeros,
    paso: 3,
  },
];

const PASOS_CLIENTE = [
  { numero: 1, titulo: 'Elige tu vuelo', texto: 'Busca por origen, destino y fecha.' },
  { numero: 2, titulo: 'Confirma tu reserva', texto: 'Selecciona asiento y completa el pago.' },
  { numero: 3, titulo: '¡Listo para volar!', texto: 'Gestiona pasajeros y haz check-in.' },
];

function IconoVuelo() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function IconoAeropuerto() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function IconoAeronave() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconoTripulacion() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconoReserva() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function IconoPasajero() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

interface TarjetaAccesoProps {
  acceso: AccesoRapido;
  esCliente?: boolean;
}

const VARIANTE_IMAGEN: Record<string, 'vuelos' | 'reservas' | 'pasajeros' | 'default'> = {
  '/vuelos': 'vuelos',
  '/reservas': 'reservas',
  '/pasajeros': 'pasajeros',
};

function TarjetaAcceso({ acceso, esCliente }: TarjetaAccesoProps) {
  const variante = VARIANTE_IMAGEN[acceso.to] ?? 'default';

  return (
    <Link
      to={acceso.to}
      className="group relative overflow-hidden rounded-2xl border border-dark-border bg-dark-surface transition-all duration-500 hover:-translate-y-2 hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/15"
    >
      <div className="relative h-52 overflow-hidden">
        <ImagenConFallback
          src={acceso.imagen}
          fallbackSrc={fallbackDeImagen(acceso.imagen)}
          variante={variante}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-surface via-dark/60 to-dark/10" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="absolute inset-x-0 bottom-0 h-1 scale-x-0 bg-gradient-to-r from-primary-dark via-primary to-primary-light transition-transform duration-500 group-hover:scale-x-100" />
        {esCliente && acceso.paso && (
          <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-primary/90 text-sm font-black text-white shadow-lg backdrop-blur-sm">
            {acceso.paso}
          </span>
        )}
        <span className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/40 p-2 text-primary-light opacity-70 backdrop-blur-sm transition-all duration-500 group-hover:opacity-100">
          <PlaneIcon size="sm" className="rotate-12" />
        </span>
        <h3 className="absolute bottom-4 left-4 text-xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {acceso.titulo}
        </h3>
      </div>
      <div className="border-t border-dark-border/80 bg-dark-surface/90 p-5">
        <p className="text-sm leading-relaxed text-gray-400">{acceso.descripcion}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary-light transition-all group-hover:bg-primary group-hover:text-white">
          {esCliente ? 'Comenzar' : 'Ir al módulo'}
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

async function cargarConLimite<T>(promesa: Promise<T>, limiteMs = 5000): Promise<T | null> {
  try {
    return await Promise.race([
      promesa,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), limiteMs)),
    ]);
  } catch {
    return null;
  }
}

export function DashboardPage() {
  const { user, isStaff } = useAuthStore();
  const nombre = user?.firstName || user?.username || 'viajero';

  const [stats, setStats] = useState({
    vuelos: 0,
    aeropuertos: 0,
    aeronaves: 0,
    tripulacion: 0,
    reservas: 0,
    pasajeros: 0,
  });
  const [cargandoStats, setCargandoStats] = useState(true);

  useEffect(() => {
    let cancelado = false;
    async function cargarStats() {
      try {
        if (isStaff) {
          const [vuelos, aeropuertos, aeronaves, tripulacion] = await Promise.all([
            cargarConLimite(useCaseFactory.vuelos.getAll()),
            cargarConLimite(useCaseFactory.aeropuertos.getAll()),
            cargarConLimite(useCaseFactory.aeronaves.getAll()),
            cargarConLimite(useCaseFactory.tripulacion.getAll()),
          ]);
          if (cancelado) return;
          setStats({
            vuelos: vuelos?.length ?? 0,
            aeropuertos: aeropuertos?.length ?? 0,
            aeronaves: aeronaves?.length ?? 0,
            tripulacion: tripulacion?.length ?? 0,
            reservas: 0,
            pasajeros: 0,
          });
        } else {
          const [vuelos, reservas, pasajeros] = await Promise.all([
            cargarConLimite(useCaseFactory.vuelos.getAll()),
            cargarConLimite(useCaseFactory.reservas.getAll()),
            cargarConLimite(useCaseFactory.pasajeros.getAll()),
          ]);
          if (cancelado) return;
          setStats((prev) => ({
            ...prev,
            vuelos: vuelos?.length ?? 0,
            reservas: reservas?.length ?? 0,
            pasajeros: pasajeros?.length ?? 0,
          }));
        }
      } finally {
        if (!cancelado) setCargandoStats(false);
      }
    }
    cargarStats();
    return () => {
      cancelado = true;
    };
  }, [isStaff]);

  const accesos = (isStaff ? ACCESOS_STAFF : ACCESOS_CLIENTE).filter(
    (a) => !a.soloStaff || isStaff,
  );

  const esCuentaNueva = !isStaff && stats.reservas === 0 && !cargandoStats;

  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-8">
      <PageHero
        titulo={isStaff ? 'Centro de Control Operativo' : `Hola, ${nombre}`}
        destacado={isStaff ? 'Control' : nombre}
        subtitulo={
          isStaff
            ? `${fechaHoy} · Panel de administración de vuelos, inventario y tripulación`
            : esCuentaNueva
              ? `¡Bienvenido a Avianco! Tu cuenta está lista · ${fechaHoy}`
              : `Bienvenido de vuelta · ${fechaHoy}`
        }
        imagen={isStaff ? AVIATION_IMAGES.controlTower : AVIATION_IMAGES.dashboard}
        imagenFallback={fallbackDeImagen(isStaff ? AVIATION_IMAGES.controlTower : AVIATION_IMAGES.dashboard)}
        accion={
          isStaff ? (
            <span className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              Staff / Administrador
            </span>
          ) : (
            <Link to="/vuelos">
              <Button className="shadow-lg shadow-primary/30">Explorar vuelos</Button>
            </Link>
          )
        }
      />

      {isStaff ? (
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
            Indicadores del día
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard etiqueta="Vuelos programados" valor={stats.vuelos} cargando={cargandoStats} icono={<IconoVuelo />} tendencia="En el sistema" />
            <StatCard etiqueta="Aeropuertos" valor={stats.aeropuertos} cargando={cargandoStats} icono={<IconoAeropuerto />} tendencia="Red activa" />
            <StatCard etiqueta="Aeronaves" valor={stats.aeronaves} cargando={cargandoStats} icono={<IconoAeronave />} tendencia="Flota disponible" />
            <StatCard etiqueta="Tripulantes" valor={stats.tripulacion} cargando={cargandoStats} icono={<IconoTripulacion />} tendencia="Personal registrado" />
          </div>
        </section>
      ) : (
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
            Tu resumen
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard etiqueta="Vuelos disponibles" valor={stats.vuelos} cargando={cargandoStats} icono={<IconoVuelo />} tendencia="Listos para reservar" />
            <StatCard etiqueta="Mis reservas" valor={stats.reservas} cargando={cargandoStats} icono={<IconoReserva />} tendencia={stats.reservas === 0 ? 'Aún sin reservas' : 'Reservas activas'} />
            <StatCard etiqueta="Pasajeros" valor={stats.pasajeros} cargando={cargandoStats} icono={<IconoPasajero />} tendencia="Perfiles registrados" />
          </div>
        </section>
      )}

      {!isStaff && esCuentaNueva && (
        <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-dark-surface to-dark-surface p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary-light">
                Primeros pasos
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">Tu primer viaje con Avianco</h2>
              <p className="mt-2 max-w-lg text-sm text-gray-400">
                Sigue estos tres pasos para reservar tu primer vuelo. Es rápido y sencillo.
              </p>
            </div>
            <PlaneIcon size="lg" className="hidden text-primary/20 sm:block animate-float motion-reduce:animate-none" />
          </div>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {PASOS_CLIENTE.map((paso) => (
              <li
                key={paso.numero}
                className="rounded-xl border border-dark-border bg-dark/40 p-4 transition-colors hover:border-primary/30"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-black text-primary-light">
                  {paso.numero}
                </span>
                <p className="mt-3 font-semibold text-white">{paso.titulo}</p>
                <p className="mt-1 text-sm text-gray-400">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {isStaff ? 'Módulos de operaciones' : 'Accesos rápidos'}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {isStaff
                ? 'Gestión de inventario, planificación y tripulación'
                : 'Todo lo que necesitas para planear y disfrutar tu viaje'}
            </p>
          </div>
          {!isStaff && (
            <Link to="/vuelos" className="text-sm font-semibold text-primary-light hover:text-primary">
              Ver todos los vuelos →
            </Link>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {accesos.map((acceso) => (
            <TarjetaAcceso key={acceso.to} acceso={acceso} esCliente={!isStaff} />
          ))}
        </div>
      </section>
    </div>
  );
}
