import type { EstadoVuelo } from '../enums/EstadoVuelo';

export interface EstadoVueloRegistro {
  id: number;
  vuelo: number;
  estado: EstadoVuelo;
  descripcion: string;
}

export type EstadoVueloRegistroInput = Omit<EstadoVueloRegistro, 'id'>;
