import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ClaseTarifa } from '../../../domain/enums/ClaseTarifa';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../utils/formatters';
import { SeatMapSelector } from '../../components/SeatMapSelector';
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
    <div className="relative space-y-8 animate-fade-in pb-12">
      {/* Elementos de Iluminación Ambiental (Estilo Espejo Glass) */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera Principal */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-primary-light uppercase">Panel de Control de Aviones</span>
            </div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl text-white tracking-tight">
              Configurador de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Asientos de Vuelo</span>
            </h1>
            <p className="mt-2 text-xs text-gray-400 max-w-xl leading-relaxed">
              Selecciona un vuelo para editar el mapa físico del avión en tiempo real. Configura asientos VIP o económicos y su disponibilidad de reserva.
            </p>
          </div>
          {vueloSelId && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                setVueloSelId('');
                setAsientoSelCodigo('');
                setCreandoNuevo(false);
              }}
              className="border-white/10 hover:bg-white/5 transition-all text-xs font-semibold px-4 py-2"
            >
              ← Cambiar de Vuelo
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary-light text-xs backdrop-blur-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-3xl border border-white/5 bg-white/5 h-44" />
          ))}
        </div>
      ) : !vueloSelId ? (
        /* ================= PASO 1: SELECCIONAR VUELO (GRILLA PREMIUM) ================= */
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-white tracking-wide">Vuelos Activos de la Aerolínea</h2>
            <p className="text-xs text-gray-400">Selecciona un vuelo del catálogo para configurar sus asientos.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vuelos.map((v) => {
              const origen = v.origen_detalle?.codigo_iata || 'ORG';
              const destino = v.destino_detalle?.codigo_iata || 'DST';
              const ciudadOrigen = v.origen_detalle?.ciudad || 'Origen';
              const ciudadDestino = v.destino_detalle?.ciudad || 'Destino';
              const fecha = new Date(v.fecha_salida).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
              const hora = new Date(v.fecha_salida).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
              
              return (
                <div
                  key={v.id}
                  onClick={() => setVueloSelId(String(v.id))}
                  className="relative group cursor-pointer border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md rounded-3xl p-6 shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1 text-left flex flex-col justify-between min-h-[170px]"
                >
                  {/* Glowing light effect on hover */}
                  <div className="absolute -inset-px bg-gradient-to-br from-primary/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="space-y-4 relative z-10">
                    {/* Encabezado del ticket */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <span className="text-[10px] font-bold text-primary-light uppercase tracking-wider">VUELO #{v.id}</span>
                      <span className="text-[10px] text-gray-400 font-semibold">{v.aeronave_detalle?.modelo || 'Aeronave'}</span>
                    </div>

                    {/* Ruta de aeropuertos */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-left">
                        <span className="text-xl font-black text-white block tracking-tight">{origen}</span>
                        <span className="text-[10px] text-gray-500 block truncate max-w-[80px]">{ciudadOrigen}</span>
                      </div>
                      
                      {/* Avión en medio */}
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-full border-t border-dashed border-white/20 relative">
                          <svg className="h-4 w-4 text-primary absolute left-1/2 -translate-x-1/2 -top-2 transform rotate-90" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10.18 9 M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l8 2.5z"/>
                          </svg>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-black text-white block tracking-tight">{destino}</span>
                        <span className="text-[10px] text-gray-500 block truncate max-w-[80px]">{ciudadDestino}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pie de tarjeta */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-4 relative z-10">
                    <span className="text-[11px] font-semibold text-gray-400">{fecha} · {hora}</span>
                    <span className="text-xs font-bold text-primary-light group-hover:text-white transition-colors flex items-center gap-1">
                      Gestionar Asientos →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= PASO 2: MAPA DE ASIENTOS E INTERFAZ DE GESTIÓN IN-LINE ================= */
        <div className="space-y-6">
          {/* Ficha rápida del vuelo cargado */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                <svg className="h-4 w-4 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold block">Vuelo Seleccionado</span>
                <span className="text-white font-bold text-sm">
                  {vueloSeleccionado?.origen_detalle?.codigo_iata} ➔ {vueloSeleccionado?.destino_detalle?.codigo_iata} ({vueloSeleccionado?.aeronave_detalle?.modelo})
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Asientos Configurados</span>
                <span className="text-white font-bold">{stats.totalCargados} / {stats.capacidadAvion}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-emerald-400 block">Libres</span>
                <span className="text-emerald-300 font-bold">{stats.disponibles}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-primary-light block">Ocupados</span>
                <span className="text-primary-light font-bold">{stats.ocupados}</span>
              </div>
            </div>
          </div>

          {/* Grilla principal: Mapa en izquierda y Formulario Inline en la derecha */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Columna Izquierda: El Fuselaje del Avión */}
            <div className="w-full lg:w-[330px] shrink-0 border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md rounded-3xl p-5 shadow-2xl relative text-center">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between border-b border-white/10 pb-2.5 text-left">
                <span className="flex items-center gap-2">
                  <svg className="h-4.5 w-4.5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11V4a1 1 0 00-1-1H4a1 1 0 00-1 1v7c0 2.117.383 4.143 1.082 6l.048.093m0 0a14.002 14.002 0 002.466 3.792m0 0A14.003 14.003 0 0112 21a14.003 14.003 0 014.162-1.618m0 0a14.002 14.002 0 002.466-3.792m0 0l.048-.093A14.003 14.003 0 0022 11V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v7c0 3.517-1.009 6.799-2.753 9.571" />
                  </svg>
                  Mapa de la Cabina
                </span>
                <span className="text-[10px] text-gray-500 font-semibold">Toca un asiento</span>
              </h3>
              
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

            {/* Columna Derecha: Panel de Control Dinámico (Sin Modales Innecesarios) */}
            <div className="flex-1 w-full border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md rounded-3xl p-6 shadow-2xl relative min-h-[380px] flex flex-col justify-between">
              
              {/* Contenido del Panel */}
              <div className="space-y-6">
                
                {/* 1. Encabezado del Panel */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Panel de Administración de Asientos</h3>
                    <p className="text-xs text-gray-400">Edita o agrega asientos directamente interactuando con la cabina.</p>
                  </div>
                  {isStaff && !creandoNuevo && (
                    <Button size="small" onClick={activarCrear}>
                      + Crear Nuevo Asiento
                    </Button>
                  )}
                </div>

                {/* 2. Caso: Asiento Seleccionado o Nuevo Asiento */}
                {seatSelected || creandoNuevo ? (
                  <form onSubmit={handleGuardar} className="space-y-5 animate-scale-in">
                    
                    {/* Título de estado del formulario */}
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-primary animate-ping" />
                      <span className="text-sm font-bold text-white">
                        {creandoNuevo ? 'Creando Asiento Nuevo' : `Gestionando Asiento ${seatSelected?.codigo}`}
                      </span>
                    </div>

                    {formError && (
                      <div className="p-3 text-xs rounded-xl bg-primary/10 border border-primary/20 text-primary-light">
                        {formError}
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormInput
                        label="Código Identificador (Ej: 12A)"
                        required
                        value={valores.codigo}
                        onChange={(e) => setValores((prev) => ({ ...prev, codigo: e.target.value }))}
                        placeholder="Ej: 12A"
                        maxLength={4}
                      />
                      <FormSelect
                        label="Clase del Asiento"
                        required
                        value={valores.clase}
                        onChange={(e) => setValores((prev) => ({ ...prev, clase: e.target.value as ClaseTarifa }))}
                        options={Object.values(ClaseTarifa).map((c) => ({ value: c, label: c }))}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormInput
                        label="Fila (Número)"
                        type="number"
                        required
                        value={valores.fila}
                        onChange={(e) => setValores((p) => ({ ...p, fila: e.target.value }))}
                        placeholder="Ej: 12"
                      />
                      <FormInput
                        label="Columna (Letra)"
                        required
                        value={valores.columna}
                        onChange={(e) => setValores((p) => ({ ...p, columna: e.target.value }))}
                        placeholder="Ej: A"
                        maxLength={2}
                      />
                    </div>

                    {/* Checkbox Disponible */}
                    <div className="flex items-center gap-3 pt-2">
                      <input
                        id="form-disponible-check"
                        type="checkbox"
                        checked={valores.disponible}
                        onChange={(e) => setValores((prev) => ({ ...prev, disponible: e.target.checked }))}
                        className="h-5 w-5 rounded border-white/20 bg-dark text-primary focus:ring-primary focus:ring-opacity-25 focus:ring-offset-0 cursor-pointer"
                      />
                      <label htmlFor="form-disponible-check" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                        ¿Habilitado para reserva en línea? <span className="text-[10px] text-gray-500 font-normal">(Desmarca para marcarlo como Ocupado/Bloqueado)</span>
                      </label>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-6">
                      <div>
                        {seatSelected && isStaff && (
                          <Button
                            type="button"
                            variant="danger"
                            size="small"
                            onClick={() => handleEliminar(seatSelected)}
                          >
                            Eliminar Asiento
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={() => {
                            setAsientoSelCodigo('');
                            setCreandoNuevo(false);
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" size="small" disabled={guardando}>
                          {guardando ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                      </div>
                    </div>

                  </form>
                ) : (
                  /* 3. Caso: Ninguno Seleccionado (Muestra Instrucciones Claras y Estadísticas de Apoyo) */
                  <div className="py-8 text-center space-y-6 animate-fade-in flex flex-col items-center">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-full text-gray-400">
                      <svg className="h-10 w-10 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    
                    <div className="max-w-sm space-y-2">
                      <h4 className="text-sm font-bold text-white">¿Cómo administrar este vuelo?</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        1. Haz clic en **cualquier asiento** en el mapa del avión a tu izquierda.
                        <br />
                        2. El panel se actualizará para editar su clase (VIP / Económico) o marcarlo como disponible.
                        <br />
                        3. Haz clic en **"Crear Asiento"** si deseas añadir una nueva ubicación a la fila.
                      </p>
                    </div>

                    <div className="w-full max-w-md grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-left">
                        <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Primera / VIP</span>
                        <span className="text-base font-black text-amber-300 block mt-1">{stats.vip} asientos</span>
                      </div>
                      <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-left">
                        <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Clase Económica</span>
                        <span className="text-base font-black text-emerald-300 block mt-1">{stats.economica} asientos</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
