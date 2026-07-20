import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ClaseTarifa } from '../../../domain/enums/ClaseTarifa';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { labelVuelo } from '../../utils/labels';
import { getErrorMessage } from '../../utils/formatters';
import { SeatMapSelector } from '../../components/SeatMapSelector';
import { Modal } from '../../components/Modal';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import type { Asiento } from '../../../domain/entities/Asiento';
import type { Vuelo } from '../../../domain/entities/Vuelo';

export function AsientosPage() {
  const isStaff = useAuthStore((state) => state.isStaff);
  
  const [vuelos, setVuelos] = useState<Vuelo[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros, búsquedas y selección visual
  const [vueloSelId, setVueloSelId] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [asientoSelCodigo, setAsientoSelCodigo] = useState<string>('');

  // Estados para CRUD
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Asiento | null>(null);
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

  // Vuelo seleccionado completo
  const vueloSeleccionado = useMemo(() => {
    if (!vueloSelId) return null;
    return vuelos.find((v) => v.id === Number(vueloSelId)) || null;
  }, [vuelos, vueloSelId]);

  // Asientos del vuelo seleccionado
  const asientosDelVuelo = useMemo(() => {
    if (!vueloSelId) return [];
    return asientos.filter((a) => a.vuelo === Number(vueloSelId));
  }, [asientos, vueloSelId]);

  // Asiento seleccionado visualmente
  const seatSelected = useMemo(() => {
    if (!asientoSelCodigo) return null;
    return asientosDelVuelo.find((a) => a.codigo.toUpperCase() === asientoSelCodigo.toUpperCase()) || null;
  }, [asientosDelVuelo, asientoSelCodigo]);

  // Asientos filtrados por búsqueda
  const asientosFiltrados = useMemo(() => {
    return asientosDelVuelo.filter((a) =>
      a.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.clase.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [asientosDelVuelo, busqueda]);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const totalCargados = asientosDelVuelo.length;
    const ocupados = asientosDelVuelo.filter((a) => !a.disponible).length;
    const disponibles = asientosDelVuelo.filter((a) => a.disponible).length;
    const vip = asientosDelVuelo.filter((a) => a.clase === ClaseTarifa.Primera || a.clase === ClaseTarifa.Business).length;
    const economica = asientosDelVuelo.filter((a) => a.clase === ClaseTarifa.Economica).length;
    
    // Capacidad teórica del avión
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

  // Funciones CRUD
  function abrirCrear() {
    setEditando(null);
    setValores({
      codigo: '',
      fila: '',
      columna: '',
      clase: ClaseTarifa.Economica,
      disponible: true,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(asiento: Asiento) {
    setEditando(asiento);
    setValores({
      codigo: asiento.codigo,
      fila: String(asiento.fila),
      columna: asiento.columna,
      clase: asiento.clase,
      disponible: asiento.disponible,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function eliminar(asiento: Asiento) {
    if (!window.confirm(`¿Eliminar el asiento ${asiento.codigo}?`)) return;
    try {
      await useCaseFactory.asientos.remove(asiento.id);
      setAsientoSelCodigo('');
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar el asiento'));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const filaNum = Number(valores.fila);
    if (!valores.codigo.trim() || !valores.columna.trim() || Number.isNaN(filaNum) || filaNum <= 0) {
      setFormError('Código, columna y fila (número positivo) son obligatorios');
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
      if (editando) {
        await useCaseFactory.asientos.update(editando.id, input);
      } else {
        await useCaseFactory.asientos.create(input);
      }
      setModalAbierto(false);
      await cargar();
      if (editando && asientoSelCodigo.toUpperCase() === editando.codigo.toUpperCase()) {
        setAsientoSelCodigo(input.codigo);
      }
    } catch (e) {
      setFormError(getErrorMessage(e, 'No se pudo guardar el asiento'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner de Cabecera Premium */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-dark-surface via-dark-surface to-primary/10 border border-dark-border p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-6 w-6 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span className="text-xs font-bold tracking-widest text-primary-light uppercase">Operaciones de Flota</span>
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl text-white">
              Gestión de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Asientos</span>
            </h1>
            <p className="mt-2 text-sm text-gray-400 max-w-xl">
              Configura la distribución física, tipos de clase y disponibilidad en tiempo real para cada vuelo de la aerolínea.
            </p>
          </div>
        </div>
      </div>

      {/* Selector de Vuelo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-surface/50 border border-dark-border p-5 rounded-2xl">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Seleccionar Vuelo
          </label>
          <p className="text-xs text-gray-500">
            Elige un vuelo del catálogo para visualizar su configuración
          </p>
        </div>
        <div className="w-full md:w-96">
          <select
            value={vueloSelId}
            onChange={(e) => {
              setVueloSelId(e.target.value);
              setBusqueda('');
              setAsientoSelCodigo('');
            }}
            className="w-full bg-dark border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-light transition-all duration-200 cursor-pointer"
          >
            <option value="">-- Selecciona un vuelo --</option>
            {vuelos.map((v) => (
              <option key={v.id} value={v.id}>
                {labelVuelo(v)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary-light text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-dark-border bg-dark-surface p-6 h-28" />
          ))}
        </div>
      ) : !vueloSelId ? (
        /* Pantalla Vacía de Bienvenida */
        <div className="rounded-3xl border border-dashed border-dark-border bg-dark-surface/10 p-16 text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-dark-surface/50 border border-dark-border rounded-2xl text-gray-500">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Ningún vuelo seleccionado</h3>
          <p className="text-sm text-gray-400 max-w-sm">
            Selecciona un vuelo arriba para poder visualizar sus asientos asignados, la distribución de la cabina y sus estadísticas.
          </p>
        </div>
      ) : (
        /* Panel del Vuelo Activo */
        <div className="space-y-6">
          {/* Tarjetas de Estadísticas */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {/* Capacidad */}
            <div className="rounded-2xl border border-dark-border bg-dark-surface/50 p-5 shadow-lg relative overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Capacidad Cabina</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{stats.totalCargados}</span>
                <span className="text-xs text-gray-500">/ {stats.capacidadAvion} máx</span>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">Asientos configurados</p>
            </div>

            {/* Disponibles */}
            <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Disponibles</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-300">{stats.disponibles}</span>
                <span className="text-xs text-emerald-500 font-bold">
                  {stats.totalCargados ? Math.round((stats.disponibles / stats.totalCargados) * 100) : 0}%
                </span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-500">Listos para reservar</p>
            </div>

            {/* Ocupados */}
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-primary-light tracking-wider">Ocupados</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-primary-light">{stats.ocupados}</span>
                <span className="text-xs text-primary-light/75 font-bold">
                  {stats.totalCargados ? Math.round((stats.ocupados / stats.totalCargados) * 100) : 0}%
                </span>
              </div>
              <p className="mt-1 text-[11px] text-primary-light/60">Asignados a reservas</p>
            </div>

            {/* VIP vs Económico */}
            <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-5 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Distribución</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-300">{stats.vip} VIP</span>
                <span className="text-xs text-gray-500">· {stats.economica} Econ</span>
              </div>
              <p className="mt-1 text-[11px] text-amber-500/70">Clases del avión</p>
            </div>
          </div>

          {/* Sección Interactiva: Mapa + Listado/Detalle */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Columna Izquierda: Mapa de Cabina del Avión */}
            <div className="w-full lg:w-[320px] shrink-0 bg-dark-surface/40 border border-dark-border rounded-3xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 border-b border-dark-border pb-2.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <svg className="h-4.5 w-4.5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11V4a1 1 0 00-1-1H4a1 1 0 00-1 1v7c0 2.117.383 4.143 1.082 6l.048.093m0 0a14.002 14.002 0 002.466 3.792m0 0A14.003 14.003 0 0112 21a14.003 14.003 0 014.162-1.618m0 0a14.002 14.002 0 002.466-3.792m0 0l.048-.093A14.003 14.003 0 0022 11V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v7c0 3.517-1.009 6.799-2.753 9.571" />
                  </svg>
                  Cabina de Pasajeros
                </h3>
                {asientoSelCodigo && (
                  <button
                    onClick={() => setAsientoSelCodigo('')}
                    className="text-[10px] font-bold text-primary-light hover:text-white uppercase tracking-wider transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <SeatMapSelector
                capacidad={stats.capacidadAvion}
                asientos={asientosDelVuelo}
                value={asientoSelCodigo}
                onChange={(codigo) => {
                  setAsientoSelCodigo(codigo);
                }}
                permiteSeleccionarOcupados={true}
              />
            </div>

            {/* Columna Derecha: Detalle de Selección o Listado de Asientos */}
            <div className="flex-1 w-full animate-fade-in">
              {seatSelected ? (
                /* Detalle de Asiento Seleccionado */
                <div className="bg-dark-surface/30 border border-primary/20 rounded-3xl p-6 shadow-xl relative overflow-hidden animate-scale-in">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-start justify-between border-b border-dark-border pb-4 mb-5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-primary-light tracking-wider block">Administración de Asiento</span>
                      <h2 className="text-2xl font-black text-white mt-1">Ubicación: Asiento {seatSelected.codigo}</h2>
                    </div>
                    <Button variant="secondary" size="small" onClick={() => setAsientoSelCodigo('')}>
                      Volver al listado
                    </Button>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="bg-dark-surface/50 border border-dark-border p-4 rounded-2xl">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Clase de Asiento</span>
                        <span className="text-base font-bold text-white capitalize mt-1 block">{seatSelected.clase}</span>
                      </div>

                      <div className="bg-dark-surface/50 border border-dark-border p-4 rounded-2xl">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Fila y Columna</span>
                        <span className="text-base font-bold text-white mt-1 block">Fila {seatSelected.fila} · Columna {seatSelected.columna}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-dark-surface/50 border border-dark-border p-4 rounded-2xl">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Disponibilidad</span>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge estado={seatSelected.disponible ? 'disponible' : 'ocupado'} />
                          <span className="text-xs text-gray-400">
                            {seatSelected.disponible ? 'Disponible para asignación' : 'Ocupado por una reserva'}
                          </span>
                        </div>
                      </div>

                      {isStaff && (
                        <div className="bg-dark-surface/50 border border-dark-border p-4 rounded-2xl flex flex-col justify-center h-[90px]">
                          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-2">Acciones Administrativas</span>
                          <div className="flex gap-3">
                            <Button size="small" variant="secondary" className="flex-1" onClick={() => abrirEditar(seatSelected)}>
                              Editar Asiento
                            </Button>
                            <Button size="small" variant="danger" className="flex-1" onClick={() => eliminar(seatSelected)}>
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Listado de Asientos de Apoyo */
                <div className="bg-dark-surface/30 border border-dark-border rounded-3xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-dark-border pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white">Listado de Asientos</h2>
                      <p className="text-xs text-gray-400">Detalle de ubicaciones y disponibilidad física.</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Buscar asiento..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full sm:w-60 bg-dark border border-dark-border rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-light transition-all"
                      />
                      {isStaff && (
                        <Button size="small" className="whitespace-nowrap" onClick={abrirCrear}>
                          Agregar Asiento
                        </Button>
                      )}
                    </div>
                  </div>

                  {asientosFiltrados.length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-500">
                      No se encontraron asientos con los criterios de búsqueda.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-dark-border/60 text-gray-500 uppercase tracking-wider">
                            <th className="px-4 py-3 font-bold">Código</th>
                            <th className="px-4 py-3 font-bold">Fila</th>
                            <th className="px-4 py-3 font-bold">Columna</th>
                            <th className="px-4 py-3 font-bold">Clase</th>
                            <th className="px-4 py-3 font-bold">Estado</th>
                            {isStaff && <th className="px-4 py-3 text-right font-bold">Acciones</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {asientosFiltrados.map((a) => (
                            <tr
                              key={a.id}
                              onClick={() => setAsientoSelCodigo(a.codigo)}
                              className="border-b border-dark-border/30 last:border-b-0 hover:bg-dark-surface/20 transition-all cursor-pointer"
                            >
                              <td className="px-4 py-3 font-mono font-bold text-white">{a.codigo}</td>
                              <td className="px-4 py-3 text-stone-300">{a.fila}</td>
                              <td className="px-4 py-3 text-stone-300">{a.columna}</td>
                              <td className="px-4 py-3 capitalize">
                                <span className={a.clase === ClaseTarifa.Primera || a.clase === ClaseTarifa.Business ? 'text-amber-300 font-semibold' : 'text-stone-400'}>
                                  {a.clase}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <Badge estado={a.disponible ? 'disponible' : 'ocupado'} />
                              </td>
                              {isStaff && (
                                <td className="px-4 py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setAsientoSelCodigo(a.codigo)}
                                    className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1"
                                  >
                                    Gestionar
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de CRUD para Administradores */}
      <Modal
        open={modalAbierto}
        title={editando ? `Editar Asiento: ${editando.codigo}` : 'Agregar Nuevo Asiento'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs rounded-xl bg-primary/10 border border-primary/20 text-primary-light">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Código del Asiento"
              required
              value={valores.codigo}
              onChange={(e) => setValores((prev) => ({ ...prev, codigo: e.target.value }))}
              placeholder="Ej: 12A"
              maxLength={4}
            />
            <FormSelect
              label="Clase"
              required
              value={valores.clase}
              onChange={(e) => setValores((prev) => ({ ...prev, clase: e.target.value as ClaseTarifa }))}
              options={Object.values(ClaseTarifa).map((c) => ({ value: c, label: c }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Fila (Número)"
              type="number"
              required
              value={valores.fila}
              onChange={(prev) => setValores((p) => ({ ...p, fila: prev.target.value }))}
              placeholder="Ej: 12"
            />
            <FormInput
              label="Columna (Letra)"
              required
              value={valores.columna}
              onChange={(prev) => setValores((p) => ({ ...p, columna: prev.target.value }))}
              placeholder="Ej: A"
              maxLength={2}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="disponible-check"
              type="checkbox"
              checked={valores.disponible}
              onChange={(e) => setValores((prev) => ({ ...prev, disponible: e.target.checked }))}
              className="h-4.5 w-4.5 rounded border-dark-border bg-dark text-primary focus:ring-primary focus:ring-opacity-25"
            />
            <label htmlFor="disponible-check" className="text-xs font-semibold text-gray-300 select-none cursor-pointer">
              Asiento disponible para reservas
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-border">
            <Button variant="secondary" type="button" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar Asiento'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
