import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { CrudUseCases } from '../../application/use-cases/common/CrudUseCases';
import { DataTable, type Column } from './DataTable';
import { Modal } from './Modal';
import { Button } from './Button';
import { FormInput } from './FormInput';
import { FormSelect, type SelectOption } from './FormSelect';
import { PageHero } from './PageHero';
import { fallbackDeImagen } from '../utils/aviationImages';
import { getErrorMessage } from '../utils/formatters';

export type FormValues = Record<string, string | boolean>;

export interface CampoForm {
  name: string;
  label: string;
  tipo: 'text' | 'number' | 'date' | 'datetime-local' | 'url' | 'tel' | 'checkbox' | 'select';
  options?: SelectOption[];
  placeholder?: string;
  requerido?: boolean;
  step?: string;
  maxLength?: number;
  defaultValue?: string | boolean;
}

interface CrudPageProps<T extends { id: number }, TInput> {
  titulo: string;
  nombreEntidad: string; // singular, para botones y confirmaciones
  useCases: CrudUseCases<T, TInput>;
  columns: Column<T>[];
  campos: CampoForm[];
  aInput: (values: FormValues, editando: T | null) => TInput | string;
  puedeMutar: boolean;
  permitirEditar?: boolean;
  descripcion?: string;
  imagenHero?: string;
  destacado?: string;
  accionExtra?: ReactNode;
}

function crearFormVacio(campos: CampoForm[]): FormValues {
  const valores: FormValues = {};
  for (const campo of campos) {
    valores[campo.name] = campo.defaultValue ?? (campo.tipo === 'checkbox' ? true : '');
  }
  return valores;
}

function filaAForm<T>(fila: T, campos: CampoForm[]): FormValues {
  const registro = fila as unknown as Record<string, unknown>;
  const valores: FormValues = {};
  for (const campo of campos) {
    const valor = registro[campo.name];
    if (campo.tipo === 'checkbox') {
      valores[campo.name] = Boolean(valor);
    } else if (campo.tipo === 'datetime-local') {
      valores[campo.name] = valor == null ? '' : String(valor).slice(0, 16);
    } else {
      valores[campo.name] = valor == null ? '' : String(valor);
    }
  }
  return valores;
}

export function CrudPage<T extends { id: number }, TInput>({
  titulo,
  nombreEntidad,
  useCases,
  columns,
  campos,
  aInput,
  puedeMutar,
  permitirEditar = true,
  descripcion,
  imagenHero,
  destacado,
  accionExtra,
}: CrudPageProps<T, TInput>) {
  const [filas, setFilas] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<T | null>(null);
  const [valores, setValores] = useState<FormValues>({});
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFilas(await useCases.getAll());
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los datos'));
    } finally {
      setLoading(false);
    }
  }, [useCases]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function abrirCrear() {
    setEditando(null);
    setValores(crearFormVacio(campos));
    setFormError(null);
    setModalAbierto(true);
  }

  function abrirEditar(fila: T) {
    setEditando(fila);
    setValores(filaAForm(fila, campos));
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    for (const campo of campos) {
      if (campo.requerido && campo.tipo !== 'checkbox') {
        const valor = valores[campo.name];
        if (typeof valor !== 'string' || !valor.trim()) {
          setFormError(`El campo "${campo.label}" es obligatorio`);
          return;
        }
      }
    }
    const input = aInput(valores, editando);
    if (typeof input === 'string') {
      setFormError(input);
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      if (editando) {
        await useCases.update(editando.id, input);
      } else {
        await useCases.create(input);
      }
      setModalAbierto(false);
      await cargar();
    } catch (e) {
      setFormError(getErrorMessage(e, `No se pudo guardar ${nombreEntidad}`));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(fila: T) {
    if (!window.confirm(`¿Eliminar ${nombreEntidad} #${fila.id}?`)) return;
    try {
      await useCases.remove(fila.id);
      await cargar();
    } catch (e) {
      setError(getErrorMessage(e, `No se pudo eliminar ${nombreEntidad}`));
    }
  }

  const botonCrear = puedeMutar ? (
    <Button onClick={abrirCrear}>+ Agregar {nombreEntidad}</Button>
  ) : null;

  return (
    <div className="space-y-6">
      {imagenHero ? (
        <PageHero
          titulo={titulo}
          destacado={destacado}
          subtitulo={descripcion}
          imagen={imagenHero}
          imagenFallback={fallbackDeImagen(imagenHero)}
          accion={
            <div className="flex flex-wrap items-center gap-3">
              {accionExtra}
              {botonCrear}
            </div>
          }
          compacto
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">
              <span className="text-primary">{titulo}</span>
            </h1>
            {descripcion && <p className="mt-1 text-sm text-gray-400">{descripcion}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {accionExtra}
            {botonCrear}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-primary-light">
          {error}
        </p>
      )}

      <div className="animate-fade-in">
        <DataTable
          columns={columns}
          data={filas}
          getRowId={(fila) => fila.id}
          loading={loading}
          emptyMessage="Sin registros"
          actions={
            puedeMutar
              ? (fila) => (
                  <>
                    {permitirEditar && (
                      <Button variant="secondary" onClick={() => abrirEditar(fila)}>
                        Editar
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => eliminar(fila)}>
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
        title={editando ? `Editar ${nombreEntidad} #${editando.id}` : `Nuevo ${nombreEntidad}`}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {campos.map((campo) => {
            const valor = valores[campo.name];
            if (campo.tipo === 'checkbox') {
              return (
                <label key={campo.name} className="flex items-center gap-3 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(valor)}
                    onChange={(e) =>
                      setValores((v) => ({ ...v, [campo.name]: e.target.checked }))
                    }
                    className="h-4 w-4 accent-primary"
                  />
                  {campo.label}
                </label>
              );
            }
            if (campo.tipo === 'select') {
              return (
                <FormSelect
                  key={campo.name}
                  label={campo.label}
                  value={String(valor ?? '')}
                  onChange={(e) => setValores((v) => ({ ...v, [campo.name]: e.target.value }))}
                  placeholder={campo.placeholder ?? 'Selecciona una opción'}
                  options={campo.options ?? []}
                />
              );
            }
            return (
              <FormInput
                key={campo.name}
                label={campo.label}
                type={campo.tipo}
                step={campo.step}
                maxLength={campo.maxLength}
                value={String(valor ?? '')}
                onChange={(e) => setValores((v) => ({ ...v, [campo.name]: e.target.value }))}
                placeholder={campo.placeholder}
              />
            );
          })}

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
              {editando ? 'Guardar cambios' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
