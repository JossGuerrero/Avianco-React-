import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Vuelo } from '../../domain/entities/Vuelo';
import type { Escala } from '../../domain/entities/Escala';
import type { EstadoVueloRegistro } from '../../domain/entities/EstadoVueloRegistro';
import type { Aeropuerto } from '../../domain/entities/Aeropuerto';
import { EstadoVuelo } from '../../domain/enums/EstadoVuelo';
import { useCaseFactory } from '../../infrastructure/factories/repository.factory';
import { useAuthStore } from '../store/authStore';
import { Modal } from './Modal';
import { Badge } from './Badge';
import { Button } from './Button';
import { FormSelect } from './FormSelect';
import { Skeleton } from './Skeleton';
import { formatFecha, formatPrecio, getErrorMessage } from '../utils/formatters';
import { labelAeropuerto } from '../utils/labels';

interface VueloDetalleModalProps {
  vuelo: Vuelo | null;
  onClose: () => void;
  // Avisa al padre cuando staff cambia el estado, para refrescar su lista.
  onVueloActualizado?: (vuelo: Vuelo) => void;
}

export function VueloDetalleModal({ vuelo, onClose, onVueloActualizado }: VueloDetalleModalProps) {
  const navigate = useNavigate();
  const { token, isStaff } = useAuthStore();

  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [estados, setEstados] = useState<EstadoVueloRegistro[]>([]);
  const [aeropuertos, setAeropuertos] = useState<Aeropuerto[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // Cambio de estado (solo staff)
  const [nuevoEstado, setNuevoEstado] = useState<EstadoVuelo | ''>('');
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [msgCambio, setMsgCambio] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    // Al abrir otro vuelo se reinicia el formulario de estado.
    setNuevoEstado('');
    setMsgCambio(null);
  }, [vuelo?.id]);

  useEffect(() => {
    if (!vuelo || !token) return;
    let cancelado = false;
    setCargandoDetalle(true);
    Promise.all([
      useCaseFactory.escalas.getAll({ vuelo: vuelo.id }).catch(() => [] as Escala[]),
      useCaseFactory.estadosVuelo
        .getAll({ vuelo: vuelo.id })
        .catch(() => [] as EstadoVueloRegistro[]),
      useCaseFactory.aeropuertos.getAll().catch(() => [] as Aeropuerto[]),
    ])
      .then(([escalasData, estadosData, aeropuertosData]) => {
        if (cancelado) return;
        setEscalas([...escalasData].sort((a, b) => a.orden - b.orden));
        setEstados(estadosData);
        setAeropuertos(aeropuertosData);
      })
      .finally(() => {
        if (!cancelado) setCargandoDetalle(false);
      });
    return () => {
      cancelado = true;
    };
  }, [vuelo, token]);

  const aeropuertosPorId = useMemo(
    () => new Map(aeropuertos.map((a) => [a.id, a])),
    [aeropuertos],
  );

  if (!vuelo) return null;

  const origen = vuelo.origen_detalle;
  const destino = vuelo.destino_detalle;
  const puedeReservar = vuelo.estado === EstadoVuelo.Programado;

  function reservar() {
    if (!vuelo) return;
    onClose();
    navigate(token ? `/checkout/${vuelo.id}` : '/login');
  }

  async function cambiarEstado() {
    if (!vuelo || !nuevoEstado || nuevoEstado === vuelo.estado) return;
    setCambiandoEstado(true);
    setMsgCambio(null);
    try {
      const { vuelo: actualizado, notificados } = await useCaseFactory.cambiarEstadoVuelo.execute(
        vuelo,
        nuevoEstado,
      );
      const aviso =
        nuevoEstado === EstadoVuelo.Abordando
          ? ` Se notificó a ${notificados} pasajero${notificados === 1 ? '' : 's'} con reserva confirmada.`
          : '';
      setMsgCambio({ tipo: 'ok', texto: `Estado actualizado a "${nuevoEstado}".${aviso}` });
      setNuevoEstado('');
      onVueloActualizado?.(actualizado);
    } catch (e) {
      setMsgCambio({
        tipo: 'error',
        texto: getErrorMessage(e, 'No se pudo cambiar el estado del vuelo'),
      });
    } finally {
      setCambiandoEstado(false);
    }
  }

  return (
    <Modal open title={`Vuelo #${vuelo.id}`} onClose={onClose} ancho="lg">
      {/* Ruta */}
      <div className="rounded-xl bg-gradient-to-br from-dark to-dark-surface border border-dark-border p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-3xl font-black text-white">
              {origen?.codigo_iata ?? `#${vuelo.origen}`}
            </p>
            <p className="text-sm text-gray-300">{origen?.ciudad ?? ''}</p>
            <p className="mt-1 text-xs text-gray-400">{formatFecha(vuelo.fecha_salida)}</p>
          </div>
          <div className="flex-1 px-3">
            <div className="relative h-px bg-gradient-to-r from-transparent via-primary to-transparent">
              <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-primary" />
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-white">
              {destino?.codigo_iata ?? `#${vuelo.destino}`}
            </p>
            <p className="text-sm text-gray-300">{destino?.ciudad ?? ''}</p>
            <p className="mt-1 text-xs text-gray-400">{formatFecha(vuelo.fecha_llegada)}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-dark-border pt-4">
          <div className="flex items-center gap-3">
            <Badge estado={vuelo.estado} />
            {vuelo.aeronave_detalle && (
              <span className="text-xs text-gray-400">
                {vuelo.aeronave_detalle.modelo} · {vuelo.aeronave_detalle.matricula}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-primary-light">{formatPrecio(vuelo.precio)}</p>
        </div>
      </div>

      {!token && (
        <p className="mt-4 rounded-lg border border-dark-border bg-dark p-4 text-sm text-gray-400">
          Inicia sesión para ver las escalas y el historial de estados de este vuelo.
        </p>
      )}

      {token && cargandoDetalle && (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {token && !cargandoDetalle && (
        <>
          {/* Escalas */}
          <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-gray-400">Escalas</h3>
          {escalas.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">Vuelo directo, sin escalas.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {escalas.map((escala) => {
                const aeropuerto = aeropuertosPorId.get(escala.aeropuerto);
                return (
                  <li
                    key={escala.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dark-border bg-dark px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-white">
                      <span className="mr-2 rounded bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary-light">
                        {escala.orden}
                      </span>
                      {aeropuerto ? labelAeropuerto(aeropuerto) : `Aeropuerto #${escala.aeropuerto}`}
                    </span>
                    <span className="text-xs text-gray-400">
                      Llega {formatFecha(escala.llegada)} · Sale {formatFecha(escala.salida)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Timeline de estados */}
          <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-gray-400">
            Historial de estados
          </h3>
          {estados.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">Sin historial de estados.</p>
          ) : (
            <ol className="mt-3 border-l border-dark-border pl-4">
              {estados.map((registro) => (
                <li key={registro.id} className="relative mb-4 last:mb-0">
                  <span className="absolute -left-[22.5px] top-1.5 h-3 w-3 rounded-full border-2 border-dark-surface bg-primary" />
                  <Badge estado={registro.estado} />
                  {registro.descripcion && (
                    <p className="mt-1 text-sm text-gray-300">{registro.descripcion}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {/* Panel staff: cambio de estado con notificaciones automáticas */}
      {isStaff && (
        <div className="mt-5 rounded-xl border border-dark-border bg-dark p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">
            Cambiar estado del vuelo
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            Al pasar a «abordando» se notifica automáticamente a los pasajeros con reserva
            confirmada.
          </p>
          <div className="mt-3 flex items-end gap-3">
            <div className="flex-1">
              <FormSelect
                label="Nuevo estado"
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value as EstadoVuelo | '')}
                placeholder="Selecciona un estado"
                options={Object.values(EstadoVuelo)
                  .filter((estado) => estado !== vuelo.estado)
                  .map((estado) => ({ value: estado, label: estado }))}
              />
            </div>
            <Button
              isLoading={cambiandoEstado}
              disabled={!nuevoEstado}
              onClick={cambiarEstado}
            >
              Actualizar
            </Button>
          </div>
          {msgCambio && (
            <p
              className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                msgCambio.tipo === 'ok'
                  ? 'border-green-500/40 bg-green-500/10 text-green-300'
                  : 'border-primary/40 bg-primary/10 text-primary-light'
              }`}
            >
              {msgCambio.texto}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        {puedeReservar && <Button onClick={reservar}>Reservar este vuelo</Button>}
      </div>
    </Modal>
  );
}
