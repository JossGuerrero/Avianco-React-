import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { labelReserva } from '../../utils/labels';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function EquipajesPage() {
  const { user, isStaff } = useAuthStore();

  const [equipajes, setEquipajes] = useState<Equipaje[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([]);
  const [vuelos, setVuelos] = useState<Vuelo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');

  // Estados para CRUD de Equipaje
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Equipaje | null>(null);
  const [valores, setValores] = useState({
    reserva: '',
    tipo: 'bodega',
    peso_kg: '15.0',
    descripcion: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [equipajesData, reservasData, pasajerosData, vuelosData] = await Promise.all([
        useCaseFactory.equipajes.getAll(),
        useCaseFactory.reservas.getAll(),
        useCaseFactory.pasajeros.getAll(),
        useCaseFactory.vuelos.getAll(),
      ]);
      setEquipajes(equipajesData);
      setReservas(reservasData);
      setPasajeros(pasajerosData);
      setVuelos(vuelosData);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los datos de equipajes'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Indexadores rápidos
  const reservasPorId = useMemo(() => new Map(reservas.map((r) => [r.id, r])), [reservas]);
  const pasajerosPorId = useMemo(() => new Map(pasajeros.map((p) => [p.id, p])), [pasajeros]);
  const vuelosPorId = useMemo(() => new Map(vuelos.map((v) => [v.id, v])), [vuelos]);

  // Filtro de propiedad de datos para Clientes
  const misPasajerosIds = useMemo(() => {
    return new Set(pasajeros.filter((p) => p.usuario === user?.id).map((p) => p.id));
  }, [pasajeros, user]);

  const misReservasIds = useMemo(() => {
    return new Set(reservas.filter((r) => misPasajerosIds.has(r.pasajero)).map((r) => r.id));
  }, [reservas, misPasajerosIds]);

  const equipajesVisibles = useMemo(() => {
    if (isStaff) return equipajes;
    return equipajes.filter((e) => misReservasIds.has(e.reserva));
  }, [equipajes, isStaff, misReservasIds]);

  // Equipajes filtrados por búsqueda (código de reserva, pasajero o descripción)
  const equipajesFiltrados = useMemo(() => {
    return equipajesVisibles.filter((e) => {
      const res = reservasPorId.get(e.reserva);
      const pas = res ? pasajerosPorId.get(res.pasajero) : null;
      const nombrePasajero = pas ? (pas.nombre_completo || pas.numero_pasaporte) : '';
      
      return (
        String(e.reserva).includes(busqueda) ||
        nombrePasajero.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.tipo.toLowerCase().includes(busqueda.toLowerCase()) ||
        (e.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())
      );
    });
  }, [equipajesVisibles, busqueda, reservasPorId, pasajerosPorId]);

  // Reservas disponibles para registrar maletas
  const reservasDisponibles = useMemo(() => {
    const listaReservas = isStaff 
      ? reservas 
      : reservas.filter((r) => misPasajerosIds.has(r.pasajero));
    return listaReservas.filter((r) => r.estado !== EstadoReserva.Cancelada);
  }, [reservas, isStaff, misPasajerosIds]);

  // Estadísticas del panel superior
  const stats = useMemo(() => {
    const totalCount = equipajesVisibles.length;
    const pesoTotal = equipajesVisibles.reduce((acc, curr) => acc + Number(curr.peso_kg), 0);
    const cabina = equipajesVisibles.filter((e) => e.tipo.toLowerCase() === 'cabina').length;
    const bodega = equipajesVisibles.filter((e) => e.tipo.toLowerCase() === 'bodega').length;
    const especial = equipajesVisibles.filter((e) => e.tipo.toLowerCase() === 'especial').length;
    
    return {
      totalCount,
      pesoTotal: Math.round(pesoTotal * 10) / 10,
      cabina,
      bodega,
      especial,
    };
  }, [equipajesVisibles]);

  // Lógica CRUD
  function abrirCrear() {
    setEditando(null);
    setValores({
      reserva: reservasDisponibles[0] ? String(reservasDisponibles[0].id) : '',
      tipo: 'bodega',
      peso_kg: '15.0',
      descripcion: '',
    });
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(e: Equipaje) {
    setEditando(e);
    setValores({
      reserva: String(e.reserva),
      tipo: e.tipo,
      peso_kg: String(e.peso_kg),
      descripcion: e.descripcion || '',
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleEliminar(e: Equipaje) {
    if (!window.confirm(`¿Eliminar la etiqueta de equipaje #${e.id}?`)) return;
    try {
      await useCaseFactory.equipajes.remove(e.id);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el equipaje'));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const reservaId = Number(valores.reserva);
    const peso = Number(valores.peso_kg);
    
    if (!reservaId || !valores.tipo || Number.isNaN(peso) || peso <= 0) {
      setFormError('La reserva, tipo y peso (mayor a 0) son obligatorios');
      return;
    }

    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        reserva: reservaId,
        tipo: valores.tipo as TipoEquipaje,
        peso_kg: peso,
        descripcion: valores.descripcion.trim(),
      };

      if (editando) {
        await useCaseFactory.equipajes.update(editando.id, input);
      } else {
        await useCaseFactory.equipajes.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo registrar el equipaje'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <CrudPage
      titulo="Equipajes"
      destacado="Equipajes"
      descripcion="Control de maletas, peso permitido y tipo de equipaje por reserva"
      imagenHero={AVIATION_IMAGES.equipajes}
      nombreEntidad="equipaje"
      useCases={useCaseFactory.equipajes}
      puedeMutar={isStaff}
      columns={[
        { header: 'ID', render: (e) => <span className="text-gray-400">#{e.id}</span> },
        { header: 'Reserva', render: (e) => `Reserva #${e.reserva}` },
        { header: 'Tipo', render: (e) => <span className="capitalize">{e.tipo}</span> },
        { header: 'Peso', render: (e) => `${Number(e.peso_kg)} kg` },
        { header: 'Descripción', render: (e) => e.descripcion || '—' },
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
          name: 'tipo',
          label: 'Tipo',
          tipo: 'select',
          requerido: true,
          options: Object.values(TipoEquipaje).map((t) => ({ value: t, label: t })),
        },
        { name: 'peso_kg', label: 'Peso (kg)', tipo: 'number', requerido: true, step: '0.1', placeholder: 'Ej: 23' },
        { name: 'descripcion', label: 'Descripción', tipo: 'text' },
      ]}
      aInput={(v) => {
        const peso = Number(v.peso_kg);
        if (Number.isNaN(peso) || peso <= 0) return 'El peso debe ser un número positivo';
        return {
          reserva: Number(v.reserva),
          tipo: String(v.tipo) as TipoEquipaje,
          peso_kg: peso,
          descripcion: String(v.descripcion).trim(),
        };
      }}
    />
  );
}
