import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../utils/formatters';
import type { CheckIn } from '../../../domain/entities/CheckIn';
import type { Reserva } from '../../../domain/entities/Reserva';
import type { Puerta } from '../../../domain/entities/Puerta';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import type { Vuelo } from '../../../domain/entities/Vuelo';

export function CheckInsPage() {
  const { user, isStaff } = useAuthStore();

  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [puertas, setPuertas] = useState<Puerta[]>([]);
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([]);
  const [vuelos, setVuelos] = useState<Vuelo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [checkinsData, reservasData, puertasData, pasajerosData, vuelosData] = await Promise.all([
        useCaseFactory.checkins.getAll(),
        useCaseFactory.reservas.getAll(),
        useCaseFactory.puertas.getAll(),
        useCaseFactory.pasajeros.getAll(),
        useCaseFactory.vuelos.getAll(),
      ]);
      setCheckins(checkinsData);
      setReservas(reservasData);
      setPuertas(puertasData);
      setPasajeros(pasajerosData);
      setVuelos(vuelosData);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los datos de check-in'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Indexadores rápidos
  const reservasPorId = useMemo(() => new Map(reservas.map((r) => [r.id, r])), [reservas]);
  const pasajerosPorId = useMemo(() => new Map(pasajeros.map((p) => [p.id, p])), [pasajeros]);
  const vuelosPorId = useMemo(() => new Map(vuelos.map((v) => [v.id, v])), [vuelos]);
  const puertasPorId = useMemo(() => new Map(puertas.map((p) => [p.id, p])), [puertas]);

  // Filtro de propiedad de datos para Clientes
  const misPasajerosIds = useMemo(() => {
    return new Set(pasajeros.filter((p) => p.usuario === user?.id).map((p) => p.id));
  }, [pasajeros, user]);

  const misReservasIds = useMemo(() => {
    return new Set(reservas.filter((r) => misPasajerosIds.has(r.pasajero)).map((r) => r.id));
  }, [reservas, misPasajerosIds]);

  const checkinsVisibles = useMemo(() => {
    if (isStaff) return checkins;
    return checkins.filter((c) => misReservasIds.has(c.reserva));
  }, [checkins, isStaff, misReservasIds]);

  // Check-ins filtrados por búsqueda (código de tarjeta de embarque, pasajero o ID de reserva)
  const checkinsFiltrados = useMemo(() => {
    return checkinsVisibles.filter((c) => {
      const res = reservasPorId.get(c.reserva);
      const pas = res ? pasajerosPorId.get(res.pasajero) : null;
      const nombrePasajero = pas ? (pas.nombre_completo || pas.numero_pasaporte) : '';
      
      return (
        c.tarjeta_embarque.toLowerCase().includes(busqueda.toLowerCase()) ||
        String(c.reserva).includes(busqueda) ||
        nombrePasajero.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.estado.toLowerCase().includes(busqueda.toLowerCase())
      );
    });
  }, [checkinsVisibles, busqueda, reservasPorId, pasajerosPorId]);

  // Estadísticas para el panel superior
  const stats = useMemo(() => {
    const total = checkinsVisibles.length;
    const confirmados = checkinsVisibles.filter((c) => c.estado.toLowerCase() === 'confirmado' || c.estado.toLowerCase() === 'activo').length;
    const abordando = checkinsVisibles.filter((c) => c.estado.toLowerCase() === 'abordando' || c.estado.toLowerCase() === 'embarque').length;
    const pendientes = checkinsVisibles.filter((c) => c.estado.toLowerCase() === 'pendiente').length;
    
    return {
      total,
      confirmados,
      abordando,
      pendientes,
    };
  }, [checkinsVisibles]);

  return (
    <div className="relative space-y-8 animate-fade-in pb-12 text-left">
      {/* Luces de Fondo Glassmorphic */}
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera Principal */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-primary-light uppercase">Servicios de Embarque</span>
            </div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl text-white tracking-tight">
              Terminal de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Check-in</span>
            </h1>
            <p className="mt-2 text-xs text-gray-400 max-w-xl leading-relaxed">
              {isStaff 
                ? 'Panel de administración general para la emisión de tarjetas de embarque, asignación de puertas y control de check-in.'
                : 'Consulta tus tarjetas de embarque digitales, puertas de salida asignadas y realiza tu check-in en línea antes de abordar.'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary-light text-xs backdrop-blur-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-white/5 bg-white/5 h-28" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tarjetas de Estadísticas (Efecto Espejo) */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md p-5 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Check-ins</span>
              <div className="mt-2 text-2xl font-black text-white">{stats.total}</div>
              <p className="mt-1 text-[11px] text-gray-400">Registrados</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 backdrop-blur-md p-5 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Confirmados</span>
              <div className="mt-2 text-2xl font-black text-emerald-300">{stats.confirmados}</div>
              <p className="mt-1 text-[11px] text-emerald-400">Listos para volar</p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/0 backdrop-blur-md p-5 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Abordando</span>
              <div className="mt-2 text-2xl font-black text-blue-300">{stats.abordando}</div>
              <p className="mt-1 text-[11px] text-blue-400">En puerta de salida</p>
            </div>

            <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-500/0 backdrop-blur-md p-5 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">Pendientes</span>
              <div className="mt-2 text-2xl font-black text-yellow-300">{stats.pendientes}</div>
              <p className="mt-1 text-[11px] text-yellow-400">Por confirmar datos</p>
            </div>
          </div>

          {/* Renderizado de Vistas */}
          {isStaff ? (
            /* ================= VISTA STAFF: LISTADO DE CONTROL ADMINISTRATIVO ================= */
            <div className="border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Listado de Pasajeros Registrados</h2>
                  <p className="text-xs text-gray-400">Control de pases y asignaciones de puerta.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar por boleto, pasajero..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full sm:w-64 bg-dark/70 border border-white/15 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-light transition-all"
                  />
                  <Button size="small">
                    + Registrar Check-in
                  </Button>
                </div>
              </div>

              {checkinsFiltrados.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No se encontraron registros de check-in.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold">ID</th>
                        <th className="px-4 py-3 font-bold">Pasajero</th>
                        <th className="px-4 py-3 font-bold">Reserva</th>
                        <th className="px-4 py-3 font-bold">Vuelo</th>
                        <th className="px-4 py-3 font-bold">Puerta</th>
                        <th className="px-4 py-3 font-bold">Tarjeta de Embarque</th>
                        <th className="px-4 py-3 font-bold">Estado</th>
                        <th className="px-4 py-3 text-right font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkinsFiltrados.map((c) => {
                        const res = reservasPorId.get(c.reserva);
                        const pas = res ? pasajerosPorId.get(res.pasajero) : null;
                        const vue = res ? vuelosPorId.get(res.vuelo) : null;
                        const pue = c.puerta != null ? puertasPorId.get(c.puerta) : null;

                        const nombrePasajero = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${res?.pasajero}`;
                        const rutaVuelo = vue ? `${vue.origen_detalle?.codigo_iata || 'ORG'} → ${vue.destino_detalle?.codigo_iata || 'DST'}` : `Vuelo #${res?.vuelo}`;

                        return (
                          <tr key={c.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all">
                            <td className="px-4 py-3 text-gray-500">#{c.id}</td>
                            <td className="px-4 py-3 font-semibold text-white">{nombrePasajero}</td>
                            <td className="px-4 py-3 text-stone-300">Reserva #{c.reserva}</td>
                            <td className="px-4 py-3 text-stone-300">{rutaVuelo}</td>
                            <td className="px-4 py-3">
                              {pue ? (
                                <span className="font-bold text-amber-300">Puerta {pue.codigo}</span>
                              ) : (
                                <span className="text-gray-500 italic">No asignada</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-white font-bold">{c.tarjeta_embarque}</td>
                            <td className="px-4 py-3">
                              <Badge estado={c.estado} />
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1">
                                Asignar Puerta
                              </button>
                              <button className="text-primary-light hover:text-primary transition-all text-xs font-semibold px-2 py-1">
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ================= VISTA CLIENTE: TARJETAS DE EMBARQUE ================= */
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white tracking-wide">Mis Pases de Abordar</h2>
              <div className="py-8 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl">
                Cargando tus pases de abordar...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
