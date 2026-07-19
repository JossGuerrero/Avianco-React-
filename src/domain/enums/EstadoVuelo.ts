export const EstadoVuelo = {
  Programado: 'programado',
  Abordando: 'abordando',
  Despegado: 'despegado',
  Aterrizado: 'aterrizado',
  Cancelado: 'cancelado',
} as const;

export type EstadoVuelo = (typeof EstadoVuelo)[keyof typeof EstadoVuelo];
