import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Aeronave } from '../../../domain/entities/Aeronave';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { FormInput } from '../../components/FormInput';
import { PageHero } from '../../components/PageHero';
import { AVIATION_IMAGES, fallbackDeImagen } from '../../utils/aviationImages';
import { getErrorMessage } from '../../utils/formatters';

interface AeronaveForm {
  matricula: string;
  modelo: string;
  capacidad: string;
}

const FORM_VACIO: AeronaveForm = { matricula: '', modelo: '', capacidad: '' };

export function AeronavesPage() {
  const isStaff = useAuthStore((state) => state.isStaff);

  const [aeronaves, setAeronaves] = useState<Aeronave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Aeronave | null>(null);
  const [form, setForm] = useState<AeronaveForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAeronaves(await useCaseFactory.aeronaves.getAll());
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar las aeronaves'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(aeronave: Aeronave) {
    setEditando(aeronave);
    setForm({
      matricula: aeronave.matricula,
      modelo: aeronave.modelo,
      capacidad: String(aeronave.capacidad),
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const capacidad = Number(form.capacidad);
    if (!form.matricula.trim() || !form.modelo.trim() || !capacidad || capacidad <= 0) {
      setFormError('Matrícula, modelo y una capacidad válida son obligatorios');
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        matricula: form.matricula.trim().toUpperCase(),
        modelo: form.modelo.trim(),
        capacidad,
      };
      if (editando) {
        await useCaseFactory.aeronaves.update(editando.id, input);
      } else {
        await useCaseFactory.aeronaves.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (e) {
      setFormError(getErrorMessage(e, 'No se pudo guardar la aeronave'));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(aeronave: Aeronave) {
    if (!window.confirm(`¿Eliminar la aeronave ${aeronave.matricula}?`)) return;
    try {
      await useCaseFactory.aeronaves.remove(aeronave.id);
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar la aeronave'));
    }
  }

  const columnas: Column<Aeronave>[] = [
    {
      header: 'Matrícula',
      render: (a) => <span className="font-mono font-bold">{a.matricula}</span>,
    },
    { header: 'Modelo', render: (a) => a.modelo },
    { header: 'Capacidad', render: (a) => `${a.capacidad} pasajeros` },
  ];

  return (
    <div className="space-y-6">
      <PageHero
        titulo="Flota de aeronaves"
        destacado="aeronaves"
        subtitulo="Administra matrículas, modelos y capacidad de la flota operativa"
        imagen={AVIATION_IMAGES.aeronaves}
        imagenFallback={fallbackDeImagen(AVIATION_IMAGES.aeronaves)}
        accion={isStaff ? <Button onClick={abrirCrear}>+ Nueva aeronave</Button> : undefined}
        compacto
      />

      {error && (
        <p className="mt-6 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light">
          {error}
        </p>
      )}

      <div className="animate-fade-in">
        <DataTable
          columns={columnas}
          data={aeronaves}
          getRowId={(a) => a.id}
          loading={loading}
          emptyMessage="No hay aeronaves registradas"
          actions={
            isStaff
              ? (aeronave) => (
                  <>
                    <Button variant="secondary" onClick={() => abrirEditar(aeronave)}>
                      Editar
                    </Button>
                    <Button variant="danger" onClick={() => eliminar(aeronave)}>
                      Eliminar
                    </Button>
                  </>
                )
              : undefined
          }
        />
      </div>

      <Modal
        open={modalAbierto}
        title={editando ? `Editar ${editando.matricula}` : 'Nueva aeronave'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormInput
            label="Matrícula"
            value={form.matricula}
            onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))}
            placeholder="Ej: HK-1234"
          />
          <FormInput
            label="Modelo"
            value={form.modelo}
            onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
            placeholder="Ej: Airbus A320"
          />
          <FormInput
            label="Capacidad"
            type="number"
            min={1}
            value={form.capacidad}
            onChange={(e) => setForm((f) => ({ ...f, capacidad: e.target.value }))}
            placeholder="Ej: 180"
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
              {editando ? 'Guardar cambios' : 'Crear aeronave'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
