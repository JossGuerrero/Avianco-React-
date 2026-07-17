export interface CheckIn {
  id: number;
  reserva: number;
  // La puerta puede quedar sin asignar hasta que staff la defina
  // (el check-in del cliente se crea con puerta null).
  puerta: number | null;
  tarjeta_embarque: string;
  estado: string;
}

export type CheckInInput = Omit<CheckIn, 'id'>;
