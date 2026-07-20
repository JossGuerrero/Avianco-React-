import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Servicio } from '../../../domain/entities/Servicio';
import { TipoServicio } from '../../../domain/enums/TipoServicio';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { formatPrecio, getErrorMessage } from '../../utils/formatters';

export function ServiciosPage() {
  const { isStaff } = useAuthStore();

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setServicios(await useCaseFactory.servicios.getAll());
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los servicios'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Filtrado por buscador
  const filtrados = useMemo(() => {
    return servicios.filter((s) => {
      return (
        s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.tipo.toLowerCase().includes(busqueda.toLowerCase()) ||
        (s.descripcion && s.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
      );
    });
  }, [servicios, busqueda]);

  // Estadísticas
  const stats = useMemo(() => {
    const totalCount = servicios.length;
    const comidaCount = servicios.filter((s) => s.tipo === TipoServicio.Comida).length;
    const equipajeCount = servicios.filter((s) => s.tipo === TipoServicio.Equipaje).length;
    const conectividadSeguros = servicios.filter(
      (s) => s.tipo === TipoServicio.Wifi || s.tipo === TipoServicio.Seguro
    ).length;

    return {
      totalCount,
      comidaCount,
      equipajeCount,
      conectividadSeguros,
    };
  }, [servicios]);

  return (
    <div className="relative space-y-8 animate-fade-in pb-12 text-left">
      {/* Luces de Fondo Glassmorphic */}
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera Principal */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        {/* Imagen de Fondo Completa con Difuminado */}
        <div className="absolute inset-0 z-0 opacity-25 pointer-events-none blur-[1px]">
          <img 
            src="/services_banner_1784571844257.png" 
            alt="Background Banner" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#121212]/90 to-transparent" />
        </div>

        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4 max-w-xl text-left">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-primary-light uppercase">Servicios Adicionales</span>
            </div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl text-white tracking-tight">
              Servicios <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">a Bordo</span>
            </h1>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              {isStaff 
                ? 'Administra el catálogo de servicios auxiliares, tarifas de comidas, equipajes de mano, seguros de viaje y conectividad wifi.'
                : 'Personaliza tu viaje con nuestra selección de comidas gourmet, equipaje adicional y servicios exclusivos de conectividad y confort.'}
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
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Servicios Totales</span>
              <div className="mt-1.5 text-xl font-black text-white">{stats.totalCount}</div>
              <p className="mt-0.5 text-[10px] text-gray-400">Planes en catálogo</p>
            </div>

            <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Menú y Comidas</span>
              <div className="mt-1.5 text-xl font-black text-orange-300">{stats.comidaCount}</div>
              <p className="mt-0.5 text-[10px] text-orange-400">Gourmet y Bebidas</p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Equipajes</span>
              <div className="mt-1.5 text-xl font-black text-blue-300">{stats.equipajeCount}</div>
              <p className="mt-0.5 text-[10px] text-blue-400">Cargas adicionales</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Conectividad / Seguros</span>
              <div className="mt-1.5 text-xl font-black text-emerald-300">{stats.conectividadSeguros}</div>
              <p className="mt-0.5 text-[10px] text-emerald-400">Wifi y Seguros de viaje</p>
            </div>
          </div>

          {/* Renderizado de Vistas */}
          {isStaff ? (
            /* ================= VISTA STAFF: LISTADO DE CONTROL ================= */
            <div className="border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Consola de Servicios Auxiliares</h2>
                  <p className="text-xs text-gray-400">Configura los precios base y la disponibilidad de amenidades.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, tipo..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full sm:w-64 bg-dark/70 border border-white/15 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-light transition-all"
                  />
                  <Button size="small">
                    + Nuevo Servicio
                  </Button>
                </div>
              </div>

              {filtrados.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No se encontraron servicios registrados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold">ID</th>
                        <th className="px-4 py-3 font-bold">Nombre</th>
                        <th className="px-4 py-3 font-bold">Tipo</th>
                        <th className="px-4 py-3 font-bold">Precio</th>
                        <th className="px-4 py-3 font-bold">Descripción</th>
                        <th className="px-4 py-3 text-right font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((s) => (
                        <tr key={s.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all">
                          <td className="px-4 py-3 text-gray-500">#{s.id}</td>
                          <td className="px-4 py-3 font-semibold text-white">{s.nombre}</td>
                          <td className="px-4 py-3 text-stone-300 capitalize">{s.tipo}</td>
                          <td className="px-4 py-3 font-bold text-primary-light">{formatPrecio(s.precio)}</td>
                          <td className="px-4 py-3 text-stone-300 max-w-[200px] truncate">{s.descripcion || '—'}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1">
                              Editar
                            </button>
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
            /* ================= VISTA CLIENTE: TARJETAS DE SERVICIO ================= */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-wide">Servicios Disponibles</h2>
                <span className="text-xs text-gray-400">{filtrados.length} amenidades publicadas</span>
              </div>

              {filtrados.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                  No hay servicios adicionales configurados actualmente.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filtrados.map((s) => {
                    // Configuración visual por tipo de servicio
                    const config = {
                      comida: {
                        cardBg: 'from-amber-600/10 via-amber-900/5 to-amber-950/0 border-amber-500/20 hover:border-amber-500/40',
                        textTheme: 'text-amber-400',
                        icon: (
                          <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ),
                      },
                      equipaje: {
                        cardBg: 'from-blue-600/10 via-blue-900/5 to-blue-950/0 border-blue-500/20 hover:border-blue-500/40',
                        textTheme: 'text-blue-400',
                        icon: (
                          <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        ),
                      },
                      asiento: {
                        cardBg: 'from-purple-600/10 via-purple-900/5 to-purple-950/0 border-purple-500/20 hover:border-purple-500/40',
                        textTheme: 'text-purple-400',
                        icon: (
                          <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                        ),
                      },
                      wifi: {
                        cardBg: 'from-cyan-600/10 via-cyan-900/5 to-cyan-950/0 border-cyan-500/20 hover:border-cyan-500/40',
                        textTheme: 'text-cyan-400',
                        icon: (
                          <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a10.5 10.5 0 0114.14 0M1.393 8.9a16.5 16.5 0 0121.214 0" />
                          </svg>
                        ),
                      },
                      seguro: {
                        cardBg: 'from-emerald-600/10 via-emerald-900/5 to-emerald-950/0 border-emerald-500/20 hover:border-emerald-500/40',
                        textTheme: 'text-emerald-400',
                        icon: (
                          <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        ),
                      },
                      otro: {
                        cardBg: 'from-stone-600/10 via-stone-900/5 to-stone-950/0 border-stone-500/20 hover:border-stone-500/40',
                        textTheme: 'text-stone-400',
                        icon: (
                          <svg className="h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        ),
                      },
                    }[s.tipo.toLowerCase()] || {
                      cardBg: 'from-white/5 to-white/0 border-white/10 hover:border-white/20',
                      textTheme: 'text-stone-300',
                      icon: (
                        <svg className="h-6 w-6 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ),
                    };

                    return (
                      <div key={s.id} className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br backdrop-blur-md shadow-2xl p-6 flex flex-col justify-between min-h-[190px] w-full animate-scale-in transition-all hover:scale-[1.02] ${config.cardBg}`}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                              Categoría: {s.tipo}
                            </span>
                            {config.icon}
                          </div>
                          <div className="text-left">
                            <h3 className="text-base font-black text-white">{s.nombre}</h3>
                            <p className="mt-1 text-xs text-stone-400 font-light min-h-[32px] leading-relaxed">
                              {s.descripcion || 'Disfruta de este servicio exclusivo en tu próximo vuelo.'}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 flex items-center justify-between border-t border-white/5 mt-4">
                          <div className="text-left">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-mono">Tarifa Base</span>
                            <span className="text-base font-black text-primary-light">{formatPrecio(s.precio)}</span>
                          </div>
                          <span className="text-[10px] text-stone-400 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                            Ref: #{s.id}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
        </div>
      )}
    </div>
  );
}
