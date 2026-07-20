import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../utils/formatters';
import { labelReserva } from '../../utils/labels';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function CheckInsPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  const reservas = useLista(useCaseFactory.reservas);
  const puertas = useLista(useCaseFactory.puertas);
  const checkins = useLista(useCaseFactory.checkins);
  const puertasPorId = useMemo(() => new Map(puertas.map((p) => [p.id, p])), [puertas]);

  // Filtro de propiedad de datos para Clientes
  const misPasajerosIds = useMemo(() => {
    return new Set(pasajeros.filter((p) => p.usuario === user?.id).map((p) => p.id));
  }, [pasajeros, user]);

  const misReservasIds = useMemo(() => {
    return new Set(reservas.filter((r) => misPasajerosIds.has(r.pasajero)).map((r) => r.id));
  }, [reservas, misPasajerosIds]);

  const checkinsVisibles = useMemo(() => {
    if (isStaff) return checkins;
    return checkins.filter((c) => misReservasIds.has(c.reserva));
  }, [checkins, isStaff, misReservasIds]);

  // Check-ins filtrados por búsqueda (código de tarjeta de embarque, pasajero o ID de reserva)
  const checkinsFiltrados = useMemo(() => {
    return checkinsVisibles.filter((c) => {
      const res = reservasPorId.get(c.reserva);
      const pas = res ? pasajerosPorId.get(res.pasajero) : null;
      const nombrePasajero = pas ? (pas.nombre_completo || pas.numero_pasaporte) : '';
      
      return (
        c.tarjeta_embarque.toLowerCase().includes(busqueda.toLowerCase()) ||
        String(c.reserva).includes(busqueda) ||
        nombrePasajero.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.estado.toLowerCase().includes(busqueda.toLowerCase())
      );
    });
  }, [checkinsVisibles, busqueda, reservasPorId, pasajerosPorId]);

  // Reservas del cliente que no tienen check-in y no están canceladas
  const reservasSinCheckin = useMemo(() => {
    const reservasConCheckinIds = new Set(checkins.map((c) => c.reserva));
    const clienteReservas = reservas.filter((r) => misPasajerosIds.has(r.pasajero) && r.estado !== EstadoReserva.Cancelada);
    return clienteReservas.filter((r) => !reservasConCheckinIds.has(r.id));
  }, [reservas, checkins, misPasajerosIds]);

  // Reservas generales que no tienen check-in (para el select de creación de staff)
  const reservasDisponiblesStaff = useMemo(() => {
    const reservasConCheckinIds = new Set(checkins.map((c) => c.reserva));
    return reservas.filter((r) => r.estado !== EstadoReserva.Cancelada && (!reservasConCheckinIds.has(r.id) || (editando && r.id === editando.reserva)));
  }, [reservas, checkins, editando]);

  // Estadísticas para el panel superior (mapeadas a los estados reales: 'checkin' y 'embarcado')
  const stats = useMemo(() => {
    const total = checkinsVisibles.length;
    const confirmados = checkinsVisibles.filter((c) => c.estado.toLowerCase() === 'checkin').length;
    const embarcados = checkinsVisibles.filter((c) => c.estado.toLowerCase() === 'embarcado').length;
    const pendientes = isStaff 
      ? reservas.filter((r) => r.estado !== EstadoReserva.Cancelada).length - checkins.length
      : reservasSinCheckin.length;
    
    return {
      total,
      confirmados,
      embarcados,
      pendientes: Math.max(0, pendientes),
    };
  }, [checkinsVisibles, checkins, reservas, isStaff, reservasSinCheckin]);

  // Lógica CRUD de Staff
  function abrirCrear() {
    // Buscar la primera puerta activa disponible por defecto
    const primeraPuerta = puertas.find((p) => p.activa)?.id || '';
    setEditando(null);
    setValores({
      reserva: '',
      puerta: String(primeraPuerta),
      tarjeta_embarque: `AV-${Math.floor(10000 + Math.random() * 90000)}`,
      estado: 'checkin',
    });
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(c: CheckIn) {
    setEditando(c);
    setValores({
      reserva: String(c.reserva),
      puerta: c.puerta ? String(c.puerta) : '',
      tarjeta_embarque: c.tarjeta_embarque,
      estado: c.estado,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleEliminar(c: CheckIn) {
    if (!window.confirm(`¿Eliminar el check-in #${c.id}?`)) return;
    try {
      await useCaseFactory.checkins.remove(c.id);
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar el check-in'));
    }
  }

  // Hacer check-in rápido desde vista cliente
  async function handleCheckinRapido(reservaId: number) {
    setLoading(true);
    setError(null);
    try {
      const codigoPase = `AV-${reservaId}-${Math.floor(100 + Math.random() * 900)}`;
      
      // Dado que el backend exige una puerta no nula, buscamos la primera puerta activa
      const puertaId = puertas.find((p) => p.activa)?.id || puertas[0]?.id;
      if (!puertaId) {
        throw new Error('No hay puertas de embarque disponibles para asignar. Comunícate con Staff.');
      }

      await useCaseFactory.checkins.create({
        reserva: reservaId,
        puerta: puertaId,
        tarjeta_embarque: codigoPase,
        estado: 'checkin', // El valor aceptado por el backend para el estado de check-in inicial
      });
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo realizar el check-in de la reserva'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const reservaId = Number(valores.reserva);
    const puertaId = Number(valores.puerta);
    
    if (!reservaId || !valores.tarjeta_embarque.trim() || !valores.estado.trim() || !puertaId) {
      setFormError('La reserva, código de pase, puerta y estado son obligatorios');
      return;
    }

    // Validar duplicado
    const duplicado = checkins.find(
      (c) => c.reserva === reservaId && c.id !== editando?.id
    );
    if (duplicado) {
      setFormError(`La reserva #${reservaId} ya tiene el check-in #${duplicado.id}`);
      return;
    }

    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        reserva: reservaId,
        puerta: puertaId,
        tarjeta_embarque: valores.tarjeta_embarque.trim(),
        estado: valores.estado.trim(),
      };

      if (editando) {
        await useCaseFactory.checkins.update(editando.id, input);
      } else {
        await useCaseFactory.checkins.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (e) {
      setFormError(getErrorMessage(e, 'No se pudo guardar el check-in'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <CrudPage
      titulo="Check-ins"
      destacado="Check-ins"
      descripcion="Control de embarque, asignación de puertas y tarjetas de abordaje"
      imagenHero={AVIATION_IMAGES.checkins}
      nombreEntidad="check-in"
      useCases={useCaseFactory.checkins}
      puedeMutar={isStaff}
      columns={[
        { header: 'ID', render: (c) => <span className="text-gray-400">#{c.id}</span> },
        { header: 'Reserva', render: (c) => `Reserva #${c.reserva}` },
        {
          header: 'Puerta',
          render: (c) =>
            c.puerta == null ? (
              <span className="text-gray-400">Por asignar</span>
            ) : (
              (puertasPorId.get(c.puerta)?.codigo ?? `#${c.puerta}`)
            ),
        },
        {
          header: 'Tarjeta de embarque',
          render: (c) => <span className="font-mono text-xs">{c.tarjeta_embarque || '—'}</span>,
        },
        { header: 'Estado', render: (c) => <Badge estado={c.estado} /> },
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
          name: 'puerta',
          label: 'Puerta',
          tipo: 'select',
          placeholder: 'Por asignar',
          options: puertas
            .filter((p) => p.activa)
            .map((p) => ({ value: String(p.id), label: p.codigo })),
        },
        { name: 'tarjeta_embarque', label: 'Tarjeta de embarque', tipo: 'text', placeholder: 'Ej: TKT-00123' },
        { name: 'estado', label: 'Estado', tipo: 'text', requerido: true, placeholder: 'Ej: pendiente' },
      ]}
      aInput={(v, editando) => {
        const reservaId = Number(v.reserva);
        const reserva = reservas.find((r) => r.id === reservaId);
        if (reserva && reserva.estado === EstadoReserva.Cancelada) {
          return 'No se puede hacer check-in de una reserva cancelada';
        }
        const duplicado = checkins.find(
          (c) => c.reserva === reservaId && c.id !== editando?.id,
        );
        if (duplicado) {
          return `La reserva #${reservaId} ya tiene el check-in #${duplicado.id}`;
        }
        return {
          reserva: reservaId,
          puerta: v.puerta ? Number(v.puerta) : null,
          tarjeta_embarque: String(v.tarjeta_embarque).trim(),
          estado: String(v.estado).trim(),
        };
      }}
    />
  );
}
