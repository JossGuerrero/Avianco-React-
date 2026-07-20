import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Factura } from '../../../domain/entities/Factura';
import type { Reserva } from '../../../domain/entities/Reserva';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import type { Servicio } from '../../../domain/entities/Servicio';
import type { ReservaServicio } from '../../../domain/entities/ReservaServicio';
import type { Equipaje } from '../../../domain/entities/Equipaje';
import { EstadoFactura } from '../../../domain/enums/EstadoFactura';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { formatPrecio, getErrorMessage } from '../../utils/formatters';

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-primary-light uppercase">Auditoría Fiscal</span>
            </div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl text-white tracking-tight">
              Terminal de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Facturas</span>
            </h1>
            <p className="mt-2 text-xs text-gray-400 max-w-xl leading-relaxed">
              {isStaff 
                ? 'Controla las facturas fiscales emitidas, impuestos recaudados para aduanas y estado de pagos por reserva.'
                : 'Consulta tus comprobantes fiscales y facturas detalladas de vuelos y servicios adquiridos.'}
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
                  <Button size="small">
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
                              <button className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1">
                                Detalle
                              </button>
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
            /* ================= VISTA CLIENTE: HISTORIAL DE FACTURAS ================= */
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white tracking-wide">Mis Facturas</h2>
              <div className="py-8 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl">
                Cargando tus facturas...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
