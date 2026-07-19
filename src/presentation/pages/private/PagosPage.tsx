import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Pago } from '../../../domain/entities/Pago';
import type { MetodoPago } from '../../../domain/entities/MetodoPago';
import type { Reserva } from '../../../domain/entities/Reserva';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import { EstadoPago } from '../../../domain/enums/EstadoPago';
import { EstadoReserva } from '../../../domain/enums/EstadoReserva';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
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

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Pago | null>(null);
  const [form, setForm] = useState<PagoForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const misReservaIds = useMemo(() => {
    if (isStaff) return null;
    const misPasajeros = new Set(
      pasajeros.filter((p) => p.usuario === user?.id).map((p) => p.id),
    );
    return new Set(reservas.filter((r) => misPasajeros.has(r.pasajero)).map((r) => r.id));
  }, [isStaff, pasajeros, reservas, user]);

  const pagosVisibles = useMemo(
    () => (misReservaIds ? pagos.filter((p) => misReservaIds.has(p.reserva)) : pagos),
    [pagos, misReservaIds],
  );

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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const monto = Number(form.monto);
    if (!form.reserva || !form.metodo_pago || Number.isNaN(monto) || monto <= 0) {
      setFormError('Reserva, método de pago y un monto válido son obligatorios');
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
        p.id !== editando?.id,
    );
    if (pagoPrevio && form.estado === EstadoPago.Completado) {
      setFormError(
        `Esta reserva ya tiene el pago #${pagoPrevio.id} completado por ${formatPrecio(pagoPrevio.monto)}. Reembólsalo antes de registrar otro.`,
      );
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        reserva: Number(form.reserva),
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
    } catch (e) {
      setFormError(getErrorMessage(e, 'No se pudo guardar el pago'));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(pago: Pago) {
    if (!window.confirm(`¿Eliminar el pago #${pago.id}?`)) return;
    try {
      await useCaseFactory.pagos.remove(pago.id);
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar el pago'));
    }
  }

  const columnas: Column<Pago>[] = [
    { header: 'ID', render: (p) => <span className="text-gray-400">#{p.id}</span> },
    { header: 'Reserva', render: (p) => `Reserva #${p.reserva}` },
    { header: 'Método', render: (p) => metodosPorId.get(p.metodo_pago)?.nombre ?? `#${p.metodo_pago}` },
    { header: 'Monto', render: (p) => <span className="font-semibold">{formatPrecio(p.monto)}</span> },
    { header: 'Estado', render: (p) => <Badge estado={p.estado} /> },
    { header: 'Referencia', render: (p) => <span className="font-mono text-xs">{p.referencia || '—'}</span> },
  ];

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
        <p className="mt-6 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light">
          {error}
        </p>
      )}

      <div className="mt-6">
        <DataTable
          columns={columnas}
          data={pagosVisibles}
          getRowId={(p) => p.id}
          loading={loading}
          emptyMessage="No hay pagos registrados"
          actions={
            isStaff
              ? (pago) => (
                  <>
                    <Button variant="secondary" onClick={() => abrirEditar(pago)}>
                      Editar
                    </Button>
                    <Button variant="danger" onClick={() => eliminar(pago)}>
                      Eliminar
                    </Button>
                  </>
                )
              : undefined
          }
        />
      </div>

      <Modal
        open={modalAbierto}
        title={editando ? `Editar pago #${editando.id}` : 'Nuevo pago'}
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
          <FormSelect
            label="Método de pago"
            value={form.metodo_pago}
            onChange={(e) => setForm((f) => ({ ...f, metodo_pago: e.target.value }))}
            placeholder="Selecciona un método"
            options={metodos
              .filter((m) => m.activo)
              .map((m) => ({ value: String(m.id), label: `${m.nombre} (${m.tipo})` }))}
          />
          <FormInput
            label="Monto"
            type="number"
            min={0}
            step="0.01"
            value={form.monto}
            onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
            placeholder="Ej: 297.50"
          />
          <FormSelect
            label="Estado"
            value={form.estado}
            onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoPago }))}
            options={Object.values(EstadoPago).map((estado) => ({
              value: estado,
              label: estado,
            }))}
          />
          <FormInput
            label="Referencia"
            value={form.referencia}
            onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
            placeholder="Ej: TRX-20260713-001"
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
              {editando ? 'Guardar cambios' : 'Crear pago'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
