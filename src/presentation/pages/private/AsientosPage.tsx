import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ClaseTarifa } from '../../../domain/enums/ClaseTarifa';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useLista } from '../../utils/useLista';
import { labelVuelo } from '../../utils/labels';
import { AVIATION_IMAGES } from '../../utils/aviationImages';

export function AsientosPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  
  const [vuelos, setVuelos] = useState<Vuelo[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de control
  const [vueloSelId, setVueloSelId] = useState<string>('');
  const [asientoSelCodigo, setAsientoSelCodigo] = useState<string>('');
  const [creandoNuevo, setCreandoNuevo] = useState<boolean>(false);

  // Formulario en panel lateral
  const [valores, setValores] = useState({
    codigo: '',
    fila: '',
    columna: '',
    clase: ClaseTarifa.Economica as ClaseTarifa,
    disponible: true,
  });
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vuelosData, asientosData] = await Promise.all([
        useCaseFactory.vuelos.getAll(),
        useCaseFactory.asientos.getAll(),
      ]);
      setVuelos(vuelosData);
      setAsientos(asientosData);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los datos de asientos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Vuelo seleccionado
  const vueloSeleccionado = useMemo(() => {
    if (!vueloSelId) return null;
    return vuelos.find((v) => v.id === Number(vueloSelId)) || null;
  }, [vuelos, vueloSelId]);

  // Asientos del vuelo activo
  const asientosDelVuelo = useMemo(() => {
    if (!vueloSelId) return [];
    return asientos.filter((a) => a.vuelo === Number(vueloSelId));
  }, [asientos, vueloSelId]);

  // Asiento actualmente seleccionado en el panel
  const seatSelected = useMemo(() => {
    if (!asientoSelCodigo) return null;
    return asientosDelVuelo.find((a) => a.codigo.toUpperCase() === asientoSelCodigo.toUpperCase()) || null;
  }, [asientosDelVuelo, asientoSelCodigo]);

  // Sincronizar formulario al seleccionar un asiento para editar
  useEffect(() => {
    if (seatSelected) {
      setValores({
        codigo: seatSelected.codigo,
        fila: String(seatSelected.fila),
        columna: seatSelected.columna,
        clase: seatSelected.clase,
        disponible: seatSelected.disponible,
      });
      setFormError(null);
      setCreandoNuevo(false);
    }
  }, [seatSelected]);

  // Estadísticas del vuelo seleccionado
  const stats = useMemo(() => {
    const totalCargados = asientosDelVuelo.length;
    const ocupados = asientosDelVuelo.filter((a) => !a.disponible).length;
    const disponibles = asientosDelVuelo.filter((a) => a.disponible).length;
    const vip = asientosDelVuelo.filter((a) => a.clase === ClaseTarifa.Primera || a.clase === ClaseTarifa.Business).length;
    const economica = asientosDelVuelo.filter((a) => a.clase === ClaseTarifa.Economica).length;
    const capacidadAvion = vueloSeleccionado?.aeronave_detalle?.capacidad || 0;
    
    return {
      totalCargados,
      ocupados,
      disponibles,
      vip,
      economica,
      capacidadAvion,
    };
  }, [asientosDelVuelo, vueloSeleccionado]);

  // Activar modo creación en el panel lateral
  function activarCrear() {
    setAsientoSelCodigo('');
    setValores({
      codigo: '',
      fila: '',
      columna: '',
      clase: ClaseTarifa.Economica,
      disponible: true,
    });
    setFormError(null);
    setCreandoNuevo(true);
  }

  // Eliminar un asiento
  async function handleEliminar(asiento: Asiento) {
    if (!window.confirm(`¿Estás seguro de eliminar el asiento ${asiento.codigo}?`)) return;
    try {
      await useCaseFactory.asientos.remove(asiento.id);
      setAsientoSelCodigo('');
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar el asiento'));
    }
  }

  // Guardar (Creación o Edición)
  async function handleGuardar(event: FormEvent) {
    event.preventDefault();
    const filaNum = Number(valores.fila);
    if (!valores.codigo.trim() || !valores.columna.trim() || Number.isNaN(filaNum) || filaNum <= 0) {
      setFormError('El código, columna y fila (número positivo) son requeridos');
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        vuelo: Number(vueloSelId),
        codigo: valores.codigo.trim().toUpperCase(),
        clase: valores.clase,
        fila: filaNum,
        columna: valores.columna.trim().toUpperCase(),
        disponible: valores.disponible,
      };

      if (creandoNuevo) {
        await useCaseFactory.asientos.create(input);
        setCreandoNuevo(false);
      } else if (seatSelected) {
        await useCaseFactory.asientos.update(seatSelected.id, input);
      }
      
      await cargar();
      setAsientoSelCodigo(input.codigo); // Mantener seleccionado
    } catch (e) {
      setFormError(getErrorMessage(e, 'Ocurrió un error al guardar el asiento'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <CrudPage
      titulo="Asientos"
      destacado="Asientos"
      descripcion="Disponibilidad por vuelo, fila, columna y clase de tarifa"
      imagenHero={AVIATION_IMAGES.asientos}
      nombreEntidad="asiento"
      useCases={useCaseFactory.asientos}
      puedeMutar={isStaff}
      columns={[
        { header: 'Código', render: (a) => <span className="font-mono font-bold">{a.codigo}</span> },
        {
          header: 'Vuelo',
          render: (a) => {
            const vuelo = vuelosPorId.get(a.vuelo);
            return vuelo ? labelVuelo(vuelo) : `Vuelo #${a.vuelo}`;
          },
        },
        { header: 'Clase', render: (a) => <span className="capitalize">{a.clase}</span> },
        { header: 'Posición', render: (a) => `Fila ${a.fila} · Col ${a.columna}` },
        { header: 'Estado', render: (a) => <Badge estado={a.disponible ? 'disponible' : 'ocupado'} /> },
      ]}
      campos={[
        {
          name: 'vuelo',
          label: 'Vuelo',
          tipo: 'select',
          requerido: true,
          placeholder: 'Selecciona un vuelo',
          options: vuelos.map((v) => ({ value: String(v.id), label: labelVuelo(v) })),
        },
        { name: 'codigo', label: 'Código', tipo: 'text', requerido: true, placeholder: 'Ej: 12A', maxLength: 4 },
        {
          name: 'clase',
          label: 'Clase',
          tipo: 'select',
          requerido: true,
          options: Object.values(ClaseTarifa).map((c) => ({ value: c, label: c })),
        },
        { name: 'fila', label: 'Fila', tipo: 'number', requerido: true, placeholder: 'Ej: 12' },
        { name: 'columna', label: 'Columna', tipo: 'text', requerido: true, placeholder: 'Ej: A', maxLength: 2 },
        { name: 'disponible', label: 'Disponible', tipo: 'checkbox' },
      ]}
      aInput={(v) => {
        const fila = Number(v.fila);
        if (Number.isNaN(fila) || fila <= 0) return 'La fila debe ser un número positivo';
        return {
          vuelo: Number(v.vuelo),
          codigo: String(v.codigo).trim().toUpperCase(),
          clase: String(v.clase) as ClaseTarifa,
          fila,
          columna: String(v.columna).trim().toUpperCase(),
          disponible: Boolean(v.disponible),
        };
      }}
    />
  );
}
