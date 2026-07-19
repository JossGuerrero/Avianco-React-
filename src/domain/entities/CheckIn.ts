export interface CheckIn {
  id: number;
  reserva: number;
  puerta: number | null;
  tarjeta_embarque: string;
  estado: string;
}

export type CheckInInput = Omit<CheckIn, 'id'>;
