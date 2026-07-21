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
    return localStorage.getItem(`pasajero_nombre_${pasajero.id}`) || pasajero.nombre_completo || pasajero.numero_pasaporte;
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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-black">
          {isStaff ? 'Todas las ' : 'Mis '}
          <span className="text-primary">reservas</span>
        </h1>
        {/* La creación manual (sin pago) es gestión administrativa: solo staff.
            El cliente reserva únicamente por Vuelos → Reservar → checkout. */}
        {isStaff && <Button onClick={abrirCrear}>+ Nueva reserva</Button>}
      </div>

      {!isStaff && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm text-gray-300">
            ¿Quieres viajar? Para reservar, ve a <span className="font-semibold text-white">Vuelos</span>,
            elige tu vuelo y completa el pago en el checkout.
          </p>
          <Link to="/vuelos">
            <Button>Buscar vuelos</Button>
          </Link>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light">
          {error}
        </p>
      )}

      <div className="mt-6">
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
            count: isStaff ? paginacion.count : undefined,
            onPageChange: setPage,
          }}
          actions={(reserva) => (
            <>
              {reserva.estado !== EstadoReserva.Cancelada && (
                <Button variant="ghost" onClick={() => cancelarReserva(reserva)}>
                  Cancelar
                </Button>
              )}
              {isStaff && (
                <>
                  <Button variant="secondary" onClick={() => abrirEditar(reserva)}>
                    Editar
                  </Button>
                  <Button variant="danger" onClick={() => eliminarReserva(reserva)}>
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
        title={editando ? `Editar reserva #${editando.id}` : 'Nueva reserva'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormSelect
            label="Vuelo"
            value={form.vuelo}
            onChange={(e) => setForm((f) => ({ ...f, vuelo: e.target.value }))}
            placeholder="Selecciona un vuelo"
            options={vuelos.map((v) => ({ value: String(v.id), label: labelVuelo(v.id) }))}
          />
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
            <p className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary-light">
              {formError}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={guardando}>
              {editando ? 'Guardar cambios' : 'Crear reserva'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
