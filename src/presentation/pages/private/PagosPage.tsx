import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Pago } from '../../../domain/entities/Pago';
import type { MetodoPago } from '../../../domain/entities/MetodoPago';
import type { Reserva } from '../../../domain/entities/Reserva';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import { EstadoPago } from '../../../domain/enums/EstadoPago';
import { EstadoReserva } from '../../../domain/enums/EstadoReserva';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { PageHero } from '../../components/PageHero';
import { AVIATION_IMAGES, fallbackDeImagen } from '../../utils/aviationImages';
import { formatPrecio, getErrorMessage } from '../../utils/formatters';

interface PagoForm {
  reserva: string;
  metodo_pago: string;
  monto: string;
  estado: EstadoPago;
  referencia: string;
}

const FORM_VACIO: PagoForm = {
  reserva: '',
  metodo_pago: '',
  monto: '',
  estado: EstadoPago.Pendiente,
  referencia: '',
};

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

  // Estados para CRUD de Staff
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Pago | null>(null);
  const [form, setForm] = useState<PagoForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Estados para la Pasarela de Pago (Checkout)
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPago, setCheckoutPago] = useState<Pago | null>(null);
  const [valoresTarjeta, setValoresTarjeta] = useState({
    numero: '',
    nombre: '',
    exp: '',
    cvv: '',
  });
  const [procesandoCheckout, setProcesandoCheckout] = useState(false);
  const [pasoProcesamiento, setPasoProcesamiento] = useState('');

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

  // Abrir pasarela de pago para clientes
  function abrirCheckout(pago: Pago) {
    setCheckoutPago(pago);
    setValoresTarjeta({
      numero: '',
      nombre: '',
      exp: '',
      cvv: '',
    });
    setProcesandoCheckout(false);
    setPasoProcesamiento('');
    setCheckoutOpen(true);
  }

  // Ejecutar procesamiento bancario simulado
  async function handleEjecutarPago(e: FormEvent) {
    e.preventDefault();
    if (!checkoutPago) return;
    if (
      !valoresTarjeta.numero.trim() ||
      !valoresTarjeta.nombre.trim() ||
      !valoresTarjeta.exp.trim() ||
      !valoresTarjeta.cvv.trim()
    ) {
      alert('Por favor completa todos los datos de la tarjeta.');
      return;
    }

    setProcesandoCheckout(true);
    
    const pasos = [
      'Conectando de forma segura con la pasarela bancaria...',
      'Verificando validez del número de tarjeta...',
      'Validando saldo y autorizando cobro...',
      '¡Cobro aprobado! Generando número de confirmación bancaria...',
    ];

    for (let i = 0; i < pasos.length; i++) {
      setPasoProcesamiento(pasos[i]);
      await new Promise((r) => setTimeout(r, 900));
    }

    try {
      const refBancaria = `TRX-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
      await useCaseFactory.pagos.update(checkoutPago.id, {
        estado: EstadoPago.Completado,
        referencia: refBancaria,
      });
      setCheckoutOpen(false);
      await cargar();
    } catch (err) {
      alert(getErrorMessage(err, 'Ocurrió un error al registrar tu pago en el servidor'));
      setProcesandoCheckout(false);
    }
  }

  // Lógica CRUD de Staff
  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(pago: Pago) {
    setEditando(pago);
    setForm({
      reserva: String(pago.reserva),
      metodo_pago: String(pago.metodo_pago),
      monto: String(pago.monto),
      estado: pago.estado,
      referencia: pago.referencia,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleEliminar(pago: Pago) {
    if (!window.confirm(`¿Eliminar el pago #${pago.id}?`)) return;
    try {
      await useCaseFactory.pagos.remove(pago.id);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el pago'));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const monto = Number(form.monto);
    
    if (!form.reserva || !form.metodo_pago || Number.isNaN(monto) || monto <= 0) {
      setFormError('La reserva, el método de pago y un monto válido son obligatorios');
      return;
    }
    
    const reservaId = Number(form.reserva);
    const reservaSel = reservas.find((r) => r.id === reservaId);
    if (reservaSel?.estado === EstadoReserva.Cancelada) {
      setFormError('No se puede registrar un pago sobre una reserva cancelada');
      return;
    }
    const pagoPrevio = pagos.find(
      (p) =>
        p.reserva === reservaId &&
        p.estado === EstadoPago.Completado &&
        p.id !== editando?.id
    );
    if (pagoPrevio && form.estado === EstadoPago.Completado) {
      setFormError(
        `Esta reserva ya tiene el pago #${pagoPrevio.id} completado por ${formatPrecio(pagoPrevio.monto)}. Reembólsalo antes de registrar otro.`
      );
      return;
    }

    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        reserva: reservaId,
        metodo_pago: Number(form.metodo_pago),
        monto,
        estado: form.estado,
        referencia: form.referencia.trim(),
      };

      if (editando) {
        await useCaseFactory.pagos.update(editando.id, input);
      } else {
        await useCaseFactory.pagos.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo guardar el pago'));
    } finally {
      setGuardando(false);
    }
  }

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
    <div className="space-y-6">
      <PageHero
        titulo={isStaff ? 'Pagos' : 'Mis pagos'}
        destacado="Pagos"
        subtitulo="Registro de transacciones, métodos de pago y estados de cobro"
        imagen={AVIATION_IMAGES.pagos}
        imagenFallback={fallbackDeImagen(AVIATION_IMAGES.pagos)}
        accion={
          <div className="flex flex-wrap items-center gap-3">
            {pagosVisibles.length > 0 && (
              <span className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                {pagosVisibles.length} pagos
              </span>
            )}
            {isStaff && <Button onClick={abrirCrear}>+ Nuevo pago</Button>}
          </div>
        }
        compacto
      />

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
                  <Button size="small" onClick={abrirCrear}>
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
                              <button
                                onClick={() => abrirEditar(p)}
                                className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleEliminar(p)}
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
            /* ================= VISTA CLIENTE: HISTORIAL DE PAGOS ================= */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-wide">Mis Recibos y Transacciones</h2>
                <span className="text-xs text-gray-400">{pagosFiltrados.length} transacciones registradas</span>
              </div>

              {pagosFiltrados.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                  No registras transacciones financieras en tu cuenta.
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {pagosFiltrados.map((p) => {
                    const res = reservasPorId.get(p.reserva);
                    const pas = res ? pasajerosPorId.get(res.pasajero) : null;
                    const vue = res ? vuelosPorId.get(res.vuelo) : null;
                    const metodo = metodosPorId.get(p.metodo_pago)?.nombre || `Método #${p.metodo_pago}`;

                    const nombrePas = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${res?.pasajero}`;
                    const origen = vue?.origen_detalle?.codigo_iata || 'ORG';
                    const destino = vue?.destino_detalle?.codigo_iata || 'DST';
                    const esPendiente = p.estado === EstadoPago.Pendiente;

                    return (
                      <div key={p.id} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 backdrop-blur-md shadow-xl p-6 flex flex-col justify-between h-[300px] w-full animate-scale-in hover:border-white/20 transition-all">
                        {/* Receipt Top Section */}
                        <div className="flex items-center justify-between border-b border-dashed border-white/10 pb-3">
                          <div>
                            <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-mono">ID de Pago</span>
                            <span className="font-bold text-white text-xs">#TRX-{p.id}00{p.reserva}</span>
                          </div>
                          <Badge estado={p.estado} />
                        </div>

                        {/* Route and Passenger Info */}
                        <div className="space-y-1.5 py-2">
                          <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-mono">Detalle del Vuelo</span>
                          <div className="text-sm font-bold text-white">
                            {origen} ➔ {destino} · <span className="text-gray-400 font-normal">Reserva #{p.reserva}</span>
                          </div>
                          <span className="text-[11px] text-stone-300 block">Pasajero: {nombrePas}</span>
                          <span className="text-[11px] text-stone-400 block">Método de pago: <span className="text-stone-300 font-semibold">{metodo}</span></span>
                        </div>

                        {/* Amount & Button */}
                        <div className="flex items-end justify-between border-t border-dashed border-white/10 pt-3 mt-auto">
                          <div>
                            <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-mono">Monto Total</span>
                            <span className="text-lg font-black text-white">{formatPrecio(p.monto)}</span>
                          </div>
                          {esPendiente ? (
                            <Button size="small" onClick={() => abrirCheckout(p)}>
                              Pagar Ahora
                            </Button>
                          ) : (
                            <div className="text-right">
                              <span className="text-[9px] text-gray-500 block uppercase tracking-wider font-mono">Referencia</span>
                              <span className="font-mono text-[10px] text-emerald-400 font-bold block truncate max-w-[120px]">{p.referencia || 'VALIDADO'}</span>
                            </div>
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

      {/* Modal de CRUD de Pago (Staff) */}
      <Modal
        open={modalAbierto}
        title={editando ? `Editar pago #${editando.id}` : 'Nuevo pago'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {formError && (
            <p className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-xs text-primary-light">
              {formError}
            </p>
          )}

          <FormSelect
            label="Reserva Asociada"
            required
            disabled={!!editando}
            value={form.reserva}
            onChange={(e) => setForm((f) => ({ ...f, reserva: e.target.value }))}
            placeholder="Selecciona una reserva"
            options={reservas
              .filter((r) => r.estado !== EstadoReserva.Cancelada)
              .map((r) => {
                const pas = pasajerosPorId.get(r.pasajero);
                const nombrePas = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${r.pasajero}`;
                return {
                  value: String(r.id),
                  label: `Reserva #${r.id} · ${nombrePas} (Asiento ${r.asiento})`,
                };
              })}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Método de pago"
              required
              value={form.metodo_pago}
              onChange={(e) => setForm((f) => ({ ...f, metodo_pago: e.target.value }))}
              placeholder="Selecciona un método"
              options={metodos
                .filter((m) => m.activo)
                .map((m) => ({ value: String(m.id), label: `${m.nombre} (${m.tipo})` }))}
            />
            <FormInput
              label="Monto ($)"
              required
              type="number"
              min={0}
              step="0.01"
              value={form.monto}
              onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              placeholder="Ej: 297.50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Estado"
              required
              value={form.estado}
              onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoPago }))}
              options={Object.values(EstadoPago).map((estado) => ({
                value: estado,
                label: estado.charAt(0).toUpperCase() + estado.slice(1),
              }))}
            />
            <FormInput
              label="Referencia de Transacción"
              value={form.referencia}
              onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
              placeholder="Ej: TRX-20260713-001"
            />
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t border-white/10 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear pago'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Checkout / Pasarela de Pago Simulada (Clientes) */}
      <Modal
        open={checkoutOpen}
        title="Pasarela de Pago Segura (Checkout)"
        onClose={() => !procesandoCheckout && setCheckoutOpen(false)}
      >
        {procesandoCheckout ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-primary animate-spin" />
            </div>
            <p className="text-sm font-bold text-white tracking-wide animate-pulse">{pasoProcesamiento}</p>
            <p className="text-xs text-gray-500">Por favor no cierres ni recargues esta ventana.</p>
          </div>
        ) : (
          <form onSubmit={handleEjecutarPago} className="space-y-6 text-left">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-stone-300 flex items-center justify-between">
              <div>
                <span className="block text-[10px] text-gray-400 uppercase font-mono">Monto a pagar</span>
                <span className="text-lg font-black text-white">{checkoutPago ? formatPrecio(checkoutPago.monto) : '$0.00'}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-gray-400 uppercase font-mono">Reserva relacionada</span>
                <span className="font-bold text-amber-300">Reserva #{checkoutPago?.reserva}</span>
              </div>
            </div>

            {/* Tarjeta de Crédito Holográfica Interactiva */}
            <div className="relative overflow-hidden rounded-2xl aspect-[1.586/1] bg-gradient-to-br from-[#2a2a2a] via-[#151515] to-[#252525] border border-white/15 p-6 shadow-2xl flex flex-col justify-between max-w-sm mx-auto">
              <div className="absolute -right-20 -bottom-20 w-44 h-44 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <div className="h-8 w-10 bg-amber-400/20 rounded-md border border-amber-400/35 relative flex items-center justify-center">
                  <div className="h-5 w-6 border-r border-white/20 absolute left-2" />
                  <div className="h-5 w-6 border-l border-white/20 absolute right-2" />
                </div>
                <span className="font-black text-white text-sm tracking-widest italic opacity-75">AVIANCO</span>
              </div>

              <div className="text-xl font-mono text-white tracking-widest py-4 drop-shadow-md">
                {valoresTarjeta.numero.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim() || '•••• •••• •••• ••••'}
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[7px] text-gray-500 block uppercase tracking-wider font-mono">Tarjetahabiente</span>
                  <span className="text-xs font-mono text-white tracking-wide uppercase truncate max-w-[150px] block">
                    {valoresTarjeta.nombre || 'Nombre Completo'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[7px] text-gray-500 block uppercase tracking-wider font-mono">Vence</span>
                  <span className="text-xs font-mono text-white tracking-wide block">
                    {valoresTarjeta.exp || 'MM/AA'}
                  </span>
                </div>
              </div>
            </div>

            {/* Campos de Entrada de Tarjeta */}
            <div className="space-y-4">
              <FormInput
                label="Nombre en la Tarjeta"
                required
                value={valoresTarjeta.nombre}
                onChange={(e) => setValoresTarjeta(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Juan Perez"
              />

              <FormInput
                label="Número de Tarjeta"
                required
                maxLength={19}
                value={valoresTarjeta.numero}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
                  setValoresTarjeta(prev => ({ ...prev, numero: val }));
                }}
                placeholder="0000 0000 0000 0000"
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Vencimiento"
                  required
                  maxLength={5}
                  value={valoresTarjeta.exp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const formatted = val.length >= 3 ? `${val.slice(0, 2)}/${val.slice(2, 4)}` : val;
                    setValoresTarjeta(prev => ({ ...prev, exp: formatted }));
                  }}
                  placeholder="MM/AA"
                />
                <FormInput
                  label="Código CVV"
                  required
                  type="password"
                  maxLength={4}
                  value={valoresTarjeta.cvv}
                  onChange={(e) => setValoresTarjeta(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                  placeholder="•••"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button type="button" variant="secondary" onClick={() => setCheckoutOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Pagar {checkoutPago ? formatPrecio(checkoutPago.monto) : '$0.00'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
