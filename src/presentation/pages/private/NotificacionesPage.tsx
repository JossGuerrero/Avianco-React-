import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Notificacion } from '../../../domain/entities/Notificacion';
import { TipoNotificacion } from '../../../domain/enums/TipoNotificacion';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useNotificacionesStore } from '../../store/notificacionesStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { getErrorMessage } from '../../utils/formatters';

export function NotificacionesPage() {
  const { user, isStaff } = useAuthStore();
  const cargarNoLeidas = useNotificacionesStore((state) => state.cargarNoLeidas);

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setNotificaciones(await useCaseFactory.notificaciones.getAll());
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar las notificaciones'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Usuario normal solo ve las suyas; staff ve todas.
  const visibles = useMemo(
    () => (isStaff ? notificaciones : notificaciones.filter((n) => n.usuario === user?.id)),
    [notificaciones, isStaff, user],
  );

  // Filtrado por buscador
  const filtradas = useMemo(() => {
    return visibles.filter((n) => {
      return (
        n.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        n.mensaje.toLowerCase().includes(busqueda.toLowerCase()) ||
        n.tipo.toLowerCase().includes(busqueda.toLowerCase()) ||
        String(n.usuario).includes(busqueda)
      );
    });
  }, [visibles, busqueda]);

  // Estadísticas del panel superior
  const stats = useMemo(() => {
    const totalCount = visibles.length;
    const noLeidas = visibles.filter((n) => !n.leida).length;
    const embarque = visibles.filter((n) => n.tipo === TipoNotificacion.Embarque).length;
    const criticas = visibles.filter(
      (n) => n.tipo === TipoNotificacion.Alerta || n.tipo === TipoNotificacion.Cancelado
    ).length;

    return {
      totalCount,
      noLeidas,
      embarque,
      criticas,
    };
  }, [visibles]);

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.02 6.02 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-primary-light uppercase">Centro de Mensajería</span>
            </div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl text-white tracking-tight">
              Avisos de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Terminal</span>
            </h1>
            <p className="mt-2 text-xs text-gray-400 max-w-xl leading-relaxed">
              {isStaff 
                ? 'Monitorea las notificaciones enviadas, alertas críticas de vuelos retrasados y difunde avisos a pasajeros.'
                : 'Consulta tus avisos de embarque, cambios de puerta y estados de vuelo actualizados al instante.'}
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
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Historial Total</span>
              <div className="mt-1.5 text-xl font-black text-white">{stats.totalCount}</div>
              <p className="mt-0.5 text-[10px] text-gray-400">Mensajes del canal</p>
            </div>

            <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">No Leídas</span>
              <div className="mt-1.5 text-xl font-black text-yellow-300 flex items-center gap-2">
                {stats.noLeidas}
                {stats.noLeidas > 0 && <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" />}
              </div>
              <p className="mt-0.5 text-[10px] text-yellow-400">Pendientes de lectura</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Embarques</span>
              <div className="mt-1.5 text-xl font-black text-emerald-300">{stats.embarque}</div>
              <p className="mt-0.5 text-[10px] text-emerald-400">Avisos de abordaje</p>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-rose-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Críticas</span>
              <div className="mt-1.5 text-xl font-black text-rose-300">{stats.criticas}</div>
              <p className="mt-0.5 text-[10px] text-rose-400">Alertas y cancelaciones</p>
            </div>
          </div>

          {/* Renderizado de Vistas */}
          {isStaff ? (
            /* ================= VISTA STAFF: LISTADO DE CONTROL ================= */
            <div className="border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Despacho de Mensajes</h2>
                  <p className="text-xs text-gray-400">Notifica a los usuarios del sistema de cambios en tiempo real.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar por título, tipo..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full sm:w-64 bg-dark/70 border border-white/15 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-light transition-all"
                  />
                  <Button size="small">
                    + Emitir Alerta
                  </Button>
                </div>
              </div>

              {filtradas.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No se encontraron notificaciones emitidas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold">Usuario</th>
                        <th className="px-4 py-3 font-bold">Tipo</th>
                        <th className="px-4 py-3 font-bold">Título</th>
                        <th className="px-4 py-3 font-bold">Mensaje</th>
                        <th className="px-4 py-3 font-bold">Estado</th>
                        <th className="px-4 py-3 text-right font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtradas.map((n) => (
                        <tr key={n.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all">
                          <td className="px-4 py-3 text-gray-500">#{n.usuario}</td>
                          <td className="px-4 py-3 capitalize">{n.tipo}</td>
                          <td className="px-4 py-3 font-semibold text-white">{n.titulo}</td>
                          <td className="px-4 py-3 text-stone-300 max-w-[200px] truncate">{n.mensaje}</td>
                          <td className="px-4 py-3">
                            <Badge estado={n.leida ? 'leída' : 'no leída'} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className="text-primary-light hover:text-primary transition-all text-xs font-semibold px-2 py-1">
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ================= VISTA CLIENTE: FEED DE AVISOS ================= */
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white tracking-wide">Mis Notificaciones</h2>
              <div className="py-8 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl">
                Cargando bandeja de entrada...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
