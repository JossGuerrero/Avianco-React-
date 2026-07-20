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
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4 max-w-xl text-left">
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
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              {isStaff 
                ? 'Monitorea las notificaciones enviadas, alertas críticas de vuelos retrasados y difunde avisos a pasajeros.'
                : 'Consulta tus avisos de embarque, cambios de puerta y estados de vuelo actualizados al instante.'}
            </p>
          </div>
        </div>

        {/* Banner Generado por IA */}
        <div className="relative w-full md:w-64 h-24 rounded-2xl overflow-hidden border border-white/10 shadow-lg hidden md:block">
          <img 
            src="/notifications_banner_1784570098466.png" 
            alt="Notifications Banner" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark/80 to-transparent" />
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-wide">Mis Notificaciones</h2>
                <span className="text-xs text-gray-400">{filtradas.length} mensajes recibidos</span>
              </div>

              {filtradas.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                  No tienes notificaciones en tu bandeja de entrada.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {filtradas.map((n) => {
                    // Configuración visual según el tipo de aviso
                    const config = {
                      embarque: {
                        border: 'border-l-4 border-emerald-500',
                        bg: 'from-emerald-500/5 to-emerald-500/0',
                        iconBg: 'bg-emerald-500/10 text-emerald-400',
                        badge: 'border-emerald-500/20 text-emerald-400',
                        icono: (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        ),
                      },
                      alerta: {
                        border: 'border-l-4 border-yellow-500',
                        bg: 'from-yellow-500/5 to-yellow-500/0',
                        iconBg: 'bg-yellow-500/10 text-yellow-400',
                        badge: 'border-yellow-500/20 text-yellow-400',
                        icono: (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ),
                      },
                      cancelado: {
                        border: 'border-l-4 border-rose-500',
                        bg: 'from-rose-500/5 to-rose-500/0',
                        iconBg: 'bg-rose-500/10 text-rose-400',
                        badge: 'border-rose-500/20 text-rose-400',
                        icono: (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ),
                      },
                      info: {
                        border: 'border-l-4 border-blue-500',
                        bg: 'from-blue-500/5 to-blue-500/0',
                        iconBg: 'bg-blue-500/10 text-blue-400',
                        badge: 'border-blue-500/20 text-blue-400',
                        icono: (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ),
                      },
                    }[n.tipo.toLowerCase()] || {
                      border: 'border-l-4 border-stone-500',
                      bg: 'from-stone-500/5 to-stone-500/0',
                      iconBg: 'bg-stone-500/10 text-stone-400',
                      badge: 'border-stone-500/20 text-stone-400',
                      icono: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.02 6.02 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      ),
                    };

                    return (
                      <div key={n.id} className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${config.bg} backdrop-blur-md shadow-lg p-5 flex flex-col justify-between space-y-4 animate-scale-in hover:border-white/20 transition-all ${config.border} ${n.leida ? 'opacity-60' : ''}`}>
                        
                        {/* Header card info */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl ${config.iconBg}`}>
                              {config.icono}
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-500 block uppercase tracking-wider font-mono">Bandeja de Entrada</span>
                              <span className="font-semibold text-white text-xs capitalize">{n.tipo}</span>
                            </div>
                          </div>
                          {!n.leida && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                            </span>
                          )}
                        </div>

                        {/* Message content */}
                        <div className="space-y-1 text-left">
                          <h3 className={`text-sm font-bold ${n.leida ? 'text-stone-400' : 'text-white'}`}>{n.titulo}</h3>
                          <p className="text-xs text-stone-300 leading-relaxed font-light">{n.mensaje}</p>
                        </div>

                        {/* Footer action button */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-[9px] text-gray-500 font-mono">ID #{n.id}</span>
                          {!n.leida && (
                            <button
                              onClick={() => marcarLeida(n)}
                              className="text-xs font-bold text-primary-light hover:text-primary transition-all px-3 py-1 bg-white/5 hover:bg-white/10 rounded-xl"
                            >
                              Marcar como leída
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
