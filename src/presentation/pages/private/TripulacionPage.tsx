import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Tripulante } from '../../../domain/entities/Tripulante';
import { RolTripulacion } from '../../../domain/enums/RolTripulacion';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { PageHero } from '../../components/PageHero';
import { StatCard } from '../../components/StatCard';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { AVIATION_IMAGES, fallbackDeImagen } from '../../utils/aviationImages';
import { getErrorMessage } from '../../utils/formatters';

interface TripulanteForm {
  nombre: string;
  apellido: string;
  rol: RolTripulacion;
  licencia: string;
  activo: boolean;
}

const FORM_VACIO: TripulanteForm = {
  nombre: '',
  apellido: '',
  rol: RolTripulacion.Piloto,
  licencia: '',
  activo: true,
};

const ROL_COLORES: Record<RolTripulacion, string> = {
  [RolTripulacion.Piloto]: 'from-blue-600/20 to-blue-900/10 border-blue-500/30',
  [RolTripulacion.Copiloto]: 'from-indigo-600/20 to-indigo-900/10 border-indigo-500/30',
  [RolTripulacion.Azafata]: 'from-pink-600/20 to-pink-900/10 border-pink-500/30',
  [RolTripulacion.Tecnico]: 'from-amber-600/20 to-amber-900/10 border-amber-500/30',
};

export function TripulacionPage() {
  const [tripulantes, setTripulantes] = useState<Tripulante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Tripulante | null>(null);
  const [form, setForm] = useState<TripulanteForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTripulantes(await useCaseFactory.tripulacion.getAll());
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo cargar la tripulación'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const stats = useMemo(() => {
    const activos = tripulantes.filter((t) => t.activo).length;
    const porRol = Object.values(RolTripulacion).map((rol) => ({
      rol,
      count: tripulantes.filter((t) => t.rol === rol).length,
    }));
    return { total: tripulantes.length, activos, porRol };
  }, [tripulantes]);

  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(tripulante: Tripulante) {
    setEditando(tripulante);
    setForm({
      nombre: tripulante.nombre,
      apellido: tripulante.apellido,
      rol: tripulante.rol,
      licencia: tripulante.licencia,
      activo: tripulante.activo,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.nombre.trim() || !form.apellido.trim() || !form.licencia.trim()) {
      setFormError('Nombre, apellido y licencia son obligatorios');
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        rol: form.rol,
        licencia: form.licencia.trim(),
        activo: form.activo,
      };
      if (editando) {
        await useCaseFactory.tripulacion.update(editando.id, input);
      } else {
        await useCaseFactory.tripulacion.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (e) {
      setFormError(getErrorMessage(e, 'No se pudo guardar el tripulante'));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(tripulante: Tripulante) {
    if (!window.confirm(`¿Eliminar a ${tripulante.nombre} ${tripulante.apellido}?`)) return;
    try {
      await useCaseFactory.tripulacion.remove(tripulante.id);
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar el tripulante'));
    }
  }

  const columnas: Column<Tripulante>[] = [
    {
      header: 'Tripulante',
      render: (t) => (
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-gradient-to-br text-xs font-bold capitalize text-white ${ROL_COLORES[t.rol]}`}
          >
            {t.nombre[0]}
            {t.apellido[0]}
          </div>
          <span className="font-semibold">
            {t.nombre} {t.apellido}
          </span>
        </div>
      ),
    },
    { header: 'Rol', render: (t) => <span className="capitalize font-medium text-gray-300">{t.rol}</span> },
    { header: 'Licencia', render: (t) => <span className="font-mono text-primary-light">{t.licencia}</span> },
    { header: 'Estado', render: (t) => <Badge estado={t.activo ? 'activo' : 'inactivo'} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHero
        titulo="Gestión de tripulación"
        destacado="tripulación"
        subtitulo="Administra el personal de vuelo: pilotos, copilotos, azafatas y técnicos"
        imagen={AVIATION_IMAGES.tripulacion}
        imagenFallback={fallbackDeImagen(AVIATION_IMAGES.tripulacion)}
        accion={<Button onClick={abrirCrear}>+ Nuevo tripulante</Button>}
        compacto
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          etiqueta="Total tripulantes"
          valor={stats.total}
          cargando={loading}
          icono={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          etiqueta="Activos"
          valor={stats.activos}
          cargando={loading}
          icono={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          tendencia={`${stats.total - stats.activos} inactivos`}
        />
        {stats.porRol.slice(0, 2).map(({ rol, count }) => (
          <StatCard
            key={rol}
            etiqueta={rol.charAt(0).toUpperCase() + rol.slice(1) + 's'}
            valor={count}
            cargando={loading}
            icono={
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
            }
          />
        ))}
      </div>

      {error && (
        <p className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light">
          {error}
        </p>
      )}

      <DataTable
        columns={columnas}
        data={tripulantes}
        getRowId={(t) => t.id}
        loading={loading}
        emptyMessage="No hay tripulantes registrados"
        actions={(tripulante) => (
          <>
            <Button variant="secondary" onClick={() => abrirEditar(tripulante)}>
              Editar
            </Button>
            <Button variant="danger" onClick={() => eliminar(tripulante)}>
              Eliminar
            </Button>
          </>
        )}
      />

      <Modal
        open={modalAbierto}
        title={editando ? `Editar tripulante #${editando.id}` : 'Nuevo tripulante'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormInput
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
          <FormInput
            label="Apellido"
            value={form.apellido}
            onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
          />
          <FormSelect
            label="Rol"
            value={form.rol}
            onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value as RolTripulacion }))}
            options={Object.values(RolTripulacion).map((rol) => ({ value: rol, label: rol }))}
          />
          <FormInput
            label="Licencia"
            value={form.licencia}
            onChange={(e) => setForm((f) => ({ ...f, licencia: e.target.value }))}
            placeholder="Ej: LIC-00123"
          />
          <label className="flex items-center gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            Activo
          </label>

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
              {editando ? 'Guardar cambios' : 'Crear tripulante'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
