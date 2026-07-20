import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../utils/formatters';
import type { Equipaje } from '../../../domain/entities/Equipaje';
import type { Reserva } from '../../../domain/entities/Reserva';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import type { Vuelo } from '../../../domain/entities/Vuelo';

export function EquipajesPage() {
  const { user, isStaff } = useAuthStore();

  const [equipajes, setEquipajes] = useState<Equipaje[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
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
      const [equipajesData, reservasData, pasajerosData, vuelosData] = await Promise.all([
        useCaseFactory.equipajes.getAll(),
        useCaseFactory.reservas.getAll(),
        useCaseFactory.pasajeros.getAll(),
        useCaseFactory.vuelos.getAll(),
      ]);
      setEquipajes(equipajesData);
      setReservas(reservasData);
      setPasajeros(pasajerosData);
      setVuelos(vuelosData);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los datos de equipajes'));
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

  // Filtro de propiedad de datos para Clientes
  const misPasajerosIds = useMemo(() => {
    return new Set(pasajeros.filter((p) => p.usuario === user?.id).map((p) => p.id));
  }, [pasajeros, user]);

  const misReservasIds = useMemo(() => {
    return new Set(reservas.filter((r) => misPasajerosIds.has(r.pasajero)).map((r) => r.id));
  }, [reservas, misPasajerosIds]);

  const equipajesVisibles = useMemo(() => {
    if (isStaff) return equipajes;
    return equipajes.filter((e) => misReservasIds.has(e.reserva));
  }, [equipajes, isStaff, misReservasIds]);

  // Equipajes filtrados por búsqueda (código de reserva, pasajero o descripción)
  const equipajesFiltrados = useMemo(() => {
    return equipajesVisibles.filter((e) => {
      const res = reservasPorId.get(e.reserva);
      const pas = res ? pasajerosPorId.get(res.pasajero) : null;
      const nombrePasajero = pas ? (pas.nombre_completo || pas.numero_pasaporte) : '';
      
      return (
        String(e.reserva).includes(busqueda) ||
        nombrePasajero.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.tipo.toLowerCase().includes(busqueda.toLowerCase()) ||
        (e.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())
      );
    });
  }, [equipajesVisibles, busqueda, reservasPorId, pasajerosPorId]);

  // Estadísticas del panel superior
  const stats = useMemo(() => {
    const totalCount = equipajesVisibles.length;
    const pesoTotal = equipajesVisibles.reduce((acc, curr) => acc + Number(curr.peso_kg), 0);
    const cabina = equipajesVisibles.filter((e) => e.tipo.toLowerCase() === 'cabina').length;
    const bodega = equipajesVisibles.filter((e) => e.tipo.toLowerCase() === 'bodega').length;
    const especial = equipajesVisibles.filter((e) => e.tipo.toLowerCase() === 'especial').length;
    
    return {
      totalCount,
      pesoTotal: Math.round(pesoTotal * 10) / 10,
      cabina,
      bodega,
      especial,
    };
  }, [equipajesVisibles]);

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-primary-light uppercase">Báscula y Pesaje</span>
            </div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl text-white tracking-tight">
              Control de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Equipaje</span>
            </h1>
            <p className="mt-2 text-xs text-gray-400 max-w-xl leading-relaxed">
              {isStaff 
                ? 'Monitorea el peso total de carga de las aeronaves, gestiona equipaje especial y asigna maletas a las reservas de vuelo.'
                : 'Consulta tus maletas registradas para bodega, cabina o carga especial, y verifica el peso y límites autorizados.'}
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
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Carga Total</span>
              <div className="mt-1.5 text-xl font-black text-white">{stats.pesoTotal} <span className="text-xs text-gray-400 font-normal">kg</span></div>
              <p className="mt-0.5 text-[10px] text-gray-400">{stats.totalCount} bultos totales</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">En Cabina</span>
              <div className="mt-1.5 text-xl font-black text-emerald-300">{stats.cabina}</div>
              <p className="mt-0.5 text-[10px] text-emerald-400">Equipaje de mano</p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">En Bodega</span>
              <div className="mt-1.5 text-xl font-black text-blue-300">{stats.bodega}</div>
              <p className="mt-0.5 text-[10px] text-blue-400">Carga general facturada</p>
            </div>

            <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">Especiales</span>
              <div className="mt-1.5 text-xl font-black text-yellow-300">{stats.especial}</div>
              <p className="mt-0.5 text-[10px] text-yellow-400">Instrumentos/deportivos</p>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/0 backdrop-blur-md p-4 shadow-lg col-span-2 lg:col-span-1">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Límite Permitido</span>
              <div className="mt-1.5 text-xl font-black text-purple-300">23.0 <span className="text-xs text-purple-400 font-normal">kg</span></div>
              <p className="mt-0.5 text-[10px] text-purple-400">Por maleta facturada</p>
            </div>
          </div>

          {/* Renderizado de Vistas */}
          {isStaff ? (
            /* ================= VISTA STAFF: LISTADO DE EQUIPAJE ================= */
            <div className="border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Bultos de Equipaje Registrados</h2>
                  <p className="text-xs text-gray-400">Control de pesos e instrumentos especiales.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar por reserva, pasajero..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full sm:w-64 bg-dark/70 border border-white/15 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-light transition-all"
                  />
                  <Button size="small">
                    + Registrar Equipaje
                  </Button>
                </div>
              </div>

              {equipajesFiltrados.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No se encontraron bultos de equipaje registrados.
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
                        <th className="px-4 py-3 font-bold">Tipo</th>
                        <th className="px-4 py-3 font-bold">Peso (kg)</th>
                        <th className="px-4 py-3 font-bold">Descripción</th>
                        <th className="px-4 py-3 text-right font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipajesFiltrados.map((e) => {
                        const res = reservasPorId.get(e.reserva);
                        const pas = res ? pasajerosPorId.get(res.pasajero) : null;
                        const vue = res ? vuelosPorId.get(res.vuelo) : null;

                        const nombrePasajero = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${res?.pasajero}`;
                        const rutaVuelo = vue ? `${vue.origen_detalle?.codigo_iata || 'ORG'} → ${vue.destino_detalle?.codigo_iata || 'DST'}` : `Vuelo #${res?.vuelo}`;
                        const sobrepeso = Number(e.peso_kg) > 23;

                        return (
                          <tr key={e.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all">
                            <td className="px-4 py-3 text-gray-500">#{e.id}</td>
                            <td className="px-4 py-3 font-semibold text-white">{nombrePasajero}</td>
                            <td className="px-4 py-3 text-stone-300">Reserva #{e.reserva}</td>
                            <td className="px-4 py-3 text-stone-300">{rutaVuelo}</td>
                            <td className="px-4 py-3">
                              <span className="capitalize">{e.tipo}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-bold ${sobrepeso ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {e.peso_kg} kg {sobrepeso && '⚠️'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-stone-400 italic truncate max-w-[150px]">{e.descripcion || '—'}</td>
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
            /* ================= VISTA CLIENTE: TARJETAS DE EQUIPAJE ================= */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-wide">Mis Etiquetas de Equipaje (Luggage Tags)</h2>
                <span className="text-xs text-gray-400">{equipajesFiltrados.length} maletas registradas</span>
              </div>

              {equipajesFiltrados.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                  No registras equipaje facturado. Puedes registrar tu equipaje en la facturación o con Staff.
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {equipajesFiltrados.map((e) => {
                    const res = reservasPorId.get(e.reserva);
                    const pas = res ? pasajerosPorId.get(res.pasajero) : null;
                    const vue = res ? vuelosPorId.get(res.vuelo) : null;

                    const nombrePas = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${res?.pasajero}`;
                    const origen = vue?.origen_detalle?.codigo_iata || 'ORG';
                    const destino = vue?.destino_detalle?.codigo_iata || 'DST';
                    const peso = Number(e.peso_kg);
                    const sobrepeso = peso > 23;
                    const porcentajePeso = Math.min(100, (peso / 23) * 100);

                    // Estilo de badge del tipo de equipaje
                    const badgeEstilos = {
                      cabina: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                      bodega: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                      especial: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
                    }[e.tipo.toLowerCase()] || 'bg-stone-500/10 border-stone-500/20 text-stone-400';

                    return (
                      <div key={e.id} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 backdrop-blur-md shadow-2xl p-6 flex flex-col justify-between h-96 w-full animate-scale-in group hover:border-white/20 transition-all">
                        {/* Luggage Tag Punched Hole and Thread */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-gradient-to-b from-white/30 to-transparent" />
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#1a1a1a] border border-white/15 shadow-inner flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                        </div>

                        {/* Top Brand & Type */}
                        <div className="pt-4 text-center space-y-1">
                          <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest block">Avianco Cargo</span>
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${badgeEstilos}`}>
                            {e.tipo}
                          </span>
                        </div>

                        {/* Route Codes */}
                        <div className="text-center py-2 space-y-0.5">
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-2xl font-black text-white tracking-tighter">{origen}</span>
                            <svg className="h-4 w-4 text-gray-500 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 14l-4-4m4 4l4-4" />
                            </svg>
                            <span className="text-2xl font-black text-white tracking-tighter">{destino}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 block font-mono">Boleto Reserva #{e.reserva}</span>
                        </div>

                        {/* Báscula de peso gráfica */}
                        <div className="space-y-1.5 px-2">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[9px] uppercase font-bold text-gray-500">Báscula</span>
                            <span className={`text-base font-black ${sobrepeso ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {peso} kg
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${sobrepeso ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${porcentajePeso}%` }}
                            />
                          </div>
                          {/* Alert message if overweight */}
                          {sobrepeso ? (
                            <span className="text-[9px] font-bold text-rose-400 flex items-center justify-center gap-1 animate-pulse">
                              ⚠️ SOBREPESO (+{(peso - 23).toFixed(1)} kg)
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-500 text-center block">Equipaje dentro del límite permitido</span>
                          )}
                        </div>

                        {/* Passenger Details */}
                        <div className="text-center text-[10px] text-stone-300 border-t border-white/5 pt-2 max-w-[180px] mx-auto truncate font-medium">
                          {nombrePas}
                        </div>

                        {/* Barcode / Claim Code */}
                        <div className="space-y-1 text-center">
                          <div className="flex gap-0.5 items-end justify-center h-8 opacity-75 bg-white/5 px-3 py-1 rounded-lg">
                            {Array.from({ length: 28 }).map((_, idx) => {
                              const widths = [1, 2, 1, 3, 1, 2, 1, 1, 2];
                              const width = widths[idx % widths.length];
                              const isBlack = idx % 2 === 0;
                              return (
                                <div
                                  key={idx}
                                  className="h-full bg-white"
                                  style={{ width: `${width}px`, opacity: isBlack ? 0.9 : 0 }}
                                />
                              );
                            })}
                          </div>
                          <span className="text-[8px] font-mono text-gray-500 tracking-wider">BAG-TAG #{e.id}000{e.reserva}</span>
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
