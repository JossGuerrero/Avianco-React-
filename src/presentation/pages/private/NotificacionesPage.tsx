import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Notificacion } from '../../../domain/entities/Notificacion';
import { TipoNotificacion } from '../../../domain/enums/TipoNotificacion';
import { useCaseFactory } from '../../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../../store/authStore';
import { useNotificacionesStore } from '../../store/notificacionesStore';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { PageHero } from '../../components/PageHero';
import { AVIATION_IMAGES, fallbackDeImagen } from '../../utils/aviationImages';
import { getErrorMessage } from '../../utils/formatters';

interface NotificacionForm {
  usuario: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
}

const FORM_VACIO: NotificacionForm = {
  usuario: '',
  tipo: TipoNotificacion.Info,
  titulo: '',
  mensaje: '',
};

export function NotificacionesPage() {
  const { user, isStaff } = useAuthStore();
  const cargarNoLeidas = useNotificacionesStore((state) => state.cargarNoLeidas);

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState<NotificacionForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setNotificaciones(await useCaseFactory.notificaciones.getAll());
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar las notificaciones'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(
    () => (isStaff ? notificaciones : notificaciones.filter((n) => n.usuario === user?.id)),
    [notificaciones, isStaff, user],
  );

  async function marcarLeida(notificacion: Notificacion) {
    try {
      await useCaseFactory.notificaciones.update(notificacion.id, { leida: true });
      await cargar();
      await cargarNoLeidas();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo marcar como leída'));
    }
  }

  async function eliminar(notificacion: Notificacion) {
    if (!window.confirm(`¿Eliminar la notificación #${notificacion.id}?`)) return;
    try {
      await useCaseFactory.notificaciones.remove(notificacion.id);
      await cargar();
      await cargarNoLeidas();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo eliminar la notificación'));
    }
  }

  function abrirCrear() {
    setForm(FORM_VACIO);
    setFormError(null);
    setModalAbierto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const usuario = Number(form.usuario);
    if (!usuario || !form.titulo.trim() || !form.mensaje.trim()) {
      setFormError('Usuario, título y mensaje son obligatorios');
      return;
    }
    setGuardando(true);
    setFormError(null);
    try {
      await useCaseFactory.notificaciones.create({
        usuario,
        tipo: form.tipo,
        titulo: form.titulo.trim(),
        mensaje: form.mensaje.trim(),
        leida: false,
      });
      setModalAbierto(false);
      await cargar();
      await cargarNoLeidas();
    } catch (e) {
      setFormError(getErrorMessage(e, 'No se pudo crear la notificación'));
    } finally {
      setGuardando(false);
    }
  }

  const columnas: Column<Notificacion>[] = [
    { header: 'Tipo', render: (n) => <Badge estado={n.tipo} /> },
    {
      header: 'Título',
      render: (n) => (
        <span className={n.leida ? 'text-gray-400' : 'font-semibold text-white'}>{n.titulo}</span>
      ),
    },
    { header: 'Mensaje', render: (n) => <span className="text-gray-300">{n.mensaje}</span> },
    { header: 'Estado', render: (n) => <Badge estado={n.leida ? 'leída' : 'no leída'} /> },
  ];

  if (isStaff) {
    columnas.unshift({
      header: 'Usuario',
      render: (n) => <span className="text-gray-400">#{n.usuario}</span>,
    });
  }

  return (
    <div className="space-y-6">
      <PageHero
        titulo="Notificaciones"
        destacado="Notificaciones"
        subtitulo={
          isStaff
            ? 'Envía alertas operativas y mensajes a los usuarios del sistema'
            : 'Revisa avisos de vuelos, reservas y cambios importantes'
        }
        imagen={AVIATION_IMAGES.notificaciones}
        imagenFallback={fallbackDeImagen(AVIATION_IMAGES.notificaciones)}
        accion={
          <div className="flex flex-wrap items-center gap-3">
            {visibles.length > 0 && (
              <span className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                {visibles.filter((n) => !n.leida).length} sin leer
              </span>
            )}
            {isStaff && <Button onClick={abrirCrear}>+ Nueva notificación</Button>}
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
          getRowId={(n) => n.id}
          loading={loading}
          emptyMessage="No tienes notificaciones"
          actions={(notificacion) => (
            <>
              {!notificacion.leida && notificacion.usuario === user?.id && (
                <Button variant="secondary" onClick={() => marcarLeida(notificacion)}>
                  Marcar leída
                </Button>
              )}
              {isStaff && (
                <Button variant="danger" onClick={() => eliminar(notificacion)}>
                  Eliminar
                </Button>
              )}
            </>
          )}
        />
      </div>

      <Modal open={modalAbierto} title="Nueva notificación" onClose={() => setModalAbierto(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormInput
            label="ID de usuario destinatario"
            type="number"
            value={form.usuario}
            onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
            placeholder="Ej: 5"
          />
          <FormSelect
            label="Tipo"
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoNotificacion }))}
            options={Object.values(TipoNotificacion).map((t) => ({ value: t, label: t }))}
          />
          <FormInput
            label="Título"
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            placeholder="Ej: Cambio de puerta"
          />
          <FormInput
            label="Mensaje"
            value={form.mensaje}
            onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))}
            placeholder="Contenido de la notificación"
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
              Enviar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
