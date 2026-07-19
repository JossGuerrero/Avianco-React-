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
        <p className="mt-6 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light">
          {error}
        </p>
      )}

      <div className="mt-6">
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
            count: isStaff ? paginacion.count : undefined,
            onPageChange: setPage,
          }}
          actions={(pasajero) => (
            <>
              <Button variant="secondary" onClick={() => abrirEditar(pasajero)}>
                Editar
              </Button>
              {isStaff && (
                <Button variant="danger" onClick={() => eliminar(pasajero)}>
                  Eliminar
                </Button>
              )}
            </>
          )}
        />
      </div>

      <Modal
        open={modalAbierto}
        title={editando ? `Editar pasajero #${editando.id}` : 'Nuevo pasajero'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isStaff && (
            <FormInput
              label="ID de usuario"
              type="number"
              value={form.usuario}
              onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
              placeholder="ID del usuario vinculado"
            />
          )}
          <FormInput
            label="Número de pasaporte"
            value={form.numero_pasaporte}
            onChange={(e) => setForm((f) => ({ ...f, numero_pasaporte: e.target.value }))}
            placeholder="Ej: AB123456"
          />
          <PaisSelect
            label="Nacionalidad"
            value={form.nacionalidad}
            onChange={(nombre) => setForm((f) => ({ ...f, nacionalidad: nombre }))}
          />
          <FormInput
            label="Fecha de nacimiento"
            type="date"
            value={form.fecha_nacimiento}
            onChange={(e) => setForm((f) => ({ ...f, fecha_nacimiento: e.target.value }))}
          />
          <FormInput
            label="Teléfono"
            type="tel"
            value={form.telefono}
            onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            placeholder="Ej: +57 300 123 4567"
          />

          {formError && (
            <p className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary-light">
              {formError}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={guardando}>
              {editando ? 'Guardar cambios' : 'Crear pasajero'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
