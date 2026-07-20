import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Factura } from '../../../domain/entities/Factura';
import type { Reserva } from '../../../domain/entities/Reserva';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import type { Servicio } from '../../../domain/entities/Servicio';
import type { ReservaServicio } from '../../../domain/entities/ReservaServicio';
import type { Equipaje } from '../../../domain/entities/Equipaje';
import { EstadoFactura } from '../../../domain/enums/EstadoFactura';
import { EstadoReserva } from '../../../domain/enums/EstadoReserva';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { formatPrecio, getErrorMessage } from '../../utils/formatters';

interface FacturaForm {
  reserva: string;
  total: string;
  impuestos: string;
  estado: EstadoFactura;
}

const FORM_VACIO: FacturaForm = {
  reserva: '',
  total: '',
  impuestos: '',
  estado: EstadoFactura.Pendiente,
};

export function FacturasPage() {
  const { user, isStaff } = useAuthStore();

  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');

  // Estados para CRUD de Staff
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Factura | null>(null);
  const [form, setForm] = useState<FacturaForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Detalle de factura: reserva asociada + servicios + equipaje
  const [detalleFactura, setDetalleFactura] = useState<Factura | null>(null);
  const [detalleServicios, setDetalleServicios] = useState<ReservaServicio[]>([]);
  const [detalleEquipajes, setDetalleEquipajes] = useState<Equipaje[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [facturasData, reservasData, pasajerosData, serviciosData] = await Promise.all([
        useCaseFactory.facturas.getAll(),
        useCaseFactory.reservas.getAll(),
        useCaseFactory.pasajeros.getAll(),
        useCaseFactory.servicios.getAll().catch(() => [] as Servicio[]),
      ]);
      setFacturas(facturasData);
      setReservas(reservasData);
      setPasajeros(pasajerosData);
      setServicios(serviciosData);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar las facturas'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const reservasPorId = useMemo(() => new Map(reservas.map((r) => [r.id, r])), [reservas]);
  const pasajerosPorId = useMemo(() => new Map(pasajeros.map((p) => [p.id, p])), [pasajeros]);

  // Reservas del usuario actual (para filtrar facturas propias si no es staff)
  const misPasajerosIds = useMemo(() => {
    return new Set(pasajeros.filter((p) => p.usuario === user?.id).map((p) => p.id));
  }, [pasajeros, user]);

  const misReservaIds = useMemo(() => {
    return new Set(reservas.filter((r) => misPasajerosIds.has(r.pasajero)).map((r) => r.id));
  }, [reservas, misPasajerosIds]);

  const facturasVisibles = useMemo(() => {
    if (isStaff) return facturas;
    return facturas.filter((f) => misReservaIds.has(f.reserva));
  }, [facturas, isStaff, misReservaIds]);

  // Facturas filtradas por búsqueda
  const facturasFiltradas = useMemo(() => {
    return facturasVisibles.filter((f) => {
      const res = reservasPorId.get(f.reserva);
      const pas = res ? pasajerosPorId.get(res.pasajero) : null;
      const nombrePasajero = pas ? (pas.nombre_completo || pas.numero_pasaporte) : '';
      
      return (
        String(f.reserva).includes(busqueda) ||
        String(f.id).includes(busqueda) ||
        nombrePasajero.toLowerCase().includes(busqueda.toLowerCase()) ||
        f.estado.toLowerCase().includes(busqueda.toLowerCase())
      );
    });
  }, [facturasVisibles, busqueda, reservasPorId, pasajerosPorId]);

  // Estadísticas del panel superior
  const stats = useMemo(() => {
    const totalCount = facturasVisibles.length;
    const totalFacturado = facturasVisibles
      .filter((f) => f.estado === EstadoFactura.Pagada)
      .reduce((acc, curr) => acc + Number(curr.total), 0);
    const totalImpuestos = facturasVisibles
      .filter((f) => f.estado === EstadoFactura.Pagada)
      .reduce((acc, curr) => acc + Number(curr.impuestos), 0);
    const pagadas = facturasVisibles.filter((f) => f.estado === EstadoFactura.Pagada).length;
    const pendientes = facturasVisibles.filter((f) => f.estado === EstadoFactura.Pendiente).length;
    const anuladas = facturasVisibles.filter((f) => f.estado === EstadoFactura.Anulada).length;

    return {
      totalCount,
      totalFacturado: Math.round(totalFacturado * 100) / 100,
      totalImpuestos: Math.round(totalImpuestos * 100) / 100,
      pagadas,
      pendientes,
      anuladas,
    };
  }, [facturasVisibles]);

  // Lógica CRUD de Staff
  function abrirCrear() {
    setEditando(null);
    setForm({
      reserva: reservas[0] ? String(reservas[0].id) : '',
      total: '150.00',
      impuestos: '28.50',
      estado: EstadoFactura.Pendiente,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(factura: Factura) {
    setEditando(factura);
    setForm({
      reserva: String(factura.reserva),
      total: String(factura.total),
      impuestos: String(factura.impuestos),
      estado: factura.estado,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleEliminar(factura: Factura) {
    if (!window.confirm(`¿Eliminar la factura #${factura.id}?`)) return;
    try {
      await useCaseFactory.facturas.remove(factura.id);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la factura'));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const total = Number(form.total);
    const impuestos = Number(form.impuestos);
    
    if (!form.reserva || Number.isNaN(total) || total <= 0 || Number.isNaN(impuestos) || impuestos < 0) {
      setFormError('La reserva, total y un monto de impuestos válido son obligatorios');
      return;
    }
    if (impuestos >= total) {
      setFormError('Los impuestos no pueden ser mayores o iguales al total');
      return;
    }

    const reservaId = Number(form.reserva);
    const reservaSel = reservas.find((r) => r.id === reservaId);
    if (!editando && reservaSel?.estado === EstadoReserva.Cancelada) {
      setFormError('No se puede emitir una factura sobre una reserva cancelada');
      return;
    }

    // Una reserva no debe tener dos facturas vivas (la anulada no cuenta).
    const facturaPrevia = facturas.find(
      (f) =>
        f.reserva === reservaId &&
        f.estado !== EstadoFactura.Anulada &&
        f.id !== editando?.id
    );
    if (facturaPrevia) {
      setFormError(
        `Esta reserva ya tiene la factura #${facturaPrevia.id} (${facturaPrevia.estado}). Anúlala antes de emitir otra.`
      );
      return;
    }

    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        reserva: reservaId,
        total,
        impuestos,
        estado: form.estado,
      };

      if (editando) {
        await useCaseFactory.facturas.update(editando.id, input);
      } else {
        await useCaseFactory.facturas.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo registrar la factura'));
    } finally {
      setGuardando(false);
    }
  }

  async function abrirDetalle(factura: Factura) {
    setDetalleFactura(factura);
    setCargandoDetalle(true);
    try {
      const [serviciosData, equipajesData] = await Promise.all([
        useCaseFactory.reservaServicios
          .getAll({ reserva: factura.reserva })
          .catch(() => [] as ReservaServicio[]),
        useCaseFactory.equipajes
          .getAll({ reserva: factura.reserva })
          .catch(() => [] as Equipaje[]),
      ]);
      setDetalleServicios(serviciosData.filter((s) => s.reserva === factura.reserva));
      setDetalleEquipajes(equipajesData.filter((e) => e.reserva === factura.reserva));
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoDetalle(false);
    }
  }

  function cerrarDetalle() {
    setDetalleFactura(null);
    setDetalleServicios([]);
    setDetalleEquipajes([]);
  }

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-primary-light uppercase">Auditoría Fiscal</span>
            </div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl text-white tracking-tight">
              Terminal de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Facturas</span>
            </h1>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              {isStaff 
                ? 'Controla las facturas fiscales emitidas, impuestos recaudados para aduanas y estado de pagos por reserva.'
                : 'Consulta tus comprobantes fiscales y facturas detalladas de vuelos y servicios adquiridos.'}
            </p>
          </div>
        </div>

        {/* Banner Generado por IA */}
        <div className="relative w-full md:w-64 h-24 rounded-2xl overflow-hidden border border-white/10 shadow-lg hidden md:block">
          <img 
            src="/billing_banner_1784569609125.png" 
            alt="Billing Banner" 
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
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Facturado Pagado</span>
              <div className="mt-1.5 text-lg font-black text-white">{formatPrecio(stats.totalFacturado)}</div>
              <p className="mt-0.5 text-[10px] text-gray-400">{stats.pagadas} facturas cobradas</p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Impuestos Recibidos</span>
              <div className="mt-1.5 text-lg font-black text-blue-300">{formatPrecio(stats.totalImpuestos)}</div>
              <p className="mt-0.5 text-[10px] text-blue-400">Tasas aeroportuarias</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Completadas</span>
              <div className="mt-1.5 text-lg font-black text-emerald-300">{stats.pagadas}</div>
              <p className="mt-0.5 text-[10px] text-emerald-400">Facturas liquidadas</p>
            </div>

            <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">Pendientes</span>
              <div className="mt-1.5 text-lg font-black text-yellow-300">{stats.pendientes}</div>
              <p className="mt-0.5 text-[10px] text-yellow-400">Por procesar cobro</p>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-rose-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Anuladas</span>
              <div className="mt-1.5 text-lg font-black text-rose-300">{stats.anuladas}</div>
              <p className="mt-0.5 text-[10px] text-rose-400">Créditos tributarios</p>
            </div>
          </div>

          {/* Renderizado de Vistas */}
          {isStaff ? (
            /* ================= VISTA STAFF: LISTADO DE FACTURACIÓN ================= */
            <div className="border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Comprobantes Emitidos</h2>
                  <p className="text-xs text-gray-400">Administración general de facturas y control fiscal.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar por reserva, factura..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full sm:w-64 bg-dark/70 border border-white/15 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-light transition-all"
                  />
                  <Button size="small" onClick={abrirCrear}>
                    + Nueva Factura
                  </Button>
                </div>
              </div>

              {facturasFiltradas.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No se encontraron facturas registradas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold">ID</th>
                        <th className="px-4 py-3 font-bold">Pasajero</th>
                        <th className="px-4 py-3 font-bold">Reserva</th>
                        <th className="px-4 py-3 font-bold">Impuestos</th>
                        <th className="px-4 py-3 font-bold">Total</th>
                        <th className="px-4 py-3 font-bold">Estado</th>
                        <th className="px-4 py-3 text-right font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturasFiltradas.map((f) => {
                        const res = reservasPorId.get(f.reserva);
                        const pas = res ? pasajerosPorId.get(res.pasajero) : null;
                        const nombrePasajero = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${res?.pasajero}`;

                        return (
                          <tr key={f.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all">
                            <td className="px-4 py-3 text-gray-500">#{f.id}</td>
                            <td className="px-4 py-3 font-semibold text-white">{nombrePasajero}</td>
                            <td className="px-4 py-3 text-stone-300">Reserva #{f.reserva}</td>
                            <td className="px-4 py-3 text-stone-300">{formatPrecio(f.impuestos)}</td>
                            <td className="px-4 py-3 font-bold text-white">{formatPrecio(f.total)}</td>
                            <td className="px-4 py-3">
                              <Badge estado={f.estado} />
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                onClick={() => abrirDetalle(f)}
                                className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1"
                              >
                                Detalle
                              </button>
                              <button
                                onClick={() => abrirEditar(f)}
                                className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleEliminar(f)}
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
            /* ================= VISTA CLIENTE: HISTORIAL DE FACTURAS ================= */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-wide">Mis Comprobantes de Compra</h2>
                <span className="text-xs text-gray-400">{facturasFiltradas.length} recibos fiscales</span>
              </div>

              {facturasFiltradas.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                  No registras facturas de vuelos o compras asociadas a tu cuenta.
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {facturasFiltradas.map((f) => {
                    const res = reservasPorId.get(f.reserva);
                    const pas = res ? pasajerosPorId.get(res.pasajero) : null;
                    const nombrePas = pas ? (pas.nombre_completo || pas.numero_pasaporte) : `Pasajero #${res?.pasajero}`;

                    return (
                      <div key={f.id} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 backdrop-blur-md shadow-xl p-6 flex flex-col justify-between h-[340px] w-full animate-scale-in hover:border-white/20 transition-all">
                        {/* Cut-out / Tear-off physical ticket circle guides */}
                        <div className="absolute -left-3 top-[120px] w-6 h-6 rounded-full bg-[#121212] border-r border-white/10" />
                        <div className="absolute -right-3 top-[120px] w-6 h-6 rounded-full bg-[#121212] border-l border-white/10" />

                        {/* Top Section */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                          <div>
                            <span className="text-[9px] text-gray-500 block uppercase tracking-wider font-mono">Factura Fiscal</span>
                            <span className="font-bold text-white text-xs">#FAC-2026-00{f.id}</span>
                          </div>
                          <Badge estado={f.estado} />
                        </div>

                        {/* Middle Info / Passenger */}
                        <div className="py-4 space-y-1 text-left">
                          <span className="text-[9px] text-gray-500 block uppercase tracking-wider font-mono">Detalles del Titular</span>
                          <div className="text-sm font-bold text-white truncate">{nombrePas}</div>
                          <div className="text-[11px] text-stone-300">Asiento de Reserva: <span className="font-bold text-white">#{f.reserva}</span></div>
                          <div className="text-[10px] text-stone-400">Emisor: <span className="font-medium text-stone-300">AVIANCO AIRLINES S.A.</span></div>
                        </div>

                        {/* Dotted Tear strip */}
                        <div className="border-t border-dashed border-white/15 my-2" />

                        {/* Bottom Invoice breakdown */}
                        <div className="space-y-1 text-left text-[11px]">
                          <div className="flex justify-between text-stone-400">
                            <span>Subtotal (Neto):</span>
                            <span>{formatPrecio(Number(f.total) - Number(f.impuestos))}</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Tasas / Impuestos:</span>
                            <span>{formatPrecio(f.impuestos)}</span>
                          </div>
                          <div className="flex justify-between text-white font-black text-sm pt-1.5 border-t border-white/5">
                            <span>Total Facturado:</span>
                            <span className="text-primary-light">{formatPrecio(f.total)}</span>
                          </div>
                        </div>

                        {/* Barcode & Button */}
                        <div className="mt-4 flex items-center justify-between gap-4">
                          <div className="flex gap-0.5 items-end justify-center h-8 opacity-45 bg-white/5 px-2.5 py-1 rounded-lg w-1/2">
                            {Array.from({ length: 18 }).map((_, idx) => {
                              const widths = [1, 2, 1, 3, 2];
                              return (
                                <div
                                  key={idx}
                                  className="h-full bg-white"
                                  style={{ width: `${widths[idx % 5]}px`, opacity: idx % 2 === 0 ? 0.9 : 0 }}
                                />
                              );
                            })}
                          </div>
                          <Button size="small" onClick={() => abrirDetalle(f)}>
                            Ver Detalle
                          </Button>
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

      {/* Modal de CRUD de Factura (Staff) */}
      <Modal
        open={modalAbierto}
        title={editando ? `Editar factura #${editando.id}` : 'Nueva factura'}
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
            <FormInput
              label="Total ($)"
              required
              type="number"
              min={0}
              step="0.01"
              value={form.total}
              onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
              placeholder="Ej: 250.00"
            />
            <FormInput
              label="Impuestos ($)"
              required
              type="number"
              min={0}
              step="0.01"
              value={form.impuestos}
              onChange={(e) => setForm((f) => ({ ...f, impuestos: e.target.value }))}
              placeholder="Ej: 47.50"
            />
          </div>

          <FormSelect
            label="Estado de Factura"
            required
            value={form.estado}
            onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoFactura }))}
            options={Object.values(EstadoFactura).map((estado) => ({
              value: estado,
              label: estado.charAt(0).toUpperCase() + estado.slice(1),
            }))}
          />

          <div className="mt-4 flex justify-end gap-3 border-t border-white/10 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear factura'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detalle completo de Factura */}
      {detalleFactura && (() => {
        const reserva = reservas.find((r) => r.id === detalleFactura.reserva);
        const pasajero = reserva ? pasajeros.find((p) => p.id === reserva.pasajero) : undefined;
        const nombreServicio = new Map(servicios.map((s) => [s.id, s.nombre]));
        const totalServicios = detalleServicios.reduce(
          (suma, rs) => suma + rs.cantidad * Number(rs.precio_aplicado),
          0
        );
        const subtotal = Number(detalleFactura.total) - Number(detalleFactura.impuestos);

        return (
          <Modal open title={`Detalle de Comprobante Fiscal #${detalleFactura.id}`} onClose={cerrarDetalle} ancho="lg">
            <div className="space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <Badge estado={detalleFactura.estado} />
                <p className="text-2xl font-black text-primary-light">
                  {formatPrecio(detalleFactura.total)}
                </p>
              </div>

              {/* Reserva asociada */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Reserva y Pasajero
                </h3>
                {reserva ? (
                  <dl className="mt-2 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Pasajero Titular</dt>
                      <dd className="font-semibold text-white">
                        {pasajero?.nombre_completo || pasajero?.numero_pasaporte || `#${reserva.pasajero}`}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Reserva de Referencia</dt>
                      <dd className="font-semibold text-white">#{reserva.id}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Asiento Asignado</dt>
                      <dd className="font-semibold text-white font-mono">{reserva.asiento || 'Sin asignar'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Estado de Reserva</dt>
                      <dd><Badge estado={reserva.estado} /></dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">Reserva #{detalleFactura.reserva} no encontrada en el sistema.</p>
                )}
              </div>

              {/* Servicios adicionales */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Servicios Adicionales Adquiridos
                </h3>
                {cargandoDetalle ? (
                  <p className="mt-2 text-xs text-gray-500 animate-pulse">Cargando desglose de servicios...</p>
                ) : detalleServicios.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500 bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                    Sin servicios adicionales registrados.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {detalleServicios.map((rs) => (
                      <li
                        key={rs.id}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs"
                      >
                        <span className="text-gray-200">
                          {nombreServicio.get(rs.servicio) ?? `Servicio #${rs.servicio}`}
                          <span className="ml-2 text-[10px] text-gray-500">× {rs.cantidad}</span>
                        </span>
                        <span className="font-semibold text-white">
                          {formatPrecio(rs.quantity ? rs.quantity * Number(rs.precio_aplicado) : rs.cantidad * Number(rs.precio_aplicado))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Equipaje */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Equipaje Facturado
                </h3>
                {cargandoDetalle ? (
                  <p className="mt-2 text-xs text-gray-500 animate-pulse">Cargando detalle de equipaje...</p>
                ) : detalleEquipajes.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500 bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                    Sin equipaje registrado en bodega para esta reserva.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {detalleEquipajes.map((equipaje) => (
                      <li
                        key={equipaje.id}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs"
                      >
                        <span className="capitalize text-gray-200 font-semibold">{equipaje.tipo}</span>
                        <span className="text-gray-400">
                          {Number(equipaje.peso_kg)} kg
                          {equipaje.descripcion ? ` · ${equipaje.descripcion}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Desglose Fiscal Final */}
              <div className="border-t border-white/10 pt-4">
                <dl className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Subtotal Neto (Tarifa + Servicios)</dt>
                    <dd className="text-white font-medium">{formatPrecio(subtotal)}</dd>
                  </div>
                  {totalServicios > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Desglose de Servicios Incluidos</dt>
                      <dd className="text-stone-300">{formatPrecio(totalServicios)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Impuestos Aeroportuarios (IVA + Tasas)</dt>
                    <dd className="text-white font-medium">{formatPrecio(detalleFactura.impuestos)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2">
                    <dt className="font-bold text-white text-sm">Total Liquidado</dt>
                    <dd className="text-base font-black text-primary-light">
                      {formatPrecio(detalleFactura.total)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={cerrarDetalle}>
                  Cerrar Comprobante
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
