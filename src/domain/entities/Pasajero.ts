export interface Pasajero {
  id: number;
  usuario: number;
  numero_pasaporte: string;
  nacionalidad: string;
  fecha_nacimiento: string;
  telefono: string;
  nombre_completo?: string;
}

export interface PasajeroInput {
  usuario: number;
  numero_pasaporte: string;
  nacionalidad: string;
  fecha_nacimiento: string;
  telefono: string;
  nombre_completo?: string;
}

