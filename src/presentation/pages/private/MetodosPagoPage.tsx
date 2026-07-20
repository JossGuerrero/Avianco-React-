import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { MetodoPago } from '../../../domain/entities/MetodoPago';
import { TipoMetodoPago } from '../../../domain/enums/TipoMetodoPago';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { getErrorMessage } from '../../utils/formatters';

interface MetodoPagoForm {
  nombre: string;
  tipo: TipoMetodoPago;
  activo: boolean;
}

const FORM_VACIO: MetodoPagoForm = {
  nombre: '',
  tipo: TipoMetodoPago.Tarjeta,
  activo: true,
};

export function MetodosPagoPage() {
  const { isStaff } = useAuthStore();

  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');

  // Estados para CRUD de Staff
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<MetodoPago | null>(null);
  const [form, setForm] = useState<MetodoPagoForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMetodos(await useCaseFactory.metodosPago.getAll());
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los métodos de pago'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Filtrado por buscador
  const filtrados = useMemo(() => {
    return metodos.filter((m) => {
      return (
        m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.tipo.toLowerCase().includes(busqueda.toLowerCase())
      );
    });
  }, [metodos, busqueda]);

  // Lógica CRUD de Staff
  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(metodo: MetodoPago) {
    setEditando(metodo);
    setForm({
      nombre: metodo.nombre,
      tipo: metodo.tipo,
      activo: metodo.activo,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleEliminar(metodo: MetodoPago) {
    if (!window.confirm(`¿Eliminar el método de pago "${metodo.nombre}"?`)) return;
    try {
      await useCaseFactory.metodosPago.remove(metodo.id);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el método de pago'));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.nombre.trim()) {
      setFormError('El nombre del método de pago es obligatorio');
      return;
    }

    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        activo: form.activo,
      };

      if (editando) {
        await useCaseFactory.metodosPago.update(editando.id, input);
      } else {
        await useCaseFactory.metodosPago.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo registrar el método de pago'));
    } finally {
      setGuardando(false);
    }
  }

  // Estadísticas del panel
  const stats = useMemo(() => {
    const totalCount = metodos.length;
    const activos = metodos.filter((m) => m.activo).length;
    const inactivos = metodos.filter((m) => !m.activo).length;
    const tarjetas = metodos.filter((m) => m.tipo === TipoMetodoPago.Tarjeta).length;
    const digitales = metodos.filter(
      (m) => m.tipo === TipoMetodoPago.Paypal || m.tipo === TipoMetodoPago.Transferencia
    ).length;

    return {
      totalCount,
      activos,
      inactivos,
      tarjetas,
      digitales,
    };
  }, [metodos]);

  return (
    <div className="relative space-y-8 animate-fade-in pb-12 text-left">
      {/* Luces de Fondo Glassmorphic */}
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera Principal */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        {/* Imagen de Fondo Completa con Difuminado */}
        <div className="absolute inset-0 z-0 opacity-25 pointer-events-none blur-[1px]">
          <img 
            src="/payment_banner_1784571142564.png" 
            alt="Background Banner" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#121212]/90 to-transparent" />
        </div>

        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4 max-w-xl text-left">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-primary-light uppercase">Pasarela de Pagos</span>
            </div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl text-white tracking-tight">
              Canales de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Pago</span>
            </h1>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              {isStaff 
                ? 'Administra los canales de procesamiento activos, habilita nuevos métodos bancarios y controla el estado operativo.'
                : 'Conoce los medios de pago disponibles y canales habilitados para procesar tus reservas y equipajes de forma segura.'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary-light text-xs backdrop-blur-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-white/5 bg-white/5 h-28" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tarjetas de Estadísticas (Efecto Espejo) */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Canales Totales</span>
              <div className="mt-1.5 text-xl font-black text-white">{stats.totalCount}</div>
              <p className="mt-0.5 text-[10px] text-gray-400">Procesadores integrados</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Operativos</span>
              <div className="mt-1.5 text-xl font-black text-emerald-300 flex items-center gap-2">
                {stats.activos}
                {stats.activos > 0 && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />}
              </div>
              <p className="mt-0.5 text-[10px] text-emerald-400">Canales activos</p>
            </div>

            <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">Mantenimiento</span>
              <div className="mt-1.5 text-xl font-black text-yellow-300">{stats.inactivos}</div>
              <p className="mt-0.5 text-[10px] text-yellow-400">Temporalmente inactivos</p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/0 backdrop-blur-md p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Tarjetas Bancarias</span>
              <div className="mt-1.5 text-xl font-black text-blue-300">{stats.tarjetas}</div>
              <p className="mt-0.5 text-[10px] text-blue-400">Crédito y Débito</p>
            </div>
          </div>

          {/* Renderizado de Vistas */}
          {isStaff ? (
            /* ================= VISTA STAFF: LISTADO DE CONTROL ================= */
            <div className="border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-md rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Consola de Pasarela de Pago</h2>
                  <p className="text-xs text-gray-400">Habilita o suspende canales financieros de facturación.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, tipo..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full sm:w-64 bg-dark/70 border border-white/15 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-light transition-all"
                  />
                  <Button size="small" onClick={abrirCrear}>
                    + Nuevo Canal
                  </Button>
                </div>
              </div>

              {filtrados.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No se encontraron métodos de pago registrados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold">ID</th>
                        <th className="px-4 py-3 font-bold">Nombre</th>
                        <th className="px-4 py-3 font-bold">Tipo</th>
                        <th className="px-4 py-3 font-bold">Estado</th>
                        <th className="px-4 py-3 text-right font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((m) => (
                        <tr key={m.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all">
                          <td className="px-4 py-3 text-gray-500">#{m.id}</td>
                          <td className="px-4 py-3 font-semibold text-white">{m.nombre}</td>
                          <td className="px-4 py-3 text-stone-300 capitalize">{m.tipo}</td>
                          <td className="px-4 py-3">
                            <Badge estado={m.activo ? 'activo' : 'inactivo'} />
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              onClick={() => abrirEditar(m)}
                              className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleEliminar(m)}
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
            /* ================= VISTA CLIENTE: TARJETAS DE PAGO ================= */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-wide">Medios de Pago Habilitados</h2>
                <span className="text-xs text-gray-400">{filtrados.length} canales operativos</span>
              </div>

              {filtrados.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                  No hay medios de pago configurados en esta pasarela.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filtrados.map((m) => {
                    const config = {
                      tarjeta: {
                        cardBg: 'from-blue-600/20 via-blue-900/10 to-blue-950/5 border-blue-500/30',
                        glowColor: 'bg-blue-400/20 text-blue-300',
                        chip: true,
                        brand: 'Visa / Mastercard',
                        icon: (
                          <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        ),
                      },
                      paypal: {
                        cardBg: 'from-indigo-600/20 via-indigo-900/10 to-indigo-950/5 border-indigo-500/30',
                        glowColor: 'bg-indigo-400/20 text-indigo-300',
                        chip: false,
                        brand: 'Paypal Wallet',
                        icon: (
                          <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        ),
                      },
                      transferencia: {
                        cardBg: 'from-emerald-600/20 via-emerald-900/10 to-emerald-950/5 border-emerald-500/30',
                        glowColor: 'bg-emerald-400/20 text-emerald-300',
                        chip: false,
                        brand: 'PSE / Transferencia',
                        icon: (
                          <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        ),
                      },
                      efectivo: {
                        cardBg: 'from-amber-600/20 via-amber-900/10 to-amber-950/5 border-amber-500/30',
                        glowColor: 'bg-amber-400/20 text-amber-300',
                        chip: false,
                        brand: 'Puntos Físicos',
                        icon: (
                          <svg className="h-7 w-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        ),
                      },
                    }[m.tipo.toLowerCase()] || {
                      cardBg: 'from-white/5 to-white/0 border-white/10',
                      glowColor: 'bg-white/10 text-white',
                      chip: false,
                      brand: 'Procesador',
                      icon: (
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      ),
                    };

                    return (
                      <div key={m.id} className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br backdrop-blur-md shadow-2xl p-6 flex flex-col justify-between h-[210px] w-full animate-scale-in transition-all ${config.cardBg} ${!m.activo ? 'opacity-40 select-none pointer-events-none' : 'hover:border-white/20 hover:scale-[1.02]'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`relative flex h-2.5 w-2.5 ${m.activo ? '' : 'hidden'}`}>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            {!m.activo && <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />}
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                              {m.activo ? 'Canal Operativo' : 'Mantenimiento'}
                            </span>
                          </div>
                          {config.icon}
                        </div>

                        {config.chip && (
                          <div className="w-9 h-7 rounded-lg bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 border border-yellow-700/30 opacity-75 my-2 flex flex-col justify-between p-1.5 shadow-[inset_0_1px_4px_rgba(255,255,255,0.4)]">
                            <div className="border-b border-yellow-700/25 h-1/2 w-full" />
                            <div className="border-t border-yellow-700/25 h-1/2 w-full" />
                          </div>
                        )}

                        <div className="text-left mt-2">
                          <h3 className="text-base font-black text-white tracking-wide">{m.nombre}</h3>
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-mono mt-0.5">{config.brand}</span>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-3">
                          <span className="text-[9px] text-gray-500 font-mono">ID #{m.id}</span>
                          <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-md border ${m.activo ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-yellow-500/20 text-yellow-400 bg-yellow-500/5'}`}>
                            {m.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                        {!m.activo && (
                          <div className="absolute inset-0 bg-dark/20 backdrop-blur-[1px] flex items-center justify-center p-4">
                            <span className="bg-dark/95 border border-yellow-500/30 px-3.5 py-1.5 rounded-xl text-[10px] text-yellow-300 font-semibold shadow-2xl">
                              Temporalmente Fuera de Servicio
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de CRUD de Método de Pago (Staff) */}
      <Modal
        open={modalAbierto}
        title={editando ? `Editar canal: ${editando.nombre}` : 'Nuevo canal de pago'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {formError && (
            <p className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-xs text-primary-light">
              {formError}
            </p>
          )}

          <FormInput
            label="Nombre del Procesador"
            required
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: Visa Crédito Preferencial"
          />

          <FormSelect
            label="Tipo de Pago"
            required
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoMetodoPago }))}
            options={Object.values(TipoMetodoPago).map((t) => ({
              value: t,
              label: t.charAt(0).toUpperCase() + t.slice(1),
            }))}
          />

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="metodo-activo"
              checked={form.activo}
              onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              className="rounded border-white/10 bg-dark text-primary focus:ring-primary-light"
            />
            <label htmlFor="metodo-activo" className="text-xs text-stone-300 font-semibold select-none cursor-pointer">
              Canal de cobro habilitado (Activo)
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t border-white/10 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear canal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
