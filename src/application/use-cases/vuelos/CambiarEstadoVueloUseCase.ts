import type { Vuelo, VueloInput } from '../../../domain/entities/Vuelo';
import type { Reserva, ReservaInput } from '../../../domain/entities/Reserva';
import type { Pasajero, PasajeroInput } from '../../../domain/entities/Pasajero';
import type { Notificacion, NotificacionInput } from '../../../domain/entities/Notificacion';
import type {
  EstadoVueloRegistro,
  EstadoVueloRegistroInput,
} from '../../../domain/entities/EstadoVueloRegistro';
import { EstadoVuelo } from '../../../domain/enums/EstadoVuelo';
import { EstadoReserva } from '../../../domain/enums/EstadoReserva';
import { TipoNotificacion } from '../../../domain/enums/TipoNotificacion';
import type { CrudUseCases } from '../common/CrudUseCases';

export interface ResultadoCambioEstado {
  vuelo: Vuelo;
  // Usuarios notificados (solo aplica al pasar a "abordando"; 0 en el resto).
  notificados: number;
}

interface Dependencias {
  vuelos: CrudUseCases<Vuelo, VueloInput>;
  reservas: CrudUseCases<Reserva, ReservaInput>;
  pasajeros: CrudUseCases<Pasajero, PasajeroInput>;
  notificaciones: CrudUseCases<Notificacion, NotificacionInput>;
  estadosVuelo: CrudUseCases<EstadoVueloRegistro, EstadoVueloRegistroInput>;
}

// Cambia el estado de un vuelo (PATCH /vuelos/{id}/), deja registro en el
// historial (/estados-vuelo/) y, si el nuevo estado es "abordando", notifica
// automáticamente a cada usuario con reserva confirmada en ese vuelo.
export class CambiarEstadoVueloUseCase {
  private readonly deps: Dependencias;

  constructor(deps: Dependencias) {
    this.deps = deps;
  }

  async execute(vuelo: Vuelo, nuevoEstado: EstadoVuelo): Promise<ResultadoCambioEstado> {
    const actualizado = await this.deps.vuelos.update(vuelo.id, { estado: nuevoEstado });

    const ruta = `${vuelo.origen_detalle?.codigo_iata ?? `#${vuelo.origen}`} → ${
      vuelo.destino_detalle?.codigo_iata ?? `#${vuelo.destino}`
    }`;

    // El historial alimenta el timeline del detalle; si falla no revierte el cambio.
    await this.deps.estadosVuelo
      .create({
        vuelo: vuelo.id,
        estado: nuevoEstado,
        descripcion: `Vuelo ${ruta} cambió a "${nuevoEstado}"`,
      })
      .catch(() => undefined);

    let notificados = 0;
    if (nuevoEstado === EstadoVuelo.Abordando) {
      notificados = await this.notificarEmbarque(vuelo, ruta);
    }

    return { vuelo: actualizado, notificados };
  }

  private async notificarEmbarque(vuelo: Vuelo, ruta: string): Promise<number> {
    const [reservas, pasajeros] = await Promise.all([
      this.deps.reservas.getAll({ vuelo: vuelo.id }),
      this.deps.pasajeros.getAll(),
    ]);

    const usuarioPorPasajero = new Map(pasajeros.map((p) => [p.id, p.usuario]));

    // Un mismo usuario puede tener varios pasajeros en el vuelo: se notifica una vez.
    const usuarios = new Set<number>();
    for (const reserva of reservas) {
      if (reserva.vuelo !== vuelo.id || reserva.estado !== EstadoReserva.Confirmada) continue;
      const usuario = usuarioPorPasajero.get(reserva.pasajero);
      if (usuario) usuarios.add(usuario);
    }

    const resultados = await Promise.allSettled(
      [...usuarios].map((usuario) =>
        this.deps.notificaciones.create({
          usuario,
          tipo: TipoNotificacion.Embarque,
          titulo: `Tu vuelo ${ruta} está abordando`,
          mensaje: `El vuelo #${vuelo.id} (${ruta}) inició el abordaje. Dirígete a tu puerta de embarque.`,
          leida: false,
        }),
      ),
    );
    return resultados.filter((r) => r.status === 'fulfilled').length;
  }
}
