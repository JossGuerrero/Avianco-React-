import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Reserva } from '../../../domain/entities/Reserva';
import type { Vuelo } from '../../../domain/entities/Vuelo';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import type { CheckIn } from '../../../domain/entities/CheckIn';
import type { Puerta } from '../../../domain/entities/Puerta';
import { EstadoReserva } from '../../../domain/enums/EstadoReserva';
import { EstadoVuelo } from '../../../domain/enums/EstadoVuelo';
import { EstadoFactura } from '../../../domain/enums/EstadoFactura';
import { EstadoPago } from '../../../domain/enums/EstadoPago';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { formatFecha, getErrorMessage } from '../../utils/formatters';

interface ReservaForm {
  vuelo: string;
  pasajero: string;
  asiento: string;
  estado: EstadoReserva;
}

const FORM_VACIO: ReservaForm = {
  vuelo: '',
  pasajero: '',
  asiento: '',
  estado: EstadoReserva.Confirmada,
};

export function ReservasPage() {
  const { user, isStaff } = useAuthStore();

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [vuelos, setVuelos] = useState<Vuelo[]>([]);
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [puertas, setPuertas] = useState<Puerta[]>([]);
  const [haciendoCheckin, setHaciendoCheckin] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [paginacion, setPaginacion] = useState({ hasNext: false, hasPrevious: false, count: 0 });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Reserva | null>(null);
  const [form, setForm] = useState<ReservaForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reservasPage, vuelosData, pasajerosData, checkinsData, puertasData] =
        await Promise.all([
          useCaseFactory.reservas.getPage({ page }),
          useCaseFactory.getVuelosUseCase.execute(),
          useCaseFactory.pasajeros.getAll(),
          useCaseFactory.checkins.getAll().catch(() => [] as CheckIn[]),
          useCaseFactory.puertas.getAll().catch(() => [] as Puerta[]),
        ]);
      setReservas(reservasPage.items);
      setPaginacion({
        hasNext: reservasPage.hasNext,
        hasPrevious: reservasPage.hasPrevious,
        count: reservasPage.count,
      });
      setVuelos(vuelosData);
      setPasajeros(pasajerosData);
      setCheckins(checkinsData);
      setPuertas(puertasData);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar las reservas'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Pasajeros del usuario actual (staff puede usar todos)
  const pasajerosDisponibles = useMemo(
    () => (isStaff ? pasajeros : pasajeros.filter((p) => p.usuario === user?.id)),
    [pasajeros, isStaff, user],
  );

  const reservasVisibles = useMemo(() => {
    if (isStaff) return reservas;
    const misIds = new Set(pasajerosDisponibles.map((p) => p.id));
    return reservas.filter((r) => misIds.has(r.pasajero));
  }, [reservas, pasajerosDisponibles, isStaff]);

  const vuelosPorId = useMemo(() => new Map(vuelos.map((v) => [v.id, v])), [vuelos]);
  const pasajerosPorId = useMemo(() => new Map(pasajeros.map((p) => [p.id, p])), [pasajeros]);
  const puertasPorId = useMemo(() => new Map(puertas.map((p) => [p.id, p])), [puertas]);
  const checkinPorReserva = useMemo(
    () => new Map(checkins.map((c) => [c.reserva, c])),
    [checkins],
  );

  // Check-in disponible: reserva confirmada de un vuelo que aún no salió
  // (programado o abordando).
  function puedeHacerCheckin(reserva: Reserva): boolean {
    if (reserva.estado !== EstadoReserva.Confirmada) return false;
    const vuelo = vuelosPorId.get(reserva.vuelo);
    if (!vuelo) return false;
    if (vuelo.estado !== EstadoVuelo.Programado && vuelo.estado !== EstadoVuelo.Abordando) {
      return false;
    }
    const salida = new Date(vuelo.fecha_salida).getTime();
    return Number.isNaN(salida) || salida > Date.now();
  }

  function labelVuelo(id: number): string {
    const vuelo = vuelosPorId.get(id);
    if (!vuelo) return `Vuelo #${id}`;
    const origen = vuelo.origen_detalle?.codigo_iata ?? `#${vuelo.origen}`;
    const destino = vuelo.destino_detalle?.codigo_iata ?? `#${vuelo.destino}`;
    return `${origen} → ${destino} · ${formatFecha(vuelo.fecha_salida)}`;
  }

  function labelPasajero(id: number): string {
    const pasajero = pasajerosPorId.get(id);
    if (!pasajero) return `Pasajero #${id}`;
    return pasajero.nombre_completo || pasajero.numero_pasaporte;
  }

  function abrirCrear() {
    setEditando(null);
    setForm({
      ...FORM_VACIO,
      pasajero: pasajerosDisponibles.length === 1 ? String(pasajerosDisponibles[0].id) : '',
    });
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(reserva: Reserva) {
    setEditando(reserva);
    setForm({
      vuelo: String(reserva.vuelo),
      pasajero: String(reserva.pasajero),
      asiento: reserva.asiento,
      estado: reserva.estado,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.vuelo || !form.pasajero || !form.asiento.trim()) {
      setFormError('Vuelo, pasajero y asiento son obligatorios');
      return;
    }
    const vueloId = Number(form.vuelo);
    const codigoAsiento = form.asiento.trim().toUpperCase();
    const vueloSel = vuelosPorId.get(vueloId);
    if (!editando && vueloSel && vueloSel.estado !== EstadoVuelo.Programado) {
      setFormError(`El vuelo está "${vueloSel.estado}" y ya no admite reservas nuevas`);
      return;
    }
    // Mismo asiento, mismo vuelo, reserva activa: duplicado.
    const asientoTomado = reservas.find(
      (r) =>
        r.vuelo === vueloId &&
        r.asiento.toUpperCase() === codigoAsiento &&
        r.estado !== EstadoReserva.Cancelada &&
        r.id !== editando?.id,
    );
    if (asientoTomado) {
      setFormError(
        `El asiento ${codigoAsiento} ya está tomado por la reserva #${asientoTomado.id} en ese vuelo`,
      );
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        vuelo: Number(form.vuelo),
        pasajero: Number(form.pasajero),
        asiento: form.asiento.trim().toUpperCase(),
        estado: form.estado,
      };
      if (editando) {
        await useCaseFactory.reservas.update(editando.id, input);
      } else {
        await useCaseFactory.reservas.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (e) {
      setFormError(getErrorMessage(e, 'No se pudo guardar la reserva'));
    } finally {
      setGuardando(false);
    }
  }

  async function cancelarReserva(reserva: Reserva) {
    if (!window.confirm(`¿Cancelar la reserva #${reserva.id}? Esta acción no se puede deshacer.`))
      return;
    try {
      await useCaseFactory.reservas.cancelar(reserva.id);
      // El badge cambia de inmediato, sin recargar la tabla.
      setReservas((previas) =>
        previas.map((r) =>
          r.id === reserva.id ? { ...r, estado: EstadoReserva.Cancelada } : r,
        ),
      );
      // Liberar el asiento del catálogo si estaba bloqueado (best effort:
      // usuarios sin permiso de PATCH sobre asientos no rompen la cancelación).
      try {
        const asientosVuelo = await useCaseFactory.asientos.getAll({ vuelo: reserva.vuelo });
        const asiento = asientosVuelo.find(
          (a) =>
            a.vuelo === reserva.vuelo &&
            a.codigo.toUpperCase() === reserva.asiento.toUpperCase() &&
            !a.disponible,
        );
        if (asiento) {
          await useCaseFactory.asientos.update(asiento.id, { disponible: true });
        }
      } catch {
        // Sin permisos para editar asientos: la reserva igual quedó cancelada.
      }
      // Pago y factura no deben quedar "completado"/"pagada" sobre una reserva
      // cancelada: se marcan reembolsado/anulada (best effort, igual que arriba).
      try {
        const [facturas, pagos] = await Promise.all([
          useCaseFactory.facturas.getAll({ reserva: reserva.id }).catch(() => []),
          useCaseFactory.pagos.getAll({ reserva: reserva.id }).catch(() => []),
        ]);
        await Promise.allSettled([
          ...facturas
            .filter((f) => f.reserva === reserva.id && f.estado !== EstadoFactura.Anulada)
            .map((f) => useCaseFactory.facturas.update(f.id, { estado: EstadoFactura.Anulada })),
          ...pagos
            .filter((p) => p.reserva === reserva.id && p.estado === EstadoPago.Completado)
            .map((p) => useCaseFactory.pagos.update(p.id, { estado: EstadoPago.Reembolsado })),
        ]);
      } catch {
        // Sin permisos sobre pagos/facturas: staff puede regularizarlo después.
      }
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo cancelar la reserva'));
    }
  }

  async function hacerCheckin(reserva: Reserva) {
    setHaciendoCheckin(reserva.id);
    setError(null);
    try {
      const creado = await useCaseFactory.checkins.create({
        reserva: reserva.id,
        // La puerta la asigna staff después; queda "por asignar".
        puerta: null,
        tarjeta_embarque: `BP-${reserva.vuelo}-${reserva.id}-${reserva.asiento}`,
        estado: 'pendiente',
      });
      setCheckins((previos) => [...previos, creado]);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo hacer el check-in. Intenta de nuevo.'));
    } finally {
      setHaciendoCheckin(null);
    }
  }

  async function eliminarReserva(reserva: Reserva) {
    if (!window.confirm(`¿Eliminar definitivamente la reserva #${reserva.id}?`)) return;
    try {
      await useCaseFactory.reservas.remove(reserva.id);
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar la reserva'));
    }
  }

  const columnas: Column<Reserva>[] = [
    { header: 'ID', render: (r) => <span className="text-gray-400">#{r.id}</span> },
    { header: 'Vuelo', render: (r) => labelVuelo(r.vuelo) },
    { header: 'Pasajero', render: (r) => labelPasajero(r.pasajero) },
    { header: 'Asiento', render: (r) => <span className="font-mono">{r.asiento}</span> },
    { header: 'Estado', render: (r) => <Badge estado={r.estado} /> },
    // Check-in del cliente; staff lo gestiona desde su propio módulo.
    ...(!isStaff
      ? [
          {
            header: 'Check-in',
            render: (r: Reserva) => {
              const checkin = checkinPorReserva.get(r.id);
              if (checkin) {
                const puerta =
                  checkin.puerta == null
                    ? 'Puerta por asignar'
                    : `Puerta ${puertasPorId.get(checkin.puerta)?.codigo ?? `#${checkin.puerta}`}`;
                return (
                  <div className="flex flex-col gap-1">
                    <span>
                      <Badge estado={checkin.estado} />
                    </span>
                    <span className="text-xs text-gray-400">{puerta}</span>
                  </div>
                );
              }
              if (puedeHacerCheckin(r)) {
                return (
                  <Button
                    variant="secondary"
                    isLoading={haciendoCheckin === r.id}
                    onClick={() => hacerCheckin(r)}
                  >
                    Hacer check-in
                  </Button>
                );
              }
              return <span className="text-gray-500">—</span>;
            },
          },
        ]
      : []),
  ];

  return (
    <div className="relative min-h-[600px] max-w-6xl mx-auto space-y-8 px-4 sm:px-6 py-2">
      {/* Fondo de pantalla de vuelo difuminado (Efecto atmósfera premium sin cortes) */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 blur-[100px] scale-115 pointer-events-none -z-10"
        style={{ backgroundImage: "url('/scenic_flight.png')" }}
      />

      {/* Banner de Bienvenida con Imagen de Fondo (Estilo Slate Auto + Aerolínea) */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl h-80 sm:h-64 flex items-center">
        {/* Foto del avión de fondo a la derecha con degradado para lectura */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-45 sm:opacity-65"
          style={{ 
            backgroundImage: "url('/airplane_sunset.png')",
          }}
        />
        {/* Degradado negro a la izquierda para garantizar legibilidad del texto */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-0" />
        
        {/* Contenido del Banner */}
        <div className="relative z-10 p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-6">
          <div className="space-y-2.5 max-w-xl text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary-light">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {isStaff ? 'Panel de Control' : 'Mis Viajes'}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {isStaff ? 'Todas las ' : 'Mis '}
              <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Reservas</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              {isStaff 
                ? "Bitácora global de vuelos reservados. Gestiona, modifica y controla los check-ins de toda la red de aeronaves." 
                : "Consulta tu itinerario de vuelo, realiza tu check-in digital y descarga tu tarjeta de embarque para tu próxima aventura."}
            </p>
          </div>
          {isStaff && (
            <div className="shrink-0 z-10 w-full sm:w-auto">
              <Button 
                onClick={abrirCrear}
                className="w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all duration-300 py-3 px-6 text-sm font-bold bg-primary hover:bg-primary-dark"
              >
                + Nueva Reserva
              </Button>
            </div>
          )}
        </div>
      </div>

      {!isStaff && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-black/80 to-primary/5 backdrop-blur-md p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-5 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0 h-12 w-12 rounded-full overflow-hidden border border-primary/30 shadow-inner">
              <img src="/flight_attendant.png" alt="Asistente de Vuelo" className="h-full w-full object-cover" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-primary-light uppercase tracking-wider">¿Listo para un nuevo destino?</p>
              <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
                Elige tu vuelo de exploración, selecciona tu asiento VIP o Económico y completa tu pago para asegurar tu pase de abordar.
              </p>
            </div>
          </div>
          <Link to="/vuelos" className="shrink-0 w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-primary hover:bg-primary-dark shadow-md text-xs font-bold py-2.5">
              Buscar Vuelos
            </Button>
          </Link>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light">
          {error}
        </p>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-dark-border bg-dark-surface p-6 h-56" />
            ))}
          </div>
        ) : reservasVisibles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-dark-border bg-dark-surface/50 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h3 className="mt-4 text-lg font-bold text-white">No tienes reservas activas</h3>
            <p className="mt-1 text-sm text-gray-400">Busca vuelos y reserva tu próximo destino para verlo aquí.</p>
          </div>
        ) : isStaff ? (
          <DataTable
            columns={columnas}
            data={reservasVisibles}
            getRowId={(r) => r.id}
            loading={loading}
            emptyMessage="No hay reservas registradas"
            pagination={{
              page,
              hasNext: paginacion.hasNext,
              hasPrevious: paginacion.hasPrevious,
              count: paginacion.count,
              onPageChange: setPage,
            }}
            actions={(reserva) => (
              <>
                {reserva.estado !== EstadoReserva.Cancelada && (
                  <Button variant="ghost" onClick={() => cancelarReserva(reserva)}>
                    Cancelar
                  </Button>
                )}
                <>
                  <Button variant="secondary" onClick={() => abrirEditar(reserva)}>
                    Editar
                  </Button>
                  <Button variant="danger" onClick={() => eliminarReserva(reserva)}>
                    Eliminar
                  </Button>
                </>
              </>
            )}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {reservasVisibles.map((reserva) => {
              const vuelo = vuelosPorId.get(reserva.vuelo);
              const pasajero = pasajerosPorId.get(reserva.pasajero);
              const checkin = checkinPorReserva.get(reserva.id);
              const puertaObj = checkin?.puerta != null ? puertasPorId.get(checkin.puerta) : null;
              
              const origenIata = vuelo?.origen_detalle?.codigo_iata ?? 'SLO';
              const destinoIata = vuelo?.destino_detalle?.codigo_iata ?? 'DST';
              const origenCiudad = vuelo?.origen_detalle?.nombre ?? 'Origen';
              const destinoCiudad = vuelo?.destino_detalle?.nombre ?? 'Destino';
              
              const isVip = reserva.asiento.toUpperCase().startsWith('1') || reserva.asiento.toUpperCase().startsWith('2');

              return (
                <div 
                  key={reserva.id}
                  className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-black/85 to-[#3d0b13]/25 shadow-xl flex flex-col justify-between min-h-[260px] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-[0_8px_35px_rgb(211,47,47,0.15)] animate-fade-in text-left"
                >
                  {/* Decoraciones del Boleto (Ticket Cutouts) */}
                  <div className="absolute -left-3 top-[65%] h-6 w-6 rounded-full bg-[#0a0606] border-r border-primary/30" />
                  <div className="absolute -right-3 top-[65%] h-6 w-6 rounded-full bg-[#0a0606] border-l border-primary/30" />

                  {/* Cabecera del Pase de Abordar */}
                  <div className="flex items-center justify-between border-b border-primary/20 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black tracking-widest text-primary-light uppercase">Pase de Abordar</span>
                      <Badge estado={reserva.estado} />
                    </div>
                    <span className="text-xs font-mono font-bold text-primary-light">RESERVA #{reserva.id}</span>
                  </div>

                  {/* Cuerpo del Boleto: Ruta y Detalles */}
                  <div className="py-4 space-y-4">
                    {/* Ruta de Vuelo */}
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-3xl font-black text-white leading-none tracking-tight">{origenIata}</span>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">{origenCiudad}</p>
                      </div>
                      
                      <div className="flex-1 flex flex-col items-center px-4 relative">
                        <span className="text-[9px] text-primary-light font-bold uppercase tracking-widest mb-1">Confirmado</span>
                        <div className="w-full flex items-center justify-center relative">
                          <div className="absolute left-0 right-0 border-t border-dashed border-primary/30 top-1/2 -translate-y-1/2" />
                          <svg className="h-4 w-4 text-primary-light bg-[#12080a] px-0.5 z-10 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </div>
                        <span className="text-[9px] text-gray-500 mt-1">{vuelo?.fecha_salida ? new Date(vuelo.fecha_salida).toLocaleDateString() : '—'}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-3xl font-black text-white leading-none tracking-tight">{destinoIata}</span>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">{destinoCiudad}</p>
                      </div>
                    </div>

                    {/* Información del Pasajero y Asiento */}
                    <div className="grid grid-cols-2 gap-4 text-left border-t border-primary/20 pt-4">
                      <div>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Pasajero</span>
                        <span className="text-sm font-bold text-stone-100 block truncate">{pasajero?.nombre_completo || pasajero?.numero_pasaporte || 'Sin nombre'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Asiento ({isVip ? 'VIP' : 'Económico'})</span>
                        <span className={`inline-block text-sm font-black font-mono px-2 py-0.5 rounded ${isVip ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-green-500/10 text-green-300 border border-green-500/20'}`}>
                          {reserva.asiento}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Separación troquelada */}
                  <div className="border-t border-dashed border-primary/30 -mx-6 my-2" />

                  {/* Sección de Check-in y Acciones */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-left">
                      {checkin ? (
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-gray-500 uppercase block">Check-in Realizado</span>
                          <div className="flex items-center gap-1.5">
                            <Badge estado={checkin.estado} />
                            <span className="text-[11px] font-bold text-primary-light">
                              {puertaObj ? `Puerta ${puertaObj.codigo}` : 'Puerta por asignar'}
                            </span>
                          </div>
                        </div>
                      ) : puedeHacerCheckin(reserva) ? (
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-yellow-500 uppercase block">Check-in Pendiente</span>
                          <span className="text-[10px] text-gray-400 block">Abierto para pre-registro</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 font-semibold italic">Check-in no disponible</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {reserva.estado !== EstadoReserva.Cancelada && (
                        <Button 
                          variant="ghost" 
                          onClick={() => cancelarReserva(reserva)}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          Cancelar
                        </Button>
                      )}
                      
                      {!checkin && puedeHacerCheckin(reserva) && (
                        <Button
                          variant="secondary"
                          isLoading={haciendoCheckin === reserva.id}
                          onClick={() => hacerCheckin(reserva)}
                          className="bg-primary hover:bg-primary-dark text-white border-none text-xs font-bold px-4.5 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                        >
                          Hacer check-in
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={modalAbierto}
        title={editando ? `Editar reserva #${editando.id}` : 'Nueva reserva'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSelect
            label="Vuelo"
            value={form.vuelo}
            onChange={(e) => setForm((f) => ({ ...f, vuelo: e.target.value }))}
            placeholder="Selecciona un vuelo"
            options={vuelos.map((v) => ({ value: String(v.id), label: labelVuelo(v.id) }))}
          />
          
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              label="Pasajero"
              value={form.pasajero}
              onChange={(e) => setForm((f) => ({ ...f, pasajero: e.target.value }))}
              placeholder="Selecciona un pasajero"
              options={pasajerosDisponibles.map((p) => ({
                value: String(p.id),
                label: labelPasajero(p.id),
              }))}
            />
            <FormInput
              label="Asiento"
              value={form.asiento}
              onChange={(e) => setForm((f) => ({ ...f, asiento: e.target.value }))}
              placeholder="Ej: 12A"
              maxLength={4}
            />
          </div>

          {isStaff && (
            <FormSelect
              label="Estado"
              value={form.estado}
              onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoReserva }))}
              options={Object.values(EstadoReserva).map((estado) => ({
                value: estado,
                label: estado,
              }))}
            />
          )}

          {formError && (
            <p className="rounded-xl border border-primary/45 bg-primary/10 px-4 py-2.5 text-xs text-primary-light animate-fade-in">
              {formError}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-dark-border pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setModalAbierto(false)}
              className="border border-primary/20 hover:bg-[#3d0b13]/25 px-5 py-2.5 rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              isLoading={guardando}
              className="bg-primary hover:bg-primary-dark text-white border-none px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              {editando ? 'Guardar cambios' : 'Crear reserva'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
