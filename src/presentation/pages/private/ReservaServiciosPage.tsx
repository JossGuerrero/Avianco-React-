import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ReservaServicio } from '../../../domain/entities/ReservaServicio';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { labelReserva } from '../../utils/labels';
import { formatPrecio, getErrorMessage } from '../../utils/formatters';

export function ReservaServiciosPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  const reservas = useLista(useCaseFactory.reservas);
  const servicios = useLista(useCaseFactory.servicios);
  const serviciosPorId = useMemo(() => new Map(servicios.map((s) => [s.id, s])), [servicios]);

  const [reservaServicios, setReservaServicios] = useState<ReservaServicio[]>([]);
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

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await useCaseFactory.reservaServicios.getAll();
      setReservaServicios(data);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los servicios de reserva'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function abrirCrear() {
    setEditando(null);
    setValores({
      reserva: reservas.length > 0 ? String(reservas[0].id) : '',
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

      {/* Temporal table placeholder for Commit 1 */}
      <div className="mt-6">
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
          data={reservaServicios}
          getRowId={(rs) => rs.id}
          loading={loading}
          emptyMessage="No hay servicios registrados"
          actions={
            isStaff
              ? (rs) => (
                  <>
                    <Button variant="secondary" onClick={() => abrirEditar(rs)}>
                      Editar
                    </Button>
                    <Button variant="danger" onClick={() => eliminar(rs)}>
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
        title={editando ? 'Editar servicio' : 'Nuevo servicio'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormSelect
            label="Reserva"
            value={valores.reserva}
            onChange={(e) => setValores((v) => ({ ...v, reserva: e.target.value }))}
            placeholder="Selecciona una reserva"
            options={reservas.map((r) => ({ value: String(r.id), label: labelReserva(r) }))}
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
