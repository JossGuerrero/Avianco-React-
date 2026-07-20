import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Pago } from '../../../domain/entities/Pago';
import type { MetodoPago } from '../../../domain/entities/MetodoPago';
import type { Reserva } from '../../../domain/entities/Reserva';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import { EstadoPago } from '../../../domain/enums/EstadoPago';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { formatPrecio, getErrorMessage } from '../../utils/formatters';

export function PagosPage() {
  const { user, isStaff } = useAuthStore();

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pagosData, metodosData, reservasData, pasajerosData] = await Promise.all([
        useCaseFactory.pagos.getAll(),
        useCaseFactory.metodosPago.getAll(),
        useCaseFactory.reservas.getAll(),
        useCaseFactory.pasajeros.getAll(),
      ]);
      setPagos(pagosData);
      setMetodos(metodosData);
      setReservas(reservasData);
      setPasajeros(pasajerosData);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los pagos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const metodosPorId = useMemo(() => new Map(metodos.map((m) => [m.id, m])), [metodos]);
  const reservasPorId = useMemo(() => new Map(reservas.map((r) => [r.id, r])), [reservas]);
  const pasajerosPorId = useMemo(() => new Map(pasajeros.map((p) => [p.id, p])), [pasajeros]);

  // Filtro de propiedad de datos para Clientes
  const misPasajerosIds = useMemo(() => {
    return new Set(pasajeros.filter((p) => p.usuario === user?.id).map((p) => p.id));
  }, [pasajeros, user]);

  const misReservaIds = useMemo(() => {
    return new Set(reservas.filter((r) => misPasajerosIds.has(r.pasajero)).map((r) => r.id));
  }, [reservas, misPasajerosIds]);

  const pagosVisibles = useMemo(() => {
    if (isStaff) return pagos;
    return pagos.filter((p) => misReservaIds.has(p.reserva));
  }, [pagos, isStaff, misReservaIds]);

  // Pagos filtrados por búsqueda (código de reserva, método, referencia)
  const pagosFiltrados = useMemo(() => {
    return pagosVisibles.filter((p) => {
      const res = reservasPorId.get(p.reserva);
      const pas = res ? pasajerosPorId.get(res.pasajero) : null;
      const nombrePasajero = pas ? (pas.nombre_completo || pas.numero_pasaporte) : '';
      const metodo = metodosPorId.get(p.metodo_pago)?.nombre || '';
      
      return (
        String(p.reserva).includes(busqueda) ||
        nombrePasajero.toLowerCase().includes(busqueda.toLowerCase()) ||
        metodo.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.referencia.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.estado.toLowerCase().includes(busqueda.toLowerCase())
      );
    });
  }, [pagosVisibles, busqueda, reservasPorId, pasajerosPorId, metodosPorId]);

  // Estadísticas del panel superior
  const stats = useMemo(() => {
    const totalCount = pagosVisibles.length;
    const totalRecaudado = pagosVisibles
      .filter((p) => p.estado === EstadoPago.Completado)
      .reduce((acc, curr) => acc + Number(curr.monto), 0);
    const pendientes = pagosVisibles.filter((p) => p.estado === EstadoPago.Pendiente).length;
    const fallidos = pagosVisibles.filter((p) => p.estado === EstadoPago.Fallido).length;
    const reembolsados = pagosVisibles.filter((p) => p.estado === EstadoPago.Reembolsado).length;

    return {
      totalCount,
      totalRecaudado,
      pendientes,
      fallidos,
      reembolsados,
    };
  }, [pagosVisibles]);

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1M10 6H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2v-3a2 2 0 00-2-2V9a2 2 0 00-2-2h-3m-1 0H9" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-primary-light uppercase">Servicios Financieros</span>
            </div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl text-white tracking-tight">
              Terminal de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Pagos</span>
            </h1>
            <p className="mt-2 text-xs text-gray-400 max-w-xl leading-relaxed">
              {isStaff 
                ? 'Monitorea las reservas pagadas, reembolsos emitidos, y verifica referencias bancarias de transacciones.'
                : 'Consulta tus recibos de pago digitales y realiza el pago de tus reservas de vuelo activas.'}
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
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md p-4 shadow-lg col-span-2 lg:col-span-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Recaudado</span>
              <div className="mt-1.5 text-xl font-black text-white">{formatPrecio(stats.totalRecaudado)}</div>
              <p className="mt-0.5 text-[10px] text-gray-400">{stats.totalCount} transacciones</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Completados</span>
              <div className="mt-1.5 text-xl font-black text-emerald-300">
                {pagosVisibles.filter((p) => p.estado === EstadoPago.Completado).length}
              </div>
              <p className="mt-0.5 text-[10px] text-emerald-400">Pagos validados</p>
            </div>

            <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">Pendientes</span>
              <div className="mt-1.5 text-xl font-black text-yellow-300">{stats.pendientes}</div>
              <p className="mt-0.5 text-[10px] text-yellow-400">Por procesar cobro</p>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-rose-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Fallidos</span>
              <div className="mt-1.5 text-xl font-black text-rose-300">{stats.fallidos}</div>
              <p className="mt-0.5 text-[10px] text-rose-400">Transacción rechazada</p>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Reembolsados</span>
              <div className="mt-1.5 text-xl font-black text-purple-300">{stats.reembolsados}</div>
              <p className="mt-0.5 text-[10px] text-purple-400">Devoluciones de cargo</p>
            </div>
          </div>

          {/* Renderizado de Vistas */}
          {isStaff ? (
            /* ================= VISTA STAFF: LISTADO DE CONTROL FINANCIERO ================= */
            <div className="border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Transacciones Recibidas</h2>
                  <p className="text-xs text-gray-400">Control de estados, referencias y montos cobrados.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar por reserva, referencia..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full sm:w-64 bg-dark/70 border border-white/15 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-light transition-all"
                  />
                  <Button size="small">
                    + Registrar Pago
                  </Button>
                </div>
              </div>

              {pagosFiltrados.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No se encontraron registros de transacciones.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold">ID</th>
                        <th className="px-4 py-3 font-bold">Pasajero</th>
                        <th className="px-4 py-3 font-bold">Reserva</th>
                        <th className="px-4 py-3 font-bold">Método</th>
                        <th className="px-4 py-3 font-bold">Monto</th>
                        <th className="px-4 py-3 font-bold">Referencia</th>
                        <th className="px-4 py-3 font-bold">Estado</th>
                        <th className="px-4 py-3 text-right font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagosFiltrados.map((p) => {
                        const res = reservasPorId.get(p.reserva);
                        const pas = res ? pasajerosPorId.get(res.pasajero) : null;
                        const metodo = metodosPorId.get(p.metodo_pago)?.nombre || `#${p.metodo_pago}`;

                        const nombrePasajero = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${res?.pasajero}`;

                        return (
                          <tr key={p.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all">
                            <td className="px-4 py-3 text-gray-500">#{p.id}</td>
                            <td className="px-4 py-3 font-semibold text-white">{nombrePasajero}</td>
                            <td className="px-4 py-3 text-stone-300">Reserva #{p.reserva}</td>
                            <td className="px-4 py-3 text-stone-300">{metodo}</td>
                            <td className="px-4 py-3 font-semibold text-white">{formatPrecio(p.monto)}</td>
                            <td className="px-4 py-3 font-mono text-stone-400">{p.referencia || '—'}</td>
                            <td className="px-4 py-3">
                              <Badge estado={p.estado} />
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1">
                                Editar
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
            /* ================= VISTA CLIENTE: HISTORIAL DE PAGOS ================= */
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white tracking-wide">Mis Transacciones</h2>
              <div className="py-8 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl">
                Cargando tu historial de pagos...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
