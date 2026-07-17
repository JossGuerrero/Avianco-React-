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
import { DataTable, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
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

  // Reservas del usuario actual (para filtrar facturas propias si no es staff)
  const misReservaIds = useMemo(() => {
    if (isStaff) return null;
    const misPasajeros = new Set(
      pasajeros.filter((p) => p.usuario === user?.id).map((p) => p.id),
    );
    return new Set(reservas.filter((r) => misPasajeros.has(r.pasajero)).map((r) => r.id));
  }, [isStaff, pasajeros, reservas, user]);

  const facturasVisibles = useMemo(
    () => (misReservaIds ? facturas.filter((f) => misReservaIds.has(f.reserva)) : facturas),
    [facturas, misReservaIds],
  );

  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const total = Number(form.total);
    const impuestos = Number(form.impuestos);
    if (!form.reserva || Number.isNaN(total) || total <= 0 || Number.isNaN(impuestos)) {
      setFormError('Reserva, total e impuestos válidos son obligatorios');
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
        f.id !== editando?.id,
    );
    if (facturaPrevia) {
      setFormError(
        `Esta reserva ya tiene la factura #${facturaPrevia.id} (${facturaPrevia.estado}). Anúlala antes de emitir otra.`,
      );
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      const input = { reserva: Number(form.reserva), total, impuestos, estado: form.estado };
      if (editando) {
        await useCaseFactory.facturas.update(editando.id, input);
      } else {
        await useCaseFactory.facturas.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (e) {
      setFormError(getErrorMessage(e, 'No se pudo guardar la factura'));
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
      // Filtro en cliente por si el backend ignora el query param.
      setDetalleServicios(serviciosData.filter((s) => s.reserva === factura.reserva));
      setDetalleEquipajes(equipajesData.filter((e) => e.reserva === factura.reserva));
    } finally {
      setCargandoDetalle(false);
    }
  }

  function cerrarDetalle() {
    setDetalleFactura(null);
    setDetalleServicios([]);
    setDetalleEquipajes([]);
  }

  async function eliminar(factura: Factura) {
    if (!window.confirm(`¿Eliminar la factura #${factura.id}?`)) return;
    try {
      await useCaseFactory.facturas.remove(factura.id);
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar la factura'));
    }
  }

  const columnas: Column<Factura>[] = [
    { header: 'ID', render: (f) => <span className="text-gray-400">#{f.id}</span> },
    { header: 'Reserva', render: (f) => `Reserva #${f.reserva}` },
    { header: 'Total', render: (f) => <span className="font-semibold">{formatPrecio(f.total)}</span> },
    { header: 'Impuestos', render: (f) => formatPrecio(f.impuestos) },
    { header: 'Estado', render: (f) => <Badge estado={f.estado} /> },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-black">
          {isStaff ? '' : 'Mis '}
          <span className="text-primary">Facturas</span>
        </h1>
        {isStaff && <Button onClick={abrirCrear}>+ Nueva factura</Button>}
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light">
          {error}
        </p>
      )}

      <div className="mt-6">
        <DataTable
          columns={columnas}
          data={facturasVisibles}
          getRowId={(f) => f.id}
          loading={loading}
          emptyMessage="No hay facturas registradas"
          actions={(factura) => (
            <>
              <Button variant="ghost" onClick={() => abrirDetalle(factura)}>
                Detalle
              </Button>
              {isStaff && (
                <>
                  <Button variant="secondary" onClick={() => abrirEditar(factura)}>
                    Editar
                  </Button>
                  <Button variant="danger" onClick={() => eliminar(factura)}>
                    Eliminar
                  </Button>
                </>
              )}
            </>
          )}
        />
      </div>

      <Modal
        open={modalAbierto}
        title={editando ? `Editar factura #${editando.id}` : 'Nueva factura'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormSelect
            label="Reserva"
            value={form.reserva}
            onChange={(e) => setForm((f) => ({ ...f, reserva: e.target.value }))}
            placeholder="Selecciona una reserva"
            options={reservas.map((r) => ({
              value: String(r.id),
              label: `Reserva #${r.id} · asiento ${r.asiento} (${r.estado})`,
            }))}
          />
          <FormInput
            label="Total"
            type="number"
            min={0}
            step="0.01"
            value={form.total}
            onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
            placeholder="Ej: 250.00"
          />
          <FormInput
            label="Impuestos"
            type="number"
            min={0}
            step="0.01"
            value={form.impuestos}
            onChange={(e) => setForm((f) => ({ ...f, impuestos: e.target.value }))}
            placeholder="Ej: 47.50"
          />
          <FormSelect
            label="Estado"
            value={form.estado}
            onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoFactura }))}
            options={Object.values(EstadoFactura).map((estado) => ({
              value: estado,
              label: estado,
            }))}
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
              {editando ? 'Guardar cambios' : 'Crear factura'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detalle completo: reserva + servicios + equipaje + desglose real */}
      {detalleFactura && (() => {
        const reserva = reservas.find((r) => r.id === detalleFactura.reserva);
        const pasajero = reserva
          ? pasajeros.find((p) => p.id === reserva.pasajero)
          : undefined;
        const nombreServicio = new Map(servicios.map((s) => [s.id, s.nombre]));
        const totalServicios = detalleServicios.reduce(
          (suma, rs) => suma + rs.cantidad * Number(rs.precio_aplicado),
          0,
        );
        const subtotal = Number(detalleFactura.total) - Number(detalleFactura.impuestos);

        return (
          <Modal open title={`Factura #${detalleFactura.id}`} onClose={cerrarDetalle} ancho="lg">
            <div className="flex items-center justify-between">
              <Badge estado={detalleFactura.estado} />
              <p className="text-2xl font-black text-primary-light">
                {formatPrecio(detalleFactura.total)}
              </p>
            </div>

            {/* Reserva asociada */}
            <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-gray-400">
              Reserva asociada
            </h3>
            {reserva ? (
              <dl className="mt-2 space-y-1.5 rounded-xl border border-dark-border bg-dark p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Reserva</dt>
                  <dd className="font-semibold text-white">
                    #{reserva.id} · vuelo #{reserva.vuelo}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Asiento</dt>
                  <dd className="font-semibold text-white">{reserva.asiento}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Pasajero</dt>
                  <dd className="font-semibold text-white">
                    {pasajero?.nombre_completo || pasajero?.numero_pasaporte || `#${reserva.pasajero}`}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-gray-400">Estado</dt>
                  <dd>
                    <Badge estado={reserva.estado} />
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-gray-400">
                Reserva #{detalleFactura.reserva} (sin acceso al detalle)
              </p>
            )}

            {/* Servicios adicionales */}
            <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-gray-400">
              Servicios adicionales
            </h3>
            {cargandoDetalle ? (
              <p className="mt-2 text-sm text-gray-400">Cargando…</p>
            ) : detalleServicios.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">Sin servicios adicionales.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {detalleServicios.map((rs) => (
                  <li
                    key={rs.id}
                    className="flex items-center justify-between rounded-lg border border-dark-border bg-dark px-4 py-2.5 text-sm"
                  >
                    <span className="text-gray-200">
                      {nombreServicio.get(rs.servicio) ?? `Servicio #${rs.servicio}`}
                      <span className="ml-2 text-xs text-gray-400">× {rs.cantidad}</span>
                    </span>
                    <span className="font-semibold text-white">
                      {formatPrecio(rs.cantidad * Number(rs.precio_aplicado))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Equipaje */}
            <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-gray-400">
              Equipaje
            </h3>
            {cargandoDetalle ? (
              <p className="mt-2 text-sm text-gray-400">Cargando…</p>
            ) : detalleEquipajes.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">Sin equipaje registrado.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {detalleEquipajes.map((equipaje) => (
                  <li
                    key={equipaje.id}
                    className="flex items-center justify-between rounded-lg border border-dark-border bg-dark px-4 py-2.5 text-sm"
                  >
                    <span className="capitalize text-gray-200">{equipaje.tipo}</span>
                    <span className="text-xs text-gray-400">
                      {Number(equipaje.peso_kg)} kg
                      {equipaje.descripcion ? ` · ${equipaje.descripcion}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Desglose real */}
            <dl className="mt-5 space-y-2 rounded-xl border border-dark-border bg-dark p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Subtotal (tarifa + servicios)</dt>
                <dd className="text-white">{formatPrecio(subtotal)}</dd>
              </div>
              {totalServicios > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-400">De los cuales servicios</dt>
                  <dd className="text-white">{formatPrecio(totalServicios)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-400">Impuestos</dt>
                <dd className="text-white">{formatPrecio(detalleFactura.impuestos)}</dd>
              </div>
              <div className="flex justify-between border-t border-dark-border pt-2">
                <dt className="font-bold text-white">Total</dt>
                <dd className="text-lg font-black text-primary-light">
                  {formatPrecio(detalleFactura.total)}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={cerrarDetalle}>
                Cerrar
              </Button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
