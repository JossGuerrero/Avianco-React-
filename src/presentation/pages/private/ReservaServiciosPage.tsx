import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ReservaServicio } from '../../../domain/entities/ReservaServicio';
import type { Reserva } from '../../../domain/entities/Reserva';
import type { Servicio } from '../../../domain/entities/Servicio';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import type { Vuelo } from '../../../domain/entities/Vuelo';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { labelReserva } from '../../utils/labels';
import { formatPrecio } from '../../utils/formatters';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

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

  // Retornar ícono correspondiente según nombre del servicio
  function renderIconoServicio(nombre: string) {
    const n = nombre.toLowerCase();
    if (n.includes('equipaje') || n.includes('maleta') || n.includes('bolsa')) {
      return (
        <svg className="h-6 w-6 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    }
    if (n.includes('comida') || n.includes('almuerzo') || n.includes('bebida') || n.includes('menu')) {
      return (
        <svg className="h-6 w-6 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (n.includes('prioridad') || n.includes('embarque') || n.includes('rapido')) {
      return (
        <svg className="h-6 w-6 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      );
    }
    if (n.includes('mascota') || n.includes('perro') || n.includes('gato') || n.includes('cabina')) {
      return (
        <svg className="h-6 w-6 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.871 4A17.926 17.926 0 003 12c0 5.186 2.447 9.8 6.262 12.75M9 9c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3z" />
        </svg>
      );
    }
    if (n.includes('sala') || n.includes('vip') || n.includes('lounge')) {
      return (
        <svg className="h-6 w-6 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    }
    // Ícono por defecto
    return (
      <svg className="h-6 w-6 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    );
  }

  return (
    <CrudPage
      titulo="Servicios por reserva"
      destacado="reserva"
      descripcion="Vincula servicios extras a cada reserva con precio y cantidad"
      imagenHero={AVIATION_IMAGES.reservaServicios}
      nombreEntidad="servicio de reserva"
      useCases={useCaseFactory.reservaServicios}
      puedeMutar={isStaff}
      columns={[
        { header: 'Reserva', render: (rs) => `Reserva #${rs.reserva}` },
        { header: 'Servicio', render: (rs) => serviciosPorId.get(rs.servicio)?.nombre ?? `#${rs.servicio}` },
        { header: 'Cantidad', render: (rs) => rs.cantidad },
        {
          header: 'Precio aplicado',
          render: (rs) => <span className="font-semibold">{formatPrecio(rs.precio_aplicado)}</span>,
        },
      ]}
      campos={[
        {
          name: 'reserva',
          label: 'Reserva',
          tipo: 'select',
          requerido: true,
          placeholder: 'Selecciona una reserva',
          options: reservas.map((r) => ({ value: String(r.id), label: labelReserva(r) })),
        },
        {
          name: 'servicio',
          label: 'Servicio',
          tipo: 'select',
          requerido: true,
          placeholder: 'Selecciona un servicio',
          options: servicios.map((s) => ({
            value: String(s.id),
            label: `${s.nombre} (${formatPrecio(s.precio)})`,
          })),
        },
        { name: 'cantidad', label: 'Cantidad', tipo: 'number', requerido: true, defaultValue: '1' },
        { name: 'precio_aplicado', label: 'Precio aplicado', tipo: 'number', requerido: true, step: '0.01' },
      ]}
      aInput={(v) => {
        const cantidad = Number(v.cantidad);
        const precio = Number(v.precio_aplicado);
        if (Number.isNaN(cantidad) || cantidad <= 0) return 'La cantidad debe ser mayor a cero';
        if (Number.isNaN(precio) || precio < 0) return 'El precio aplicado debe ser válido';
        return {
          reserva: Number(v.reserva),
          servicio: Number(v.servicio),
          cantidad,
          precio_aplicado: precio,
        };
      }}
    />
  );
}
