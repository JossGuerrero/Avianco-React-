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
  notificados: number;
}

interface Dependencias {
  vuelos: CrudUseCases<Vuelo, VueloInput>;
  reservas: CrudUseCases<Reserva, ReservaInput>;
  pasajeros: CrudUseCases<Pasajero, PasajeroInput>;
  notificaciones: CrudUseCases<Notificacion, NotificacionInput>;
  estadosVuelo: CrudUseCases<EstadoVueloRegistro, EstadoVueloRegistroInput>;
}

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

    await this.deps.estadosVuelo
      .create({
        vuelo: vuelo.id,
        estado: nuevoEstado,
        descripcion: `Vuelo ${ruta} cambió a "${nuevoEstado}"`,
      })
      .catch(() => undefined);

    let notificados = 0;
    if (nuevoEstado === EstadoVuelo.Abordando) {
      notificados = await this.notificarPasajeros(vuelo, {
        tipo: TipoNotificacion.Embarque,
        titulo: `Tu vuelo ${ruta} está abordando`,
        mensaje: `El vuelo #${vuelo.id} (${ruta}) inició el abordaje. Dirígete a tu puerta de embarque.`,
      });
    } else if (nuevoEstado === EstadoVuelo.Cancelado) {
      notificados = await this.notificarPasajeros(vuelo, {
        tipo: TipoNotificacion.Cancelado,
        titulo: `Tu vuelo ${ruta} fue cancelado`,
        mensaje: `Lamentamos informarte que el vuelo #${vuelo.id} (${ruta}) fue cancelado. Contáctanos para reprogramar o solicitar reembolso.`,
      });
    }

    return { vuelo: actualizado, notificados };
  }

  private async notificarPasajeros(
    vuelo: Vuelo,
    aviso: { tipo: TipoNotificacion; titulo: string; mensaje: string },
  ): Promise<number> {
    const [reservas, pasajeros, existentes] = await Promise.all([
      this.deps.reservas.getAll({ vuelo: vuelo.id }),
      this.deps.pasajeros.getAll(),
      this.deps.notificaciones.getAll().catch(() => []),
    ]);

    const usuarioPorPasajero = new Map(pasajeros.map((p) => [p.id, p.usuario]));

    const usuarios = new Set<number>();
    for (const reserva of reservas) {
      if (reserva.vuelo !== vuelo.id || reserva.estado !== EstadoReserva.Confirmada) continue;
      const usuario = usuarioPorPasajero.get(reserva.pasajero);
      if (usuario) usuarios.add(usuario);
    }

    const marcaVuelo = `#${vuelo.id} `;
    const yaAvisados = new Set(
      existentes
        .filter((n) => n.tipo === aviso.tipo && n.mensaje.includes(marcaVuelo))
        .map((n) => n.usuario),
    );

    const pendientes = [...usuarios].filter((usuario) => !yaAvisados.has(usuario));
    const resultados = await Promise.allSettled(
      pendientes.map((usuario) =>
        this.deps.notificaciones.create({
          usuario,
          tipo: aviso.tipo,
          titulo: aviso.titulo,
          mensaje: aviso.mensaje,
          leida: false,
        }),
      ),
    );
    return resultados.filter((r) => r.status === 'fulfilled').length;
  }
}
