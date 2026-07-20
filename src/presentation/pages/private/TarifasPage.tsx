import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Tarifa } from '../../../domain/entities/Tarifa';
import { ClaseTarifa } from '../../../domain/enums/ClaseTarifa';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { getErrorMessage } from '../../utils/formatters';

interface TarifaForm {
  nombre: string;
  clase: ClaseTarifa;
  descripcion: string;
  descuento: string;
}

const FORM_VACIO: TarifaForm = {
  nombre: '',
  clase: ClaseTarifa.Economica,
  descripcion: '',
  descuento: '0',
};

const TARIFAS_FALLBACK: Tarifa[] = [
  {
    id: 1,
    nombre: 'Tarifa Súper Promo',
    clase: ClaseTarifa.Economica,
    descripcion: 'Vuela al precio más económico del mercado. Incluye equipaje de mano ligero (10kg) y asiento aleatorio estándar.',
    descuento: 20,
  },
  {
    id: 2,
    nombre: 'Flexi Business',
    clase: ClaseTarifa.Business,
    descripcion: 'Flexibilidad de cambios, mayor espacio para equipaje y asiento en cabina ejecutiva preferencial.',
    descuento: 10,
  },
  {
    id: 3,
    nombre: 'Imperial Platinum',
    clase: ClaseTarifa.Primera,
    descripcion: 'Exclusividad total en tierra y aire. Acceso prioritario, maletas en bodega y acceso VIP ilimitado.',
    descuento: 15,
  },
];

export function TarifasPage() {
  const { isStaff } = useAuthStore();

  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');

  // Estados para CRUD de Staff
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Tarifa | null>(null);
  const [form, setForm] = useState<TarifaForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTarifas(await useCaseFactory.tarifas.getAll());
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar las tarifas'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Si la BD está vacía, usamos las tarifas de demostración/semilla
  const tarifasEfectivas = useMemo(() => {
    return tarifas.length > 0 ? tarifas : TARIFAS_FALLBACK;
  }, [tarifas]);

  const esDemo = useMemo(() => tarifas.length === 0, [tarifas]);

  // Filtrado por buscador
  const filtradas = useMemo(() => {
    return tarifasEfectivas.filter((t) => {
      return (
        t.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.clase.toLowerCase().includes(busqueda.toLowerCase()) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
      );
    });
  }, [tarifasEfectivas, busqueda]);

  // Lógica CRUD de Staff
  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(tarifa: Tarifa) {
    setEditando(tarifa);
    setForm({
      nombre: tarifa.nombre,
      clase: tarifa.clase,
      descripcion: tarifa.descripcion || '',
      descuento: String(tarifa.descuento),
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleEliminar(tarifa: Tarifa) {
    if (esDemo) {
      alert('No puedes eliminar tarifas de demostración. Crea una nueva tarifa real primero.');
      return;
    }
    if (!window.confirm(`¿Eliminar la tarifa "${tarifa.nombre}"?`)) return;
    try {
      await useCaseFactory.tarifas.remove(tarifa.id);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la tarifa'));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const descuento = Number(form.descuento);
    
    if (!form.nombre.trim()) {
      setFormError('El nombre de la tarifa es obligatorio');
      return;
    }

    if (Number.isNaN(descuento) || descuento < 0 || descuento > 100) {
      setFormError('El porcentaje de descuento debe estar entre 0% y 100%');
      return;
    }

    // Validar nombre único (evitar duplicados excepto si estamos editando la misma)
    const nombreDuplicado = tarifas.find(
      (t) => t.nombre.toLowerCase().trim() === form.nombre.toLowerCase().trim() && t.id !== editando?.id
    );
    if (nombreDuplicado) {
      setFormError(`Ya existe otra tarifa registrada con el nombre "${form.nombre}"`);
      return;
    }

    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        nombre: form.nombre.trim(),
        clase: form.clase,
        descripcion: form.descripcion.trim(),
        descuento,
      };

      if (editando) {
        await useCaseFactory.tarifas.update(editando.id, input);
      } else {
        await useCaseFactory.tarifas.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo guardar la tarifa'));
    } finally {
      setGuardando(false);
    }
  }

  // Estadísticas de tarifas
  const stats = useMemo(() => {
    const totalCount = tarifasEfectivas.length;
    const promedioDescuento = totalCount
      ? tarifasEfectivas.reduce((acc, curr) => acc + Number(curr.descuento), 0) / totalCount
      : 0;
    const economica = tarifasEfectivas.filter((t) => t.clase === ClaseTarifa.Economica).length;
    const business = tarifasEfectivas.filter((t) => t.clase === ClaseTarifa.Business).length;
    const primera = tarifasEfectivas.filter((t) => t.clase === ClaseTarifa.Primera).length;

    return {
      totalCount,
      promedioDescuento: Math.round(promedioDescuento * 100) / 100,
      economica,
      business,
      primera,
    };
  }, [tarifasEfectivas]);

  return (
    <div className="relative space-y-8 animate-fade-in pb-12 text-left">
      {/* Luces de Fondo Glassmorphic */}
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera Principal */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4 max-w-xl text-left">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-primary-light uppercase">Configuración de Precios</span>
            </div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl text-white tracking-tight">
              Tarifas y <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Clases de Vuelo</span>
            </h1>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              {isStaff 
                ? 'Configura las clases de vuelo disponibles en la flota, aplica descuentos globales de temporada y gestiona los beneficios incluidos.'
                : 'Compara nuestras clases de viaje, desde nuestra cabina turista económica hasta la exclusividad de Primera Clase.'}
            </p>
          </div>
        </div>

        {/* Banner Generado por IA */}
        <div className="relative w-full md:w-64 h-24 rounded-2xl overflow-hidden border border-white/10 shadow-lg hidden md:block">
          <img 
            src="/fares_banner_1784570424812.png" 
            alt="Fares Banner" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark/80 to-transparent" />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary-light text-xs backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Alerta de Modo Demostración */}
      {esDemo && (
        <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs backdrop-blur-md flex items-center gap-3">
          <svg className="h-5 w-5 text-yellow-400 shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-bold">Tarifas de Demostración:</span> No hay registros de tarifas reales en la base de datos de tu servidor. Se han cargado automáticamente tarifas sugeridas semilla para propósitos de comparación visual.
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-white/5 bg-white/5 h-28" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tarjetas de Estadísticas (Efecto Espejo) */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tarifas Activas</span>
              <div className="mt-1.5 text-xl font-black text-white">{stats.totalCount}</div>
              <p className="mt-0.5 text-[10px] text-gray-400">Planes en base de datos</p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Descuento Promedio</span>
              <div className="mt-1.5 text-xl font-black text-blue-300">{stats.promedioDescuento}%</div>
              <p className="mt-0.5 text-[10px] text-blue-400">Ahorro en pasajes</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Cabina Económica</span>
              <div className="mt-1.5 text-xl font-black text-emerald-300">{stats.economica}</div>
              <p className="mt-0.5 text-[10px] text-emerald-400">Planes Turista</p>
            </div>

            <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">Cabina Business</span>
              <div className="mt-1.5 text-xl font-black text-yellow-300">{stats.business}</div>
              <p className="mt-0.5 text-[10px] text-yellow-400">Planes Ejecutivos</p>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Primera Clase</span>
              <div className="mt-1.5 text-xl font-black text-purple-300">{stats.primera}</div>
              <p className="mt-0.5 text-[10px] text-purple-400">Planes VIP Platinum</p>
            </div>
          </div>

          {/* Renderizado de Vistas */}
          {isStaff ? (
            /* ================= VISTA STAFF: LISTADO DE CONTROL ================= */
            <div className="border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Consola de Precios y Fares</h2>
                  <p className="text-xs text-gray-400">Configuración global de cabinas de vuelo y coeficientes.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, clase..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full sm:w-64 bg-dark/70 border border-white/15 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-light transition-all"
                  />
                  <Button size="small" onClick={abrirCrear}>
                    + Nueva Tarifa
                  </Button>
                </div>
              </div>

              {filtradas.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No se encontraron tarifas registradas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold">ID</th>
                        <th className="px-4 py-3 font-bold">Nombre</th>
                        <th className="px-4 py-3 font-bold">Clase de Cabina</th>
                        <th className="px-4 py-3 font-bold">Descuento</th>
                        <th className="px-4 py-3 font-bold">Descripción</th>
                        <th className="px-4 py-3 text-right font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtradas.map((t) => (
                        <tr key={t.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all">
                          <td className="px-4 py-3 text-gray-500">#{t.id}</td>
                          <td className="px-4 py-3 font-semibold text-white">{t.nombre}</td>
                          <td className="px-4 py-3 text-stone-300 capitalize">{t.clase}</td>
                          <td className="px-4 py-3 font-bold text-primary-light">{Number(t.descuento)}%</td>
                          <td className="px-4 py-3 text-stone-300 max-w-[200px] truncate">{t.descripcion || '—'}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              onClick={() => abrirEditar(t)}
                              className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleEliminar(t)}
                              className="text-primary-light hover:text-primary transition-all text-xs font-semibold px-2 py-1"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ================= VISTA CLIENTE: COMPARADOR DE PLANES ================= */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-wide">Planes y Beneficios de Cabina</h2>
                <span className="text-xs text-gray-400">{filtradas.length} tarifas de vuelo publicadas</span>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtradas.map((t) => {
                  const config = {
                    economica: {
                      cardBg: 'from-amber-700/5 to-amber-900/0 border-amber-700/20 hover:border-amber-700/40',
                      textTheme: 'text-amber-400',
                      glowColor: 'bg-amber-400/10 text-amber-300',
                      label: 'Clase Turista',
                      badgeStyle: 'bg-gradient-to-r from-amber-700 to-amber-600 text-amber-100',
                      beneficios: [
                        { ok: true, text: 'Equipaje de mano (10kg)' },
                        { ok: true, text: 'Asiento aleatorio estándar' },
                        { ok: false, text: 'Equipaje facturado en bodega (23kg)' },
                        { ok: false, text: 'Embarque prioritario' },
                        { ok: false, text: 'Acceso a Sala VIP Avianco' },
                      ],
                    },
                    business: {
                      cardBg: 'from-slate-400/5 to-slate-600/0 border-slate-400/20 hover:border-slate-400/40 shadow-blue-500/5',
                      textTheme: 'text-blue-300',
                      glowColor: 'bg-blue-400/10 text-blue-300',
                      label: 'Clase Ejecutiva',
                      badgeStyle: 'bg-gradient-to-r from-slate-500 to-slate-400 text-slate-900 font-bold',
                      beneficios: [
                        { ok: true, text: 'Equipaje de mano (10kg)' },
                        { ok: true, text: 'Selección de asiento estándar' },
                        { ok: true, text: 'Equipaje facturado (1 pieza 23kg)' },
                        { ok: true, text: 'Embarque preferencial (Grupo 2)' },
                        { ok: false, text: 'Acceso a Sala VIP Avianco' },
                      ],
                    },
                    primera: {
                      cardBg: 'from-purple-900/10 to-purple-950/0 border-purple-500/30 hover:border-purple-500/50 shadow-purple-500/10 scale-100 lg:scale-[1.02]',
                      textTheme: 'text-purple-300',
                      glowColor: 'bg-purple-400/15 text-purple-300',
                      label: 'Primera Clase',
                      badgeStyle: 'bg-gradient-to-r from-yellow-500 to-amber-400 text-amber-950 font-black',
                      beneficios: [
                        { ok: true, text: 'Equipaje de mano (10kg) + Bolso' },
                        { ok: true, text: 'Selección libre de asientos premium/salida' },
                        { ok: true, text: '2 Equipajes facturados (23kg c/u)' },
                        { ok: true, text: 'Abordaje prioritario (Grupo 1)' },
                        { ok: true, text: 'Acceso ilimitado a Sala VIP Avianco' },
                      ],
                    },
                  }[t.clase.toLowerCase()] || {
                    cardBg: 'from-white/5 to-white/0 border-white/10 hover:border-white/20',
                    textTheme: 'text-stone-300',
                    glowColor: 'bg-white/10 text-white',
                    label: 'Cabina Estándar',
                    badgeStyle: 'bg-stone-500 text-white',
                    beneficios: [
                      { ok: true, text: 'Asiento básico' },
                      { ok: false, text: 'Servicios extras' },
                    ],
                  };

                  return (
                    <div key={t.id} className={`relative overflow-hidden rounded-3xl border bg-gradient-to-b backdrop-blur-md shadow-2xl p-6 flex flex-col justify-between min-h-[460px] w-full animate-scale-in transition-all ${config.cardBg}`}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${config.badgeStyle}`}>
                            {config.label}
                          </span>
                          {Number(t.descuento) > 0 && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                              -{Number(t.descuento)}% Descuento
                            </span>
                          )}
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-black text-white">{t.nombre}</h3>
                          <p className="mt-1 text-xs text-stone-400 font-light min-h-[32px] leading-relaxed">
                            {t.descripcion || 'Disfruta del mejor confort a bordo con Avianco.'}
                          </p>
                        </div>
                      </div>

                      <div className="py-6 border-y border-white/5 space-y-3 text-left">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-mono">Servicios Incluidos</span>
                        <ul className="space-y-2.5">
                          {config.beneficios.map((b, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-200">
                              {b.ok ? (
                                <svg className="h-4.5 w-4.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="h-4.5 w-4.5 text-stone-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                              <span className={b.ok ? 'font-medium' : 'text-stone-500 line-through'}>{b.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 flex items-center justify-between gap-4">
                        <div className="text-left">
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-mono">Cabina Base</span>
                          <span className={`text-sm font-black ${config.textTheme} capitalize`}>{t.clase}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                          Ref: #{t.id}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de CRUD de Tarifa (Staff) */}
      <Modal
        open={modalAbierto}
        title={editando ? `Editar tarifa: ${editando.nombre}` : 'Nueva tarifa de vuelo'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {formError && (
            <p className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-xs text-primary-light">
              {formError}
            </p>
          )}

          <FormInput
            label="Nombre de la Tarifa"
            required
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: Promo Golden Business"
          />

          <FormSelect
            label="Clase de Cabina"
            required
            value={form.clase}
            onChange={(e) => setForm((f) => ({ ...f, clase: e.target.value as ClaseTarifa }))}
            options={Object.values(ClaseTarifa).map((c) => ({
              value: c,
              label: c.charAt(0).toUpperCase() + c.slice(1),
            }))}
          />

          <FormInput
            label="Descuento (%)"
            required
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={form.descuento}
            onChange={(e) => setForm((f) => ({ ...f, descuento: e.target.value }))}
            placeholder="Ej: 15"
          />

          <FormInput
            label="Descripción / Beneficios resumidos"
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            placeholder="Ej: Incluye selección de asientos y tasas preferenciales"
          />

          <div className="mt-4 flex justify-end gap-3 border-t border-white/10 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear tarifa'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
