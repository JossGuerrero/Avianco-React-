import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Pasajero } from '../../../domain/entities/Pasajero';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { FormInput } from '../../components/FormInput';
import { PaisSelect } from '../../components/PaisSelect';
import { PageHero } from '../../components/PageHero';
import { AVIATION_IMAGES, fallbackDeImagen } from '../../utils/aviationImages';
import { formatFechaCorta, getErrorMessage } from '../../utils/formatters';

interface PasajeroForm {
  usuario: string;
  numero_pasaporte: string;
  nacionalidad: string;
  fecha_nacimiento: string;
  telefono: string;
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
    });
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(pasajero: Pasajero) {
    setEditando(pasajero);
    setForm({
      usuario: String(pasajero.usuario),
      numero_pasaporte: pasajero.numero_pasaporte,
      nacionalidad: pasajero.nacionalidad,
      fecha_nacimiento: pasajero.fecha_nacimiento,
      telefono: pasajero.telefono,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.numero_pasaporte.trim() || !form.nacionalidad || !form.fecha_nacimiento) {
      setFormError('Pasaporte, nacionalidad y fecha de nacimiento son obligatorios');
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
      };
      if (editando) {
        await useCaseFactory.pasajeros.update(editando.id, input);
      } else {
        await useCaseFactory.pasajeros.create(input);
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
    { header: 'Nombre', render: (p) => p.nombre_completo || '—' },
    { header: 'Pasaporte', render: (p) => <span className="font-mono">{p.numero_pasaporte}</span> },
    { header: 'Nacionalidad', render: (p) => p.nacionalidad },
    { header: 'Nacimiento', render: (p) => formatFechaCorta(p.fecha_nacimiento) },
    { header: 'Teléfono', render: (p) => p.telefono || '—' },
  ];

  return (
    <div className="space-y-6">
      <PageHero
        titulo="Pasajeros"
        destacado="Pasajeros"
        subtitulo="Registro de perfiles, pasaportes, nacionalidad y datos de contacto"
        imagen={AVIATION_IMAGES.pasajeros}
        imagenFallback={fallbackDeImagen(AVIATION_IMAGES.pasajeros)}
        accion={
          <div className="flex flex-wrap items-center gap-3">
            {visibles.length > 0 && (
              <span className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                {isStaff ? paginacion.count : visibles.length} pasajeros
              </span>
            )}
            <Button onClick={abrirCrear}>+ Nuevo pasajero</Button>
          </div>
        }
        compacto
      />

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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((pasajero) => (
              <div 
                key={pasajero.id} 
                className="relative overflow-hidden rounded-3xl border border-dark-border bg-gradient-to-br from-dark-surface to-dark p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/55 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Decoración superior derecha estilo chip */}
                <div className="absolute right-6 top-6 flex h-8 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <svg className="h-4 w-4 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2.945M18 5.5a2.5 2.5 0 012.5 2.5v.5a2.5 2.5 0 01-2.5 2.5h-1.5a2.5 2.5 0 00-2.5 2.5v1.5a2.5 2.5 0 01-2.5 2.5H13" />
                  </svg>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest text-primary-light uppercase">Pasaporte de Viajero</span>
                    <h3 className="text-xl font-bold text-white mt-0.5 truncate">{pasajero.nombre_completo || 'Sin nombre asignado'}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs border-t border-dark-border/60 pt-4">
                    <div>
                      <p className="text-gray-500 font-medium">Nro. Pasaporte</p>
                      <p className="font-mono text-white mt-0.5 font-bold tracking-wider">{pasajero.numero_pasaporte}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Nacionalidad</p>
                      <p className="text-white mt-0.5 font-semibold">{pasajero.nacionalidad}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Nacimiento</p>
                      <p className="text-white mt-0.5 font-semibold">{formatFechaCorta(pasajero.fecha_nacimiento)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Teléfono</p>
                      <p className="text-white mt-0.5 font-semibold truncate">{pasajero.telefono || '—'}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-dark-border/60 pt-4 mt-2">
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
