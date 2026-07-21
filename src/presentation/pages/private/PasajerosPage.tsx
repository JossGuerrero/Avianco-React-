import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { FormInput } from '../../components/FormInput';
import { PaisSelect } from '../../components/PaisSelect';
import { formatFechaCorta, getErrorMessage } from '../../utils/formatters';

interface PasajeroForm {
  usuario: string;
  numero_pasaporte: string;
  nacionalidad: string;
  fecha_nacimiento: string;
  telefono: string;
  nombre_completo: string;
}

export function PasajerosPage() {
  const { user, isStaff } = useAuthStore();

  const [pasajeros, setPasajeros] = useState<Pasajero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [paginacion, setPaginacion] = useState({ hasNext: false, hasPrevious: false, count: 0 });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Pasajero | null>(null);
  const [form, setForm] = useState<PasajeroForm>({
    usuario: '',
    numero_pasaporte: '',
    nacionalidad: '',
    fecha_nacimiento: '',
    telefono: '',
    nombre_completo: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await useCaseFactory.pasajeros.getPage({ page });
      setPasajeros(resultado.items);
      setPaginacion({
        hasNext: resultado.hasNext,
        hasPrevious: resultado.hasPrevious,
        count: resultado.count,
      });
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los pasajeros'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(
    () => (isStaff ? pasajeros : pasajeros.filter((p) => p.usuario === user?.id)),
    [pasajeros, isStaff, user],
  );

  function abrirCrear() {
    setEditando(null);
    setForm({
      usuario: String(user?.id ?? ''),
      numero_pasaporte: '',
      nacionalidad: '',
      fecha_nacimiento: '',
      telefono: '',
      nombre_completo: '',
    });
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(pasajero: Pasajero) {
    setEditando(pasajero);
    const nombreGuardado = localStorage.getItem(`pasajero_nombre_${pasajero.id}`) || pasajero.nombre_completo || '';
    setForm({
      usuario: String(pasajero.usuario),
      numero_pasaporte: pasajero.numero_pasaporte,
      nacionalidad: pasajero.nacionalidad,
      fecha_nacimiento: pasajero.fecha_nacimiento,
      telefono: pasajero.telefono,
      nombre_completo: nombreGuardado,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const passportClean = form.numero_pasaporte.trim();
    if (!passportClean || !form.nacionalidad || !form.fecha_nacimiento || !form.nombre_completo.trim()) {
      setFormError('Nombre, pasaporte, nacionalidad y fecha de nacimiento son obligatorios');
      return;
    }
    // Validar formato del pasaporte: alfanumérico de 6 a 15 caracteres
    const pasaporteRegex = /^[A-Z0-9]{6,15}$/i;
    if (!pasaporteRegex.test(passportClean)) {
      setFormError('El número de pasaporte debe ser alfanumérico y tener entre 6 y 15 caracteres');
      return;
    }
    // Validar teléfono (opcional pero de formato válido)
    if (form.telefono.trim()) {
      const telRegex = /^\+?[0-9\s\-]{7,20}$/;
      if (!telRegex.test(form.telefono.trim())) {
        setFormError('El número de teléfono ingresado no tiene un formato válido');
        return;
      }
    }
    // Validar que la fecha de nacimiento no sea futura
    if (new Date(form.fecha_nacimiento) > new Date()) {
      setFormError('La fecha de nacimiento no puede ser en el futuro');
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        usuario: Number(form.usuario) || user?.id || 0,
        numero_pasaporte: form.numero_pasaporte.trim(),
        nacionalidad: form.nacionalidad,
        fecha_nacimiento: form.fecha_nacimiento,
        telefono: form.telefono.trim(),
        nombre_completo: form.nombre_completo.trim(),
      };
      let guardado;
      if (editando) {
        guardado = await useCaseFactory.pasajeros.update(editando.id, input);
      } else {
        guardado = await useCaseFactory.pasajeros.create(input);
      }
      if (guardado && guardado.id) {
        localStorage.setItem(`pasajero_nombre_${guardado.id}`, input.nombre_completo);
      }
      setModalAbierto(false);
      await cargar();
    } catch (e) {
      setFormError(getErrorMessage(e, 'No se pudo guardar el pasajero'));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(pasajero: Pasajero) {
    if (!window.confirm(`¿Eliminar al pasajero #${pasajero.id}?`)) return;
    try {
      await useCaseFactory.pasajeros.remove(pasajero.id);
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar el pasajero'));
    }
  }

  const columnas: Column<Pasajero>[] = [
    { header: 'ID', render: (p) => <span className="text-gray-400">#{p.id}</span> },
    { header: 'Nombre', render: (p) => localStorage.getItem(`pasajero_nombre_${p.id}`) || p.nombre_completo || `Pasajero ${p.numero_pasaporte}` },
    { header: 'Pasaporte', render: (p) => <span className="font-mono">{p.numero_pasaporte}</span> },
    { header: 'Nacionalidad', render: (p) => p.nacionalidad },
    { header: 'Nacimiento', render: (p) => formatFechaCorta(p.fecha_nacimiento) },
    { header: 'Teléfono', render: (p) => p.telefono || '—' },
  ];

  return (
    <div className="relative min-h-[600px] max-w-6xl mx-auto space-y-8 px-4 sm:px-6 py-2">
      {/* Fondo de pantalla de vuelo difuminado con degradado radial premium */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 blur-[100px] scale-115 pointer-events-none -z-10"
        style={{ backgroundImage: "url('/scenic_flight.png')" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.06)_0%,transparent_70%)] pointer-events-none -z-10" />

      {/* Banner de Bienvenida con Imagen de Fondo Completa (Full-Bleed) */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl h-80 sm:h-64 flex items-center">
        {/* Foto de fondo completa */}
        <div className="absolute inset-0 z-0 opacity-25 pointer-events-none blur-[1px]">
          <img 
            src="/passengers_banner_1784573165040.png" 
            alt="Background Banner" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent" />
        </div>
        
        {/* Contenido del Banner */}
        <div className="relative z-10 p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-6">
          <div className="space-y-2.5 max-w-xl text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary-light">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Servicio de Pasajeros
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Perfiles de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Viajeros</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              {isStaff 
                ? "Gestión administrativa de los perfiles de todos los viajeros registrados en el sistema de vuelos Avianco." 
                : "Registra a tus acompañantes, familiares o tu información personal de viaje para autocompletar la compra de boletos y realizar check-ins en segundos."}
            </p>
          </div>
          <div className="shrink-0 z-10 w-full sm:w-auto">
            <Button 
              onClick={abrirCrear}
              className="w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all duration-300 py-3 px-6 text-sm font-bold bg-primary hover:bg-primary-dark"
            >
              + Registrar Viajero
            </Button>
          </div>
        </div>
      </div>

      {/* Tarjeta de Asistente de Vuelo de Bienvenida (Efecto Espejo / Glassmorphism) */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-[#3d0b13]/40 backdrop-blur-md p-4 shadow-lg flex items-center gap-4 animate-fade-in">
        <div className="relative shrink-0 h-12 w-12 rounded-full overflow-hidden border border-primary/30 shadow-inner">
          <img src="/flight_attendant.png" alt="Asistente de Vuelo" className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-xs font-semibold text-primary-light uppercase tracking-wider">Asistente de Vuelo Avianco</p>
          <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
            "Recuerda ingresar tu número de pasaporte exactamente como aparece en tu libreta oficial para evitar demoras en las puertas de abordaje de tu próximo vuelo."
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light animate-fade-in">
          {error}
        </p>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-3xl border border-dark-border bg-dark-surface p-6 h-52" />
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-dark-border bg-dark-surface/50 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="mt-4 text-lg font-bold text-white">No hay viajeros registrados</h3>
            <p className="mt-1 text-sm text-gray-400">Registra un viajero para comenzar a reservar tus vuelos.</p>
            <Button onClick={abrirCrear} className="mt-4">Registrar primer viajero</Button>
          </div>
        ) : !isStaff ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibles.map((pasajero) => (
              <div 
                key={pasajero.id} 
                className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-black/85 to-[#0b2b3d]/15 backdrop-blur-md p-6 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-[0_8px_35px_rgba(59,130,246,0.15)] animate-scale-in"
              >
                {/* Decoración superior derecha estilo chip */}
                <div className="absolute right-6 top-6 flex h-8 w-12 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <svg className="h-4.5 w-4.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2.945M18 5.5a2.5 2.5 0 012.5 2.5v.5a2.5 2.5 0 01-2.5 2.5h-1.5a2.5 2.5 0 00-2.5 2.5v1.5a2.5 2.5 0 01-2.5 2.5H13" />
                  </svg>
                </div>

                {/* Silueta de Avión decorativa de fondo (Estilo Marca de Agua de Pasaporte) */}
                <div className="absolute -bottom-6 -right-6 opacity-[0.03] text-blue-400 pointer-events-none transform -rotate-12">
                  <svg className="h-32 w-32" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z"/>
                  </svg>
                </div>

                <div className="space-y-4">
                  <div className="text-left">
                    <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">Pasaporte de Viajero</span>
                    <h3 className="text-lg font-black text-white mt-0.5 truncate">
                      {localStorage.getItem(`pasajero_nombre_${pasajero.id}`) || pasajero.nombre_completo || `Pasajero ${pasajero.numero_pasaporte}`}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-xs border-t border-white/5 pt-4 text-left">
                    <div>
                      <p className="text-gray-500 font-bold tracking-wider uppercase text-[9px] font-mono">Nro. Pasaporte</p>
                      <p className="font-mono text-white mt-0.5 font-bold tracking-wider">{pasajero.numero_pasaporte}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-bold tracking-wider uppercase text-[9px] font-mono">Nacionalidad</p>
                      <p className="text-white mt-0.5 font-semibold">{pasajero.nacionalidad}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-bold tracking-wider uppercase text-[9px] font-mono">Nacimiento</p>
                      <p className="text-white mt-0.5 font-semibold">{formatFechaCorta(pasajero.fecha_nacimiento)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-bold tracking-wider uppercase text-[9px] font-mono">Teléfono</p>
                      <p className="text-white mt-0.5 font-semibold truncate">{pasajero.telefono || '—'}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-white/5 pt-4 mt-2">
                    <Button 
                      variant="secondary" 
                      onClick={() => abrirEditar(pasajero)}
                      className="w-full text-xs py-1.5 h-auto flex items-center justify-center gap-1.5"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Editar Perfil
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DataTable
            columns={columnas}
            data={visibles}
            getRowId={(p) => p.id}
            loading={loading}
            emptyMessage="No hay pasajeros registrados"
            pagination={{
              page,
              hasNext: paginacion.hasNext,
              hasPrevious: paginacion.hasPrevious,
              count: paginacion.count,
              onPageChange: setPage,
            }}
            actions={(pasajero) => (
              <>
                <Button variant="secondary" onClick={() => abrirEditar(pasajero)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => eliminar(pasajero)}>
                  Eliminar
                </Button>
              </>
            )}
          />
        )}
      </div>

      <Modal
        open={modalAbierto}
        title={editando ? `Editar pasajero #${editando.id}` : 'Nuevo pasajero'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {isStaff && (
            <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-3">
              <p className="text-xs font-semibold text-yellow-400 mb-1.5">Modo Administrador: Vinculación de Usuario</p>
              <FormInput
                label="ID de usuario propietario"
                type="number"
                value={form.usuario}
                onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
                placeholder="Ej: 42"
              />
            </div>
          )}

          <FormInput
            label="Nombre completo del pasajero"
            required
            value={form.nombre_completo}
            onChange={(e) => setForm((f) => ({ ...f, nombre_completo: e.target.value }))}
            placeholder="Ej: Juan Pérez"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FormInput
                label="Número de pasaporte"
                value={form.numero_pasaporte}
                onChange={(e) => setForm((f) => ({ ...f, numero_pasaporte: e.target.value }))}
                placeholder="Ej: AB123456"
              />
              <span className="mt-1.5 text-[10px] text-gray-500 block">Debe coincidir exactamente con el documento oficial</span>
            </div>
            <div>
              <PaisSelect
                label="Nacionalidad"
                value={form.nacionalidad}
                onChange={(nombre) => setForm((f) => ({ ...f, nacionalidad: nombre }))}
              />
              <span className="mt-1.5 text-[10px] text-gray-500 block">País emisor del documento</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Fecha de nacimiento"
              type="date"
              value={form.fecha_nacimiento}
              onChange={(e) => setForm((f) => ({ ...f, fecha_nacimiento: e.target.value }))}
            />
            <FormInput
              label="Teléfono de contacto"
              type="tel"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              placeholder="Ej: +57 300 123 4567"
            />
          </div>

          {formError && (
            <p className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs text-primary-light animate-fade-in">
              {formError}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-dark-border pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={guardando} className="shadow-lg shadow-primary/20 hover:shadow-primary/30">
              {editando ? 'Guardar cambios' : 'Crear perfil'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
