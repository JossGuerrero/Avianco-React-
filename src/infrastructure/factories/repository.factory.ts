import type { Aerolinea, AerolineaInput } from '../../domain/entities/Aerolinea';
import type { Aeronave, AeronaveInput } from '../../domain/entities/Aeronave';
import type { Aeropuerto, AeropuertoInput } from '../../domain/entities/Aeropuerto';
import type { Asiento, AsientoInput } from '../../domain/entities/Asiento';
import type {
  AsignacionTripulacion,
  AsignacionTripulacionInput,
} from '../../domain/entities/AsignacionTripulacion';
import type { CheckIn, CheckInInput } from '../../domain/entities/CheckIn';
import type { Ciudad, CiudadInput } from '../../domain/entities/Ciudad';
import type { Equipaje, EquipajeInput } from '../../domain/entities/Equipaje';
import type { Escala, EscalaInput } from '../../domain/entities/Escala';
import type {
  EstadoVueloRegistro,
  EstadoVueloRegistroInput,
} from '../../domain/entities/EstadoVueloRegistro';
import type { Factura, FacturaInput } from '../../domain/entities/Factura';
import type { MetodoPago, MetodoPagoInput } from '../../domain/entities/MetodoPago';
import type { Notificacion, NotificacionInput } from '../../domain/entities/Notificacion';
import type { Pago, PagoInput } from '../../domain/entities/Pago';
import type { Pais, PaisInput } from '../../domain/entities/Pais';
import type { Pasajero, PasajeroInput } from '../../domain/entities/Pasajero';
import type { Puerta, PuertaInput } from '../../domain/entities/Puerta';
import type { ReservaServicio, ReservaServicioInput } from '../../domain/entities/ReservaServicio';
import type { Servicio, ServicioInput } from '../../domain/entities/Servicio';
import type { Tarifa, TarifaInput } from '../../domain/entities/Tarifa';
import type { Terminal, TerminalInput } from '../../domain/entities/Terminal';
import type { TipoAvion, TipoAvionInput } from '../../domain/entities/TipoAvion';
import type { Tripulante, TripulanteInput } from '../../domain/entities/Tripulante';
import { AxiosAuthRepository } from '../adapters/axios-auth.repository';
import { AxiosVueloRepository } from '../adapters/axios-vuelo.repository';
import { AxiosPromocionRepository } from '../adapters/axios-promocion.repository';
import { AxiosReservaRepository } from '../adapters/axios-reserva.repository';
import { AxiosPasajeroRepository } from '../adapters/axios-pasajero.repository';
import { AxiosAeropuertoRepository } from '../adapters/axios-aeropuerto.repository';
import { AxiosAeronaveRepository } from '../adapters/axios-aeronave.repository';
import { AxiosTripulacionRepository } from '../adapters/axios-tripulacion.repository';
import { AxiosFacturaRepository } from '../adapters/axios-factura.repository';
import { AxiosPagoRepository } from '../adapters/axios-pago.repository';
import { AxiosMetodoPagoRepository } from '../adapters/axios-metodo-pago.repository';
import { AxiosCrudRepository } from '../adapters/axios-crud.repository';
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase';
import { RegisterUseCase } from '../../application/use-cases/auth/RegisterUseCase';
import { LogoutUseCase } from '../../application/use-cases/auth/LogoutUseCase';
import { GetVuelosUseCase } from '../../application/use-cases/vuelos/GetVuelosUseCase';
import { CambiarEstadoVueloUseCase } from '../../application/use-cases/vuelos/CambiarEstadoVueloUseCase';
import { GetPromocionesUseCase } from '../../application/use-cases/promociones/GetPromocionesUseCase';
import { ReservaUseCases } from '../../application/use-cases/reservas/ReservaUseCases';
import { CrudUseCases } from '../../application/use-cases/common/CrudUseCases';

const authRepository = new AxiosAuthRepository();
const vueloRepository = new AxiosVueloRepository();
const promocionRepository = new AxiosPromocionRepository();

// Para los recursos CRUD estándar el adaptador genérico basta:
// solo cambia el endpoint y los tipos.
function crud<T, TInput>(endpoint: string): CrudUseCases<T, TInput> {
  return new CrudUseCases<T, TInput>(new AxiosCrudRepository<T, TInput>(endpoint));
}

// Instancias compartidas entre la factory y los casos de uso compuestos.
const vuelosUseCases = new CrudUseCases(vueloRepository);
const reservasUseCases = new ReservaUseCases(new AxiosReservaRepository());
const pasajerosUseCases = new CrudUseCases<Pasajero, PasajeroInput>(new AxiosPasajeroRepository());
const notificacionesUseCases = crud<Notificacion, NotificacionInput>('/notificaciones/');
const estadosVueloUseCases = crud<EstadoVueloRegistro, EstadoVueloRegistroInput>('/estados-vuelo/');

export const useCaseFactory = {
  // Auth
  loginUseCase: new LoginUseCase(authRepository),
  registerUseCase: new RegisterUseCase(authRepository),
  logoutUseCase: new LogoutUseCase(authRepository),

  // Vuelos y promociones
  getVuelosUseCase: new GetVuelosUseCase(vueloRepository),
  getPromocionesUseCase: new GetPromocionesUseCase(promocionRepository),
  vuelos: vuelosUseCases,
  cambiarEstadoVuelo: new CambiarEstadoVueloUseCase({
    vuelos: vuelosUseCases,
    reservas: reservasUseCases,
    pasajeros: pasajerosUseCases,
    notificaciones: notificacionesUseCases,
    estadosVuelo: estadosVueloUseCases,
  }),

  // Módulos principales
  reservas: reservasUseCases,
  pasajeros: pasajerosUseCases,
  aeropuertos: new CrudUseCases<Aeropuerto, AeropuertoInput>(new AxiosAeropuertoRepository()),
  aeronaves: new CrudUseCases<Aeronave, AeronaveInput>(new AxiosAeronaveRepository()),
  tripulacion: new CrudUseCases<Tripulante, TripulanteInput>(new AxiosTripulacionRepository()),
  facturas: new CrudUseCases<Factura, FacturaInput>(new AxiosFacturaRepository()),
  pagos: new CrudUseCases<Pago, PagoInput>(new AxiosPagoRepository()),
  metodosPago: new CrudUseCases<MetodoPago, MetodoPagoInput>(new AxiosMetodoPagoRepository()),

  // Catálogos simples
  aerolineas: crud<Aerolinea, AerolineaInput>('/aerolineas/'),
  tiposAvion: crud<TipoAvion, TipoAvionInput>('/tipos-avion/'),
  tarifas: crud<Tarifa, TarifaInput>('/tarifas/'),
  paises: crud<Pais, PaisInput>('/paises/'),
  ciudades: crud<Ciudad, CiudadInput>('/ciudades/'),
  terminales: crud<Terminal, TerminalInput>('/terminales/'),
  puertas: crud<Puerta, PuertaInput>('/puertas/'),

  // Módulos operativos
  asientos: crud<Asiento, AsientoInput>('/asientos/'),
  checkins: crud<CheckIn, CheckInInput>('/checkins/'),
  servicios: crud<Servicio, ServicioInput>('/servicios/'),
  reservaServicios: crud<ReservaServicio, ReservaServicioInput>('/reserva-servicios/'),
  equipajes: crud<Equipaje, EquipajeInput>('/equipajes/'),
  asignaciones: crud<AsignacionTripulacion, AsignacionTripulacionInput>('/asignaciones/'),
  escalas: crud<Escala, EscalaInput>('/escalas/'),
  estadosVuelo: estadosVueloUseCases,
  notificaciones: notificacionesUseCases,
} as const;
