import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MetodoPago } from '../../../domain/entities/MetodoPago';
import { TipoMetodoPago } from '../../../domain/enums/TipoMetodoPago';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { getErrorMessage } from '../../utils/formatters';

export function MetodosPagoPage() {
  const { isStaff } = useAuthStore();

  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');

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
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
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
            <p className="mt-2 text-xs text-gray-400 max-w-xl leading-relaxed">
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
                  <Button size="small">
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
                            <button className="text-gray-400 hover:text-white transition-all text-xs font-semibold px-2 py-1">
                              Editar
                            </button>
                            <button className="text-primary-light hover:text-primary transition-all text-xs font-semibold px-2 py-1">
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
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white tracking-wide">Medios de Pago Habilitados</h2>
              <div className="py-8 text-center text-xs text-gray-500 bg-white/5 border border-white/10 rounded-3xl">
                Cargando pasarelas financieras...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
