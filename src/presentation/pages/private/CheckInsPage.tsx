import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../utils/formatters';
import { labelReserva } from '../../utils/labels';
import { Modal } from '../../components/Modal';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { EstadoReserva } from '../../../domain/enums/EstadoReserva';
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

  // Estados para CRUD de Staff
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<CheckIn | null>(null);
  const [valores, setValores] = useState({
    reserva: '',
    puerta: '',
    tarjeta_embarque: '',
    estado: 'checkin',
  });
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  // Reservas del cliente que no tienen check-in y no están canceladas
  const reservasSinCheckin = useMemo(() => {
    const reservasConCheckinIds = new Set(checkins.map((c) => c.reserva));
    const clienteReservas = reservas.filter((r) => misPasajerosIds.has(r.pasajero) && r.estado !== EstadoReserva.Cancelada);
    return clienteReservas.filter((r) => !reservasConCheckinIds.has(r.id));
  }, [reservas, checkins, misPasajerosIds]);

  // Reservas generales que no tienen check-in (para el select de creación de staff)
  const reservasDisponiblesStaff = useMemo(() => {
    const reservasConCheckinIds = new Set(checkins.map((c) => c.reserva));
    return reservas.filter((r) => r.estado !== EstadoReserva.Cancelada && (!reservasConCheckinIds.has(r.id) || (editando && r.id === editando.reserva)));
  }, [reservas, checkins, editando]);

  // Estadísticas para el panel superior (mapeadas a los estados reales: 'checkin' y 'embarcado')
  const stats = useMemo(() => {
    const total = checkinsVisibles.length;
    const confirmados = checkinsVisibles.filter((c) => c.estado.toLowerCase() === 'checkin').length;
    const embarcados = checkinsVisibles.filter((c) => c.estado.toLowerCase() === 'embarcado').length;
    const pendientes = isStaff 
      ? reservas.filter((r) => r.estado !== EstadoReserva.Cancelada).length - checkins.length
      : reservasSinCheckin.length;
    
    return {
      total,
      confirmados,
      embarcados,
      pendientes: Math.max(0, pendientes),
    };
  }, [checkinsVisibles, checkins, reservas, isStaff, reservasSinCheckin]);

  // Lógica CRUD de Staff
  function abrirCrear() {
    // Buscar la primera puerta activa disponible por defecto
    const primeraPuerta = puertas.find((p) => p.activa)?.id || '';
    setEditando(null);
    setValores({
      reserva: '',
      puerta: String(primeraPuerta),
      tarjeta_embarque: `AV-${Math.floor(10000 + Math.random() * 90000)}`,
      estado: 'checkin',
    });
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(c: CheckIn) {
    setEditando(c);
    setValores({
      reserva: String(c.reserva),
      puerta: c.puerta ? String(c.puerta) : '',
      tarjeta_embarque: c.tarjeta_embarque,
      estado: c.estado,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleEliminar(c: CheckIn) {
    if (!window.confirm(`¿Eliminar el check-in #${c.id}?`)) return;
    try {
      await useCaseFactory.checkins.remove(c.id);
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar el check-in'));
    }
  }

  // Hacer check-in rápido desde vista cliente
  async function handleCheckinRapido(reservaId: number) {
    setLoading(true);
    setError(null);
    try {
      const codigoPase = `AV-${reservaId}-${Math.floor(100 + Math.random() * 900)}`;
      
      // Dado que el backend exige una puerta no nula, buscamos la primera puerta activa
      const puertaId = puertas.find((p) => p.activa)?.id || puertas[0]?.id;
      if (!puertaId) {
        throw new Error('No hay puertas de embarque disponibles para asignar. Comunícate con Staff.');
      }

      await useCaseFactory.checkins.create({
        reserva: reservaId,
        puerta: puertaId,
        tarjeta_embarque: codigoPase,
        estado: 'checkin', // El valor aceptado por el backend para el estado de check-in inicial
      });
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo realizar el check-in de la reserva'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const reservaId = Number(valores.reserva);
    const puertaId = Number(valores.puerta);
    
    if (!reservaId || !valores.tarjeta_embarque.trim() || !valores.estado.trim() || !puertaId) {
      setFormError('La reserva, código de pase, puerta y estado son obligatorios');
      return;
    }

    // Validar duplicado
    const duplicado = checkins.find(
      (c) => c.reserva === reservaId && c.id !== editando?.id
    );
    if (duplicado) {
      setFormError(`La reserva #${reservaId} ya tiene el check-in #${duplicado.id}`);
      return;
    }

    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        reserva: reservaId,
        puerta: puertaId,
        tarjeta_embarque: valores.tarjeta_embarque.trim(),
        estado: valores.estado.trim(),
      };

      if (editando) {
        await useCaseFactory.checkins.update(editando.id, input);
      } else {
        await useCaseFactory.checkins.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (e) {
      setFormError(getErrorMessage(e, 'No se pudo guardar el check-in'));
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
            src="/checkin_banner_1784574434075.png" 
            alt="Check-in Background Banner" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent" />
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10 w-full text-left">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary-light">
              <svg className="h-4 w-4 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Servicios de Embarque
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Terminal de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Check-in</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl leading-relaxed">
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
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Con Check-in</span>
              <div className="mt-2 text-2xl font-black text-emerald-300">{stats.confirmados}</div>
              <p className="mt-1 text-[11px] text-emerald-400">Listos para volar</p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/0 backdrop-blur-md p-5 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Embarcados</span>
              <div className="mt-2 text-2xl font-black text-blue-300">{stats.embarcados}</div>
              <p className="mt-1 text-[11px] text-blue-400">En el avión</p>
            </div>

            <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-500/0 backdrop-blur-md p-5 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">Pendientes</span>
              <div className="mt-2 text-2xl font-black text-yellow-300">{stats.pendientes}</div>
              <p className="mt-1 text-[11px] text-yellow-400">Por realizar check-in</p>
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
                  <Button size="small" onClick={abrirCrear}>
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
                              <button
                                onClick={() => abrirEditar(c)}
                                className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleEliminar(c)}
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
            /* ================= VISTA CLIENTE: TARJETAS DE EMBARQUE ================= */
            <div className="space-y-8">
              
              {/* Sección 1: Reservas Pendientes por Check-in */}
              {reservasSinCheckin.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                    <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                    Reservas Pendientes de Check-in
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {reservasSinCheckin.map((r) => {
                      const vue = vuelosPorId.get(r.vuelo);
                      const pas = pasajerosPorId.get(r.pasajero);
                      const nombrePas = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${r.pasajero}`;
                      const origen = vue?.origen_detalle?.codigo_iata || 'ORG';
                      const destino = vue?.destino_detalle?.codigo_iata || 'DST';
                      const fecha = vue ? new Date(vue.fecha_salida).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '';

                      return (
                        <div key={r.id} className="border border-white/10 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-2xl p-5 flex items-center justify-between gap-4 shadow-md backdrop-blur-md">
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase font-mono font-bold text-yellow-400">Reserva #{r.id}</span>
                            <div className="text-white font-bold text-sm">
                              {origen} ➔ {destino} · <span className="text-gray-400 font-normal">{fecha}</span>
                            </div>
                            <span className="text-[11px] text-stone-300 block">Pasajero: {nombrePas} · Asiento: <span className="font-bold text-amber-300">{r.asiento}</span></span>
                          </div>
                          <Button size="small" variant="secondary" className="border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10" onClick={() => handleCheckinRapido(r.id)}>
                            Hacer Check-in
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sección 2: Mis Pases de Abordar Generados */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Tarjetas de Embarque Activas
                </h2>
                
                {checkinsFiltrados.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                    No registras tarjetas de embarque activas. Completa el check-in de tus reservas arriba.
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {checkinsFiltrados.map((c) => {
                      const res = reservasPorId.get(c.reserva);
                      const pas = res ? pasajerosPorId.get(res.pasajero) : null;
                      const vue = res ? vuelosPorId.get(res.vuelo) : null;
                      const pue = c.puerta != null ? puertasPorId.get(c.puerta) : null;

                      const nombrePasajero = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${res?.pasajero}`;
                      const origen = vue?.origen_detalle?.codigo_iata || 'ORG';
                      const destino = vue?.destino_detalle?.codigo_iata || 'DST';
                      const ciudadOrigen = vue?.origen_detalle?.ciudad || 'Origen';
                      const ciudadDestino = vue?.destino_detalle?.ciudad || 'Destino';
                      const fecha = vue ? new Date(vue.fecha_salida).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' }) : '';
                      const hora = vue ? new Date(vue.fecha_salida).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';

                      return (
                        <div key={c.id} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/5 to-white/0 backdrop-blur-md shadow-2xl flex flex-col md:flex-row max-w-3xl w-full animate-scale-in">
                          {/* Boarding ticket shape circular notches */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-6 h-6 rounded-full bg-[#1a1a1a] border-r border-white/10 hidden md:block" />
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-6 h-6 rounded-full bg-[#1a1a1a] border-l border-white/10 hidden md:block" />

                          {/* Left / Main Section (Pase principal) */}
                          <div className="flex-1 p-6 space-y-6">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-white tracking-tight">AVIANCO</span>
                                <span className="text-[9px] font-bold text-primary-light uppercase tracking-widest border border-primary/30 px-2 py-0.5 rounded">Boarding Pass</span>
                              </div>
                              <span className="text-[10px] font-mono text-gray-400">TARJETA #{c.tarjeta_embarque}</span>
                            </div>

                            {/* Airports */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-3xl font-black text-white block tracking-tighter">{origen}</span>
                                <span className="text-[10px] text-gray-400 block truncate max-w-[120px]">{ciudadOrigen}</span>
                              </div>
                              
                              <div className="flex-1 flex flex-col items-center justify-center px-4">
                                <span className="text-[10px] text-gray-500 font-bold mb-1">{fecha}</span>
                                <div className="w-full border-t border-dashed border-white/20 relative">
                                  <svg className="h-4.5 w-4.5 text-primary absolute left-1/2 -translate-x-1/2 -top-2.5 transform rotate-90" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M10.18 9 M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l8 2.5z"/>
                                  </svg>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-3xl font-black text-white block tracking-tighter">{destino}</span>
                                <span className="text-[10px] text-gray-400 block truncate max-w-[120px]">{ciudadDestino}</span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5 text-left">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-gray-500 block">Pasajero</span>
                                <span className="font-bold text-white text-xs block truncate max-w-[140px]">{nombrePasajero}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-gray-500 block">Asiento</span>
                                <span className="font-black text-amber-300 text-sm block">{res?.asiento || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-gray-500 block">Salida</span>
                                <span className="font-bold text-white text-xs block">{hora}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-gray-500 block">Puerta</span>
                                <span className="font-black text-white text-sm block">
                                  {pue ? `Puerta ${pue.codigo}` : 'Por asignar'}
                                </span>
                              </div>
                            </div>

                            {/* Simulated barcode */}
                            <div className="flex gap-0.5 items-end justify-center h-8 opacity-75 mt-2 bg-white/5 px-4 py-1 rounded-xl">
                              {Array.from({ length: 40 }).map((_, idx) => {
                                const widths = [1, 2, 3, 1, 1, 2, 4, 1, 2, 1];
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
                          </div>

                          {/* Right Section / Ticket Stub (Colilla de control) */}
                          <div className="w-full md:w-56 border-t md:border-t-0 md:border-l border-dashed border-white/10 p-6 bg-white/5 backdrop-blur-md flex flex-col justify-between items-center text-center space-y-4">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-gray-500 block">Clase</span>
                              <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 text-[10px] font-black text-primary-light uppercase tracking-wider block">
                                {res?.asiento.includes('1') || res?.asiento.includes('2') || res?.asiento.includes('3') ? 'VIP' : 'Económica'}
                              </span>
                            </div>

                            {/* QR code box */}
                            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl w-24 h-24 shadow-lg border border-white/10">
                              <div className="grid grid-cols-5 gap-1.5 w-full h-full bg-white p-1">
                                {Array.from({ length: 25 }).map((_, idx) => {
                                  const isBlack = (idx * 7 + 3) % 2 === 0 || idx === 0 || idx === 4 || idx === 20 || idx === 24;
                                  return (
                                    <div key={idx} className={`w-full h-full ${isBlack ? 'bg-black' : 'bg-white'}`} />
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-1 w-full">
                              <span className="text-[10px] text-gray-400 block truncate max-w-[150px] mx-auto">{nombrePasajero}</span>
                              <span className="text-[11px] font-bold text-white block">Reserva #{c.reserva}</span>
                            </div>
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
      )}

      {/* Modal de Asignación / CRUD de Check-in */}
      <Modal
        open={modalAbierto}
        title={editando ? `Editar Check-in: #${editando.id}` : 'Registrar Check-in'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs rounded-xl bg-primary/10 border border-primary/25 text-primary-light">
              {formError}
            </div>
          )}

          <FormSelect
            label="Reserva Asociada"
            required
            disabled={!!editando}
            value={valores.reserva}
            onChange={(e) => setValores((prev) => ({ ...prev, reserva: e.target.value }))}
            placeholder="Selecciona una reserva activa"
            options={reservasDisponiblesStaff.map((r) => {
              const pas = pasajerosPorId.get(r.pasajero);
              const nombrePas = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${r.pasajero}`;
              return {
                value: String(r.id),
                label: `Reserva #${r.id} · ${nombrePas} (Asiento: ${r.asiento})`,
              };
            })}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Tarjeta de Embarque (Código)"
              required
              value={valores.tarjeta_embarque}
              onChange={(e) => setValores((prev) => ({ ...prev, tarjeta_embarque: e.target.value }))}
              placeholder="Ej: TKT-12345"
            />
            <FormSelect
              label="Puerta de Embarque"
              required
              value={valores.puerta}
              onChange={(e) => setValores((prev) => ({ ...prev, puerta: e.target.value }))}
              placeholder="Selecciona una puerta"
              options={puertas
                .filter((p) => p.activa)
                .map((p) => ({ value: String(p.id), label: `Puerta ${p.codigo}` }))}
            />
          </div>

          <FormSelect
            label="Estado del Pasajero"
            required
            value={valores.estado}
            onChange={(e) => setValores((prev) => ({ ...prev, estado: e.target.value }))}
            options={[
              { value: 'checkin', label: 'Check-in (Realizado)' },
              { value: 'embarcado', label: 'Embarcado (En el avión)' },
            ]}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button variant="secondary" type="button" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar Registro'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
