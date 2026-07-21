import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Aeropuerto } from '../../../domain/entities/Aeropuerto';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { getErrorMessage } from '../../utils/formatters';
import { PageHero } from '../../components/PageHero';
import { AVIATION_IMAGES, fallbackDeImagen } from '../../utils/aviationImages';
import { PAISES } from '../../utils/paises';

interface AeropuertoForm {
  codigo_iata: string;
  nombre: string;
  ciudad: string;
  pais: string;
}

const FORM_VACIO: AeropuertoForm = { codigo_iata: '', nombre: '', ciudad: '', pais: '' };

export function AeropuertosPage() {
  const isStaff = useAuthStore((state) => state.isStaff);

  const [aeropuertos, setAeropuertos] = useState<Aeropuerto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Aeropuerto | null>(null);
  const [form, setForm] = useState<AeropuertoForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAeropuertos(await useCaseFactory.aeropuertos.getAll());
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los aeropuertos'));
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

  function abrirEditar(aeropuerto: Aeropuerto) {
    setEditando(aeropuerto);
    setForm({
      codigo_iata: aeropuerto.codigo_iata,
      nombre: aeropuerto.nombre,
      ciudad: aeropuerto.ciudad,
      pais: aeropuerto.pais,
    });
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.codigo_iata.trim() || !form.nombre.trim() || !form.ciudad.trim() || !form.pais) {
      setFormError('Todos los campos son obligatorios');
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      const input = {
        codigo_iata: form.codigo_iata.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        ciudad: form.ciudad.trim(),
        pais: form.pais,
      };
      if (editando) {
        await useCaseFactory.aeropuertos.update(editando.id, input);
      } else {
        await useCaseFactory.aeropuertos.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (e) {
      setFormError(getErrorMessage(e, 'No se pudo guardar el aeropuerto'));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(aeropuerto: Aeropuerto) {
    if (!window.confirm(`¿Eliminar el aeropuerto ${aeropuerto.codigo_iata}?`)) return;
    try {
      await useCaseFactory.aeropuertos.remove(aeropuerto.id);
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar el aeropuerto'));
    }
  }

  const columnas: Column<Aeropuerto>[] = [
    {
      header: 'IATA',
      render: (a) => (
        <span className="rounded bg-primary/15 px-2 py-0.5 font-mono font-bold text-primary-light">
          {a.codigo_iata}
        </span>
      ),
    },
    { header: 'Nombre', render: (a) => a.nombre },
    { header: 'Ciudad', render: (a) => a.ciudad },
    { header: 'País', render: (a) => a.pais },
  ];

  return (
    <div className="space-y-6">
      <PageHero
        titulo="Inventario de aeropuertos"
        destacado="aeropuertos"
        subtitulo="Gestiona la red de aeropuertos: códigos IATA, ciudades y países de operación"
        imagen={AVIATION_IMAGES.aeropuertos}
        imagenFallback={fallbackDeImagen(AVIATION_IMAGES.aeropuertos)}
        accion={isStaff ? <Button onClick={abrirCrear}>+ Nuevo aeropuerto</Button> : undefined}
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
          data={aeropuertos}
          getRowId={(a) => a.id}
          loading={loading}
          emptyMessage="No hay aeropuertos registrados"
          actions={
            isStaff
              ? (aeropuerto) => (
                  <>
                    <Button variant="secondary" onClick={() => abrirEditar(aeropuerto)}>
                      Editar
                    </Button>
                    <Button variant="danger" onClick={() => eliminar(aeropuerto)}>
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
        title={editando ? `Editar ${editando.codigo_iata}` : 'Nuevo aeropuerto'}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormInput
            label="Código IATA"
            value={form.codigo_iata}
            onChange={(e) => setForm((f) => ({ ...f, codigo_iata: e.target.value }))}
            placeholder="Ej: BOG"
            maxLength={3}
          />
          <FormInput
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: El Dorado"
          />
          <FormInput
            label="Ciudad"
            value={form.ciudad}
            onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
            placeholder="Ej: Bogotá"
          />
          <FormSelect
            label="País"
            value={form.pais}
            onChange={(e) => setForm((f) => ({ ...f, pais: e.target.value }))}
            placeholder="Selecciona un país"
            options={PAISES.map((pais) => ({ value: pais, label: pais }))}
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
              {editando ? 'Guardar cambios' : 'Crear aeropuerto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
