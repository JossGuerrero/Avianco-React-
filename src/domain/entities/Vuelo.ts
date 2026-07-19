import type { EstadoVuelo } from '../enums/EstadoVuelo';
import type { Aeropuerto } from './Aeropuerto';
import type { Aeronave } from './Aeronave';

export interface Vuelo {
  id: number;
  origen: number;
  destino: number;
  aeronave: number;
  fecha_salida: string;
  fecha_llegada: string;
  estado: EstadoVuelo;
  precio: number | string;
  origen_detalle?: Aeropuerto;
  destino_detalle?: Aeropuerto;
  aeronave_detalle?: Aeronave;
}

export interface VueloInput {
  origen: number;
  destino: number;
  aeronave: number;
  fecha_salida: string;
  fecha_llegada: string;
  estado: EstadoVuelo;
  precio: number;
}
