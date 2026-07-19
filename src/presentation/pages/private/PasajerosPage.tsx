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
    <div className="space-y-8">
      {/* Banner / Cabecera Premium estilo Aerolínea */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-dark-surface via-dark-surface to-primary/10 border border-dark-border p-6 sm:p-8 shadow-xl">
        {/* Luces de fondo difuminadas */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-6 w-6 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="text-xs font-bold tracking-widest text-primary-light uppercase">Servicios de Pasajeros</span>
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl text-white">
              Perfiles de <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">Viajeros</span>
            </h1>
            <p className="mt-2 text-sm text-gray-400 max-w-xl">
              {isStaff 
                ? "Panel de administración global para gestionar los perfiles de todos los pasajeros en la plataforma." 
                : "Agrega y administra los perfiles de viaje de tus acompañantes y tu propia información para agilizar la compra de boletos y el check-in."}
            </p>
          </div>
          <div>
            <Button 
              onClick={abrirCrear}
              className="w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-primary/45 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Registrar Viajero
              </span>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light animate-fade-in">
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
