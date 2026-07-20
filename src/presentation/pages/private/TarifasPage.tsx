import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Tarifa } from '../../../domain/entities/Tarifa';
import { ClaseTarifa } from '../../../domain/enums/ClaseTarifa';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { getErrorMessage } from '../../utils/formatters';

export function TarifasPage() {
  const { isStaff } = useAuthStore();

  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTarifas(await useCaseFactory.tarifas.getAll());
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar las tarifas'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Filtrado por buscador
  const filtradas = useMemo(() => {
    return tarifas.filter((t) => {
      return (
        t.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.clase.toLowerCase().includes(busqueda.toLowerCase()) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
      );
    });
  }, [tarifas, busqueda]);

  // Estadísticas de tarifas
  const stats = useMemo(() => {
    const totalCount = tarifas.length;
    const promedioDescuento = totalCount
      ? tarifas.reduce((acc, curr) => acc + Number(curr.descuento), 0) / totalCount
      : 0;
    const economica = tarifas.filter((t) => t.clase === ClaseTarifa.Economica).length;
    const business = tarifas.filter((t) => t.clase === ClaseTarifa.Business).length;
    const primera = tarifas.filter((t) => t.clase === ClaseTarifa.Primera).length;

    return {
      totalCount,
      promedioDescuento: Math.round(promedioDescuento * 100) / 100,
      economica,
      business,
      primera,
    };
  }, [tarifas]);

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-primary-light uppercase">Configuración de Precios</span>
            </div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl text-white tracking-tight">
              Tarifas y <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Clases de Vuelo</span>
            </h1>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              {isStaff 
                ? 'Configura las clases de vuelo disponibles en la flota, aplica descuentos globales de temporada y gestiona los beneficios incluidos.'
                : 'Compara nuestras clases de viaje, desde nuestra cabina turista económica hasta la exclusividad de Primera Clase.'}
            </p>
          </div>
        </div>

        {/* Banner Generado por IA */}
        <div className="relative w-full md:w-64 h-24 rounded-2xl overflow-hidden border border-white/10 shadow-lg hidden md:block">
          <img 
            src="/fares_banner_1784570424812.png" 
            alt="Fares Banner" 
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-white/5 bg-white/5 h-28" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tarjetas de Estadísticas (Efecto Espejo) */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tarifas Activas</span>
              <div className="mt-1.5 text-xl font-black text-white">{stats.totalCount}</div>
              <p className="mt-0.5 text-[10px] text-gray-400">Planes en base de datos</p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Descuento Promedio</span>
              <div className="mt-1.5 text-xl font-black text-blue-300">{stats.promedioDescuento}%</div>
              <p className="mt-0.5 text-[10px] text-blue-400">Ahorro en pasajes</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Cabina Económica</span>
              <div className="mt-1.5 text-xl font-black text-emerald-300">{stats.economica}</div>
              <p className="mt-0.5 text-[10px] text-emerald-400">Planes Turista</p>
            </div>

            <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">Cabina Business</span>
              <div className="mt-1.5 text-xl font-black text-yellow-300">{stats.business}</div>
              <p className="mt-0.5 text-[10px] text-yellow-400">Planes Ejecutivos</p>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Primera Clase</span>
              <div className="mt-1.5 text-xl font-black text-purple-300">{stats.primera}</div>
              <p className="mt-0.5 text-[10px] text-purple-400">Planes VIP Platinum</p>
            </div>
          </div>

          {/* Renderizado de Vistas */}
          {isStaff ? (
            /* ================= VISTA STAFF: LISTADO DE CONTROL ================= */
            <div className="border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Consola de Precios y Fares</h2>
                  <p className="text-xs text-gray-400">Configuración global de cabinas de vuelo y coeficientes.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, clase..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full sm:w-64 bg-dark/70 border border-white/15 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-light transition-all"
                  />
                  <Button size="small">
                    + Nueva Tarifa
                  </Button>
                </div>
              </div>

              {filtradas.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No se encontraron tarifas registradas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold">ID</th>
                        <th className="px-4 py-3 font-bold">Nombre</th>
                        <th className="px-4 py-3 font-bold">Clase de Cabina</th>
                        <th className="px-4 py-3 font-bold">Descuento</th>
                        <th className="px-4 py-3 font-bold">Descripción</th>
                        <th className="px-4 py-3 text-right font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtradas.map((t) => (
                        <tr key={t.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all">
                          <td className="px-4 py-3 text-gray-500">#{t.id}</td>
                          <td className="px-4 py-3 font-semibold text-white">{t.nombre}</td>
                          <td className="px-4 py-3 text-stone-300 capitalize">{t.clase}</td>
                          <td className="px-4 py-3 font-bold text-primary-light">{Number(t.descuento)}%</td>
                          <td className="px-4 py-3 text-stone-300 max-w-[200px] truncate">{t.descripcion || '—'}</td>
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
            /* ================= VISTA CLIENTE: COMPARADOR DE PLANES ================= */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-wide">Planes y Beneficios de Cabina</h2>
                <span className="text-xs text-gray-400">{filtradas.length} tarifas de vuelo publicadas</span>
              </div>

              {filtradas.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                  No hay tarifas configuradas para comparar actualmente.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filtradas.map((t) => {
                    // Configuración visual según clase de cabina
                    const config = {
                      economica: {
                        cardBg: 'from-amber-700/5 to-amber-900/0 border-amber-700/20 hover:border-amber-700/40',
                        textTheme: 'text-amber-400',
                        glowColor: 'bg-amber-400/10 text-amber-300',
                        label: 'Clase Turista',
                        badgeStyle: 'bg-gradient-to-r from-amber-700 to-amber-600 text-amber-100',
                        beneficios: [
                          { ok: true, text: 'Equipaje de mano (10kg)' },
                          { ok: true, text: 'Asiento aleatorio estándar' },
                          { ok: false, text: 'Equipaje facturado en bodega (23kg)' },
                          { ok: false, text: 'Embarque prioritario' },
                          { ok: false, text: 'Acceso a Sala VIP Avianco' },
                        ],
                      },
                      business: {
                        cardBg: 'from-slate-400/5 to-slate-600/0 border-slate-400/20 hover:border-slate-400/40 shadow-blue-500/5',
                        textTheme: 'text-blue-300',
                        glowColor: 'bg-blue-400/10 text-blue-300',
                        label: 'Clase Ejecutiva',
                        badgeStyle: 'bg-gradient-to-r from-slate-500 to-slate-400 text-slate-900 font-bold',
                        beneficios: [
                          { ok: true, text: 'Equipaje de mano (10kg)' },
                          { ok: true, text: 'Selección de asiento estándar' },
                          { ok: true, text: 'Equipaje facturado (1 pieza 23kg)' },
                          { ok: true, text: 'Embarque preferencial (Grupo 2)' },
                          { ok: false, text: 'Acceso a Sala VIP Avianco' },
                        ],
                      },
                      primera: {
                        cardBg: 'from-purple-900/10 to-purple-950/0 border-purple-500/30 hover:border-purple-500/50 shadow-purple-500/10 scale-100 lg:scale-[1.02]',
                        textTheme: 'text-purple-300',
                        glowColor: 'bg-purple-400/15 text-purple-300',
                        label: 'Primera Clase',
                        badgeStyle: 'bg-gradient-to-r from-yellow-500 to-amber-400 text-amber-950 font-black',
                        beneficios: [
                          { ok: true, text: 'Equipaje de mano (10kg) + Bolso' },
                          { ok: true, text: 'Selección libre de asientos premium/salida' },
                          { ok: true, text: '2 Equipajes facturados (23kg c/u)' },
                          { ok: true, text: 'Abordaje prioritario (Grupo 1)' },
                          { ok: true, text: 'Acceso ilimitado a Sala VIP Avianco' },
                        ],
                      },
                    }[t.clase.toLowerCase()] || {
                      cardBg: 'from-white/5 to-white/0 border-white/10 hover:border-white/20',
                      textTheme: 'text-stone-300',
                      glowColor: 'bg-white/10 text-white',
                      label: 'Cabina Estándar',
                      badgeStyle: 'bg-stone-500 text-white',
                      beneficios: [
                        { ok: true, text: 'Asiento básico' },
                        { ok: false, text: 'Servicios extras' },
                      ],
                    };

                    return (
                      <div key={t.id} className={`relative overflow-hidden rounded-3xl border bg-gradient-to-b backdrop-blur-md shadow-2xl p-6 flex flex-col justify-between min-h-[460px] w-full animate-scale-in transition-all ${config.cardBg}`}>
                        
                        {/* Cabecera de la Tarjeta */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${config.badgeStyle}`}>
                              {config.label}
                            </span>
                            {Number(t.descuento) > 0 && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                -{Number(t.descuento)}% Descuento
                              </span>
                            )}
                          </div>
                          <div className="text-left">
                            <h3 className="text-lg font-black text-white">{t.nombre}</h3>
                            <p className="mt-1 text-xs text-stone-400 font-light min-h-[32px] leading-relaxed">
                              {t.descripcion || 'Disfruta del mejor confort a bordo con Avianco.'}
                            </p>
                          </div>
                        </div>

                        {/* Listado de Beneficios */}
                        <div className="py-6 border-y border-white/5 space-y-3 text-left">
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-mono">Servicios Incluidos</span>
                          <ul className="space-y-2.5">
                            {config.beneficios.map((b, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-200">
                                {b.ok ? (
                                  <svg className="h-4.5 w-4.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="h-4.5 w-4.5 text-stone-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                                <span className={b.ok ? 'font-medium' : 'text-stone-500 line-through'}>{b.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Pie de Tarjeta / Información de Descuento */}
                        <div className="pt-4 flex items-center justify-between gap-4">
                          <div className="text-left">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-mono">Cabina Base</span>
                            <span className={`text-sm font-black ${config.textTheme} capitalize`}>{t.clase}</span>
                          </div>
                          <span className="text-[10px] text-stone-400 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                            Ref: #{t.id}
                          </span>
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
