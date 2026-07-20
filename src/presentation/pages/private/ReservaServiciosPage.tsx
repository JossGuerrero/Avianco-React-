import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ReservaServicio } from '../../../domain/entities/ReservaServicio';
import type { Reserva } from '../../../domain/entities/Reserva';
import type { Servicio } from '../../../domain/entities/Servicio';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import type { Vuelo } from '../../../domain/entities/Vuelo';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { formatPrecio, getErrorMessage } from '../../utils/formatters';

export function ReservaServiciosPage() {
  const { user, isStaff } = useAuthStore();

  const [reservaServicios, setReservaServicios] = useState<ReservaServicio[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([]);
  const [vuelos, setVuelos] = useState<Vuelo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<ReservaServicio | null>(null);
  const [valores, setValores] = useState({
    reserva: '',
    servicio: '',
    cantidad: '1',
    precio_aplicado: '0',
  });
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Maps para búsquedas rápidas
  const serviciosPorId = useMemo(() => new Map(servicios.map((s) => [s.id, s])), [servicios]);
  const reservasPorId = useMemo(() => new Map(reservas.map((r) => [r.id, r])), [reservas]);
  const pasajerosPorId = useMemo(() => new Map(pasajeros.map((p) => [p.id, p])), [pasajeros]);
  const vuelosPorId = useMemo(() => new Map(vuelos.map((v) => [v.id, v])), [vuelos]);

  // Pasajeros del cliente actual (el staff ve todos)
  const misPasajerosIds = useMemo(() => {
    return new Set(pasajeros.filter((p) => isStaff || p.usuario === user?.id).map((p) => p.id));
  }, [pasajeros, isStaff, user]);

  // Reservas visibles (del cliente o todas)
  const misReservasIds = useMemo(() => {
    return new Set(reservas.filter((r) => isStaff || misPasajerosIds.has(r.pasajero)).map((r) => r.id));
  }, [reservas, misPasajerosIds, isStaff]);

  // Filtrar servicios de reserva correspondientes
  const serviciosVisibles = useMemo(() => {
    return reservaServicios.filter((rs) => isStaff || misReservasIds.has(rs.reserva));
  }, [reservaServicios, misReservasIds, isStaff]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rsData, rData, sData, pData, vData] = await Promise.all([
        useCaseFactory.reservaServicios.getAll(),
        useCaseFactory.reservas.getAll().catch(() => []),
        useCaseFactory.servicios.getAll().catch(() => []),
        useCaseFactory.pasajeros.getAll().catch(() => []),
        useCaseFactory.getVuelosUseCase.execute().catch(() => []),
      ]);
      setReservaServicios(rsData);
      setReservas(rData);
      setServicios(sData);
      setPasajeros(pData);
      setVuelos(vData);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los datos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function labelReservaLocal(id: number): string {
    const res = reservasPorId.get(id);
    if (!res) return `Reserva #${id}`;
    const pas = pasajerosPorId.get(res.pasajero);
    const vue = vuelosPorId.get(res.vuelo);
    const ruta = vue ? `${vue.origen_detalle?.codigo_iata ?? 'SLO'} → ${vue.destino_detalle?.codigo_iata ?? 'DST'}` : `Vuelo #${res.vuelo}`;
    const nombrePasajero = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${res.pasajero}`;
    return `#${res.id} · ${nombrePasajero} (${ruta})`;
  }

  function abrirCrear() {
    setEditando(null);
    const reservasDisponibles = reservas.filter((r) => isStaff || misReservasIds.has(r.id));
    setValores({
      reserva: reservasDisponibles.length > 0 ? String(reservasDisponibles[0].id) : '',
      servicio: servicios.length > 0 ? String(servicios[0].id) : '',
      cantidad: '1',
      precio_aplicado: '0',
    });
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(rs: ReservaServicio) {
    setEditando(rs);
    setValores({
      reserva: String(rs.reserva),
      servicio: String(rs.servicio),
      cantidad: String(rs.cantidad),
      precio_aplicado: String(rs.precio_aplicado),
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        reserva: Number(valores.reserva),
        servicio: Number(valores.servicio),
        cantidad: Number(valores.cantidad),
        precio_aplicado: Number(valores.precio_aplicado),
      };
      if (editando) {
        await useCaseFactory.reservaServicios.update(editando.id, input);
      } else {
        await useCaseFactory.reservaServicios.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (e) {
      setFormError(getErrorMessage(e, 'No se pudo guardar el servicio de reserva'));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(rs: ReservaServicio) {
    if (!window.confirm(`¿Eliminar el servicio de reserva #${rs.id}?`)) return;
    try {
      await useCaseFactory.reservaServicios.remove(rs.id);
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar el servicio de reserva'));
    }
  }

  function renderIconoServicio(nombre: string, colorClass: string = 'text-primary-light') {
    const n = nombre.toLowerCase();
    if (n.includes('equipaje') || n.includes('maleta') || n.includes('bolsa')) {
      return (
        <svg className={`h-6 w-6 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    }
    if (n.includes('comida') || n.includes('almuerzo') || n.includes('bebida') || n.includes('menu')) {
      return (
        <svg className={`h-6 w-6 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (n.includes('prioridad') || n.includes('embarque') || n.includes('rapido')) {
      return (
        <svg className={`h-6 w-6 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
        </svg>
      );
    }
    if (n.includes('mascota') || n.includes('perro') || n.includes('gato') || n.includes('cabina')) {
      return (
        <svg className={`h-6 w-6 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.871 4A17.926 17.926 0 003 12c0 5.186 2.447 9.8 6.262 12.75M9 9c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3z" />
        </svg>
      );
    }
    if (n.includes('sala') || n.includes('vip') || n.includes('lounge')) {
      return (
        <svg className={`h-6 w-6 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    }
    return (
      <svg className={`h-6 w-6 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    );
  }

  return (
    <div className="relative min-h-[600px] max-w-6xl mx-auto space-y-8 px-4 sm:px-6 py-2">
      {/* Fondo de pantalla de vuelo difuminado (Efecto atmósfera premium sin cortes) */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 blur-[100px] scale-115 pointer-events-none -z-10"
        style={{ backgroundImage: "url('/scenic_flight.png')" }}
      />

      {/* Banner de Bienvenida con Imagen de Fondo Completa (Full-Bleed) */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl h-80 sm:h-64 flex items-center">
        {/* Foto del avión de fondo completa */}
        <div className="absolute inset-0 z-0 opacity-25 pointer-events-none blur-[1px]">
          <img 
            src="/reserva_servicios_banner_1784572378747.png" 
            alt="Background Banner" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent" />
        </div>
        
        {/* Contenido del Banner */}
        <div className="relative z-10 p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-6">
          <div className="space-y-2.5 max-w-xl text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary-light">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              {isStaff ? 'Panel de Adición' : 'Mis Servicios Adicionales'}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Servicios por <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Reserva</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              {isStaff 
                ? "Asigna, gestiona y edita los beneficios y servicios adicionales comprados para cada reserva de vuelo." 
                : "Revisa los adicionales adquiridos para tu viaje, como maletas extra, comidas premium y salas VIP."}
            </p>
          </div>
          {isStaff && (
            <div className="shrink-0 z-10 w-full sm:w-auto">
              <Button 
                onClick={abrirCrear}
                className="w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all duration-300 py-3 px-6 text-sm font-bold bg-primary hover:bg-primary-dark"
              >
                + Asignar Servicio
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tarjeta de Asistente de Vuelo de Bienvenida (Efecto Espejo / Glassmorphism) */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-black/80 to-primary/5 backdrop-blur-md p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-5 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 h-12 w-12 rounded-full overflow-hidden border border-primary/30 shadow-inner">
            <img src="/flight_attendant.png" alt="Asistente de Vuelo" className="h-full w-full object-cover" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-primary-light uppercase tracking-wider">Servicios y Equipajes Extra</p>
            <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
              Los beneficios adicionales asociados a tu reserva se activarán automáticamente durante el abordaje al escanear tu pase digital.
            </p>
          </div>
        </div>
        {!isStaff && (
          <Link to="/vuelos" className="shrink-0 w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-primary hover:bg-primary-dark shadow-md text-xs font-bold py-2.5">
              Buscar Más Vuelos
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light text-left">
          {error}
        </p>
      )}

      {/* Renderizado de Datos: Tabla para Staff, Tarjetas Negras Difuminadas para Clientes */}
      <div className="mt-6">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-dark-border bg-dark-surface p-6 h-40" />
            ))}
          </div>
        ) : serviciosVisibles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-dark-border bg-dark-surface/50 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-bold text-white">Sin servicios adicionales</h3>
            <p className="mt-1 text-sm text-gray-400">Las reservas consultadas no registran servicios o maletas adicionales aún.</p>
          </div>
        ) : isStaff ? (
          <DataTable
            columns={[
              { header: 'Reserva', render: (rs) => `Reserva #${rs.reserva}` },
              { header: 'Servicio', render: (rs) => serviciosPorId.get(rs.servicio)?.nombre ?? `#${rs.servicio}` },
              { header: 'Cantidad', render: (rs) => rs.cantidad },
              {
                header: 'Precio aplicado',
                render: (rs) => <span className="font-semibold">{formatPrecio(rs.precio_aplicado)}</span>,
              },
            ]}
            data={serviciosVisibles}
            getRowId={(rs) => rs.id}
            loading={loading}
            emptyMessage="No hay servicios registrados"
            actions={(rs) => (
              <>
                <Button variant="secondary" onClick={() => abrirEditar(rs)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => eliminar(rs)}>
                  Eliminar
                </Button>
              </>
            )}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {serviciosVisibles.map((rs) => {
              const servicio = serviciosPorId.get(rs.servicio);
              const reserva = reservasPorId.get(rs.reserva);
              const vuelo = reserva ? vuelosPorId.get(reserva.vuelo) : null;
              const pasajero = reserva ? pasajerosPorId.get(reserva.pasajero) : null;

              const ruta = vuelo ? `${vuelo.origen_detalle?.codigo_iata ?? 'SLO'} → ${vuelo.destino_detalle?.codigo_iata ?? 'DST'}` : `Vuelo #${reserva?.vuelo}`;
              const nombrePasajero = pasajero ? (pasajero.nombre_completo || pasajero.numero_pasaporte) : `Pasajero #${reserva?.pasajero}`;

              const tipoLower = (servicio?.tipo || '').toLowerCase();
              const theme = {
                comida: {
                  border: 'border-orange-500/20 hover:border-orange-500/40 hover:shadow-[0_8px_35px_rgba(249,115,22,0.15)]',
                  bgIcon: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
                  badge: 'text-orange-400',
                },
                equipaje: {
                  border: 'border-blue-500/20 hover:border-blue-500/40 hover:shadow-[0_8px_35px_rgba(59,130,246,0.15)]',
                  bgIcon: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                  badge: 'text-blue-400',
                },
                asiento: {
                  border: 'border-purple-500/20 hover:border-purple-500/40 hover:shadow-[0_8px_35px_rgba(168,85,247,0.15)]',
                  bgIcon: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
                  badge: 'text-purple-400',
                },
                wifi: {
                  border: 'border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-[0_8px_35px_rgba(6,182,212,0.15)]',
                  bgIcon: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
                  badge: 'text-cyan-400',
                },
                seguro: {
                  border: 'border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_8px_35px_rgba(16,185,129,0.15)]',
                  bgIcon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                  badge: 'text-emerald-400',
                },
              }[tipoLower] || {
                border: 'border-white/10 hover:border-white/20 hover:shadow-[0_8px_35px_rgba(255,255,255,0.05)]',
                bgIcon: 'bg-white/5 border-white/10 text-white',
                badge: 'text-gray-400',
              };

              return (
                <div 
                  key={rs.id}
                  className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br from-black/85 to-white/5 backdrop-blur-md p-6 shadow-xl flex flex-col justify-between min-h-[190px] transition-all duration-300 hover:-translate-y-1 animate-scale-in text-left ${theme.border}`}
                >
                  <div className="space-y-4">
                    {/* Encabezado de la Tarjeta */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${theme.bgIcon}`}>
                          {renderIconoServicio(servicio?.nombre ?? '', theme.badge)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white leading-tight">{servicio?.nombre ?? 'Servicio Adicional'}</h3>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${theme.badge}`}>{servicio?.tipo ?? 'Catálogo'}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-gray-500">COD #{rs.id}</span>
                    </div>

                    {/* Detalles de Reserva Relacionada */}
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/10 pt-3">
                      <div>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Reserva / Ruta</span>
                        <span className="font-semibold text-stone-200 block truncate">{ruta}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Pasajero</span>
                        <span className="font-semibold text-stone-200 block truncate">{nombrePasajero}</span>
                      </div>
                    </div>
                  </div>

                  {/* Precios y Cantidades */}
                  <div className="border-t border-white/10 pt-3 mt-4 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Total Adicional</span>
                      <span className="text-base font-black text-amber-300">{formatPrecio(rs.precio_aplicado * rs.cantidad)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-semibold">{formatPrecio(rs.precio_aplicado)} x {rs.cantidad}</span>
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
        title={editando ? 'Editar servicio' : 'Nuevo servicio'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormSelect
            label="Reserva"
            value={valores.reserva}
            onChange={(e) => setValores((v) => ({ ...v, reserva: e.target.value }))}
            placeholder="Selecciona una reserva"
            options={reservas.map((r) => ({ value: String(r.id), label: labelReservaLocal(r.id) }))}
          />
          <FormSelect
            label="Servicio"
            value={valores.servicio}
            onChange={(e) => setValores((v) => ({ ...v, servicio: e.target.value }))}
            placeholder="Selecciona un servicio"
            options={servicios.map((s) => ({
              value: String(s.id),
              label: `${s.nombre} (${formatPrecio(s.precio)})`,
            }))}
          />
          <FormInput
            label="Cantidad"
            type="number"
            value={valores.cantidad}
            onChange={(e) => setValores((v) => ({ ...v, cantidad: e.target.value }))}
          />
          <FormInput
            label="Precio aplicado"
            type="number"
            step="0.01"
            value={valores.precio_aplicado}
            onChange={(e) => setValores((v) => ({ ...v, precio_aplicado: e.target.value }))}
          />

          {formError && (
            <p className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary-light">
              {formError}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={guardando}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
