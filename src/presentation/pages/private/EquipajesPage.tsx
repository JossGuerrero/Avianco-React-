import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../utils/formatters';
import { Modal } from '../../components/Modal';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { EstadoReserva } from '../../../domain/enums/EstadoReserva';
import { TipoEquipaje } from '../../../domain/enums/TipoEquipaje';
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

  // Estados para CRUD de Equipaje
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Equipaje | null>(null);
  const [valores, setValores] = useState({
    reserva: '',
    tipo: 'bodega',
    peso_kg: '15.0',
    descripcion: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  // Reservas disponibles para registrar maletas
  const reservasDisponibles = useMemo(() => {
    const listaReservas = isStaff 
      ? reservas 
      : reservas.filter((r) => misPasajerosIds.has(r.pasajero));
    return listaReservas.filter((r) => r.estado !== EstadoReserva.Cancelada);
  }, [reservas, isStaff, misPasajerosIds]);

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

  // Lógica CRUD
  function abrirCrear() {
    setEditando(null);
    setValores({
      reserva: reservasDisponibles[0] ? String(reservasDisponibles[0].id) : '',
      tipo: 'bodega',
      peso_kg: '15.0',
      descripcion: '',
    });
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(e: Equipaje) {
    setEditando(e);
    setValores({
      reserva: String(e.reserva),
      tipo: e.tipo,
      peso_kg: String(e.peso_kg),
      descripcion: e.descripcion || '',
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleEliminar(e: Equipaje) {
    if (!window.confirm(`¿Eliminar la etiqueta de equipaje #${e.id}?`)) return;
    try {
      await useCaseFactory.equipajes.remove(e.id);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el equipaje'));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const reservaId = Number(valores.reserva);
    const peso = Number(valores.peso_kg);
    
    if (!reservaId || !valores.tipo || Number.isNaN(peso) || peso <= 0) {
      setFormError('La reserva, tipo y peso (mayor a 0) son obligatorios');
      return;
    }

    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        reserva: reservaId,
        tipo: valores.tipo as TipoEquipaje,
        peso_kg: peso,
        descripcion: valores.descripcion.trim(),
      };

      if (editando) {
        await useCaseFactory.equipajes.update(editando.id, input);
      } else {
        await useCaseFactory.equipajes.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo registrar el equipaje'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="relative space-y-8 animate-fade-in pb-12 text-left">
      {/* Luces de Fondo Glassmorphic */}
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera Principal - Banner de Fondo Completo (Full-Bleed) */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl h-80 sm:h-64 flex items-center p-6 sm:p-8">
        {/* Foto de fondo completa */}
        <div className="absolute inset-0 z-0 opacity-25 pointer-events-none blur-[1px]">
          <img 
            src="/luggage_banner_1784573835271.png" 
            alt="Luggage Background Banner" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent" />
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10 w-full text-left">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary-light">
              <svg className="h-4 w-4 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Báscula y Pesaje
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Control de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Equipaje</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl leading-relaxed">
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
              <p className="mt-0.5 text-[10px] text-gray-400">Instrumentos/deportivos</p>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/0 backdrop-blur-md p-4 shadow-lg col-span-2 lg:col-span-1">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Límite Permitido</span>
              <div className="mt-1.5 text-xl font-black text-purple-300">23.0 <span className="text-xs text-purple-400 font-normal">kg</span></div>
              <p className="mt-0.5 text-[10px] text-gray-400">Por maleta facturada</p>
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
                  <Button size="small" onClick={abrirCrear}>
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
                              <button
                                onClick={() => abrirEditar(e)}
                                className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleEliminar(e)}
                                className="text-primary-light hover:text-primary transition-all text-xs font-semibold px-2 py-1"
                              >
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
                <h2 className="text-lg font-bold text-white tracking-wide">Mis Etiquetas de Equipaje</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{equipajesFiltrados.length} maletas registradas</span>
                  <Button size="small" onClick={abrirCrear}>
                    + Registrar Maleta
                  </Button>
                </div>
              </div>

              {equipajesFiltrados.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                  No registras equipaje facturado. Puedes registrar tu equipaje aquí mismo.
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

                    // Estilo de tarjeta según el tipo
                    const cardTheme = {
                      cabina: 'border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_8px_35px_rgba(16,185,129,0.15)] bg-gradient-to-b from-black/80 to-emerald-950/20',
                      bodega: 'border-blue-500/20 hover:border-blue-500/40 hover:shadow-[0_8px_35px_rgba(59,130,246,0.15)] bg-gradient-to-b from-black/80 to-blue-950/20',
                      especial: 'border-purple-500/20 hover:border-purple-500/40 hover:shadow-[0_8px_35px_rgba(168,85,247,0.15)] bg-gradient-to-b from-black/80 to-purple-950/20',
                    }[e.tipo.toLowerCase()] || 'border-white/10 hover:border-white/20 hover:shadow-2xl bg-gradient-to-b from-black/80 to-white/5';

                    return (
                      <div key={e.id} className={`relative overflow-hidden rounded-3xl border backdrop-blur-md shadow-2xl p-6 flex flex-col justify-between h-96 w-full animate-scale-in group transition-all duration-300 hover:-translate-y-1 ${cardTheme}`}>
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

      {/* Modal de Registro / Edición de Equipaje */}
      <Modal
        open={modalAbierto}
        title={editando ? `Editar Equipaje: #${editando.id}` : 'Registrar Equipaje'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs rounded-xl bg-primary/10 border border-primary/25 text-primary-light">
              {formError}
            </div>
          )}

          <FormSelect
            label="Reserva de Pasajero"
            required
            disabled={!!editando}
            value={valores.reserva}
            onChange={(e) => setValores((prev) => ({ ...prev, reserva: e.target.value }))}
            placeholder="Selecciona tu reserva"
            options={reservasDisponibles.map((r) => {
              const pas = pasajerosPorId.get(r.pasajero);
              const nombrePas = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${r.pasajero}`;
              const vue = vuelosPorId.get(r.vuelo);
              const ruta = vue ? `${vue.origen_detalle?.codigo_iata} ➔ ${vue.destino_detalle?.codigo_iata}` : `Vuelo #${r.vuelo}`;
              return {
                value: String(r.id),
                label: `Reserva #${r.id} · ${nombrePas} (${ruta})`,
              };
            })}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Tipo de Equipaje"
              required
              value={valores.tipo}
              onChange={(e) => setValores((prev) => ({ ...prev, tipo: e.target.value }))}
              options={[
                { value: 'bodega', label: 'Equipaje de Bodega (Hasta 23kg)' },
                { value: 'cabina', label: 'Equipaje de Cabina (Mano)' },
                { value: 'especial', label: 'Equipaje Especial (Instrumentos/Deportes)' },
              ]}
            />
            <FormInput
              label="Peso Registrado (kg)"
              required
              type="number"
              step="0.1"
              value={valores.peso_kg}
              onChange={(e) => setValores((prev) => ({ ...prev, peso_kg: e.target.value }))}
              placeholder="Ej: 15.5"
            />
          </div>

          <FormInput
            label="Descripción del Contenido (Opcional)"
            value={valores.descripcion}
            onChange={(e) => setValores((prev) => ({ ...prev, descripcion: e.target.value }))}
            placeholder="Ej: Maleta rígida azul, artículos deportivos"
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button variant="secondary" type="button" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Registrando...' : 'Registrar maleta'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
