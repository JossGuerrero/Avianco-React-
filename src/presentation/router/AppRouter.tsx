import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '../pages/public/HomePage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { DashboardPage } from '../pages/private/DashboardPage';
import { VuelosPage } from '../pages/private/VuelosPage';
import { ReservasPage } from '../pages/private/ReservasPage';
import { PasajerosPage } from '../pages/private/PasajerosPage';
import { AeropuertosPage } from '../pages/private/AeropuertosPage';
import { AeronavesPage } from '../pages/private/AeronavesPage';
import { TripulacionPage } from '../pages/private/TripulacionPage';
import { FacturasPage } from '../pages/private/FacturasPage';
import { PagosPage } from '../pages/private/PagosPage';
import { AerolineasPage } from '../pages/private/AerolineasPage';
import { MetodosPagoPage } from '../pages/private/MetodosPagoPage';
import { TiposAvionPage } from '../pages/private/TiposAvionPage';
import { TarifasPage } from '../pages/private/TarifasPage';
import { PaisesPage } from '../pages/private/PaisesPage';
import { CiudadesPage } from '../pages/private/CiudadesPage';
import { TerminalesPage } from '../pages/private/TerminalesPage';
import { PuertasPage } from '../pages/private/PuertasPage';
import { AsientosPage } from '../pages/private/AsientosPage';
import { CheckInsPage } from '../pages/private/CheckInsPage';
import { ServiciosPage } from '../pages/private/ServiciosPage';
import { ReservaServiciosPage } from '../pages/private/ReservaServiciosPage';
import { EquipajesPage } from '../pages/private/EquipajesPage';
import { AsignacionesPage } from '../pages/private/AsignacionesPage';
import { EscalasPage } from '../pages/private/EscalasPage';
import { EstadosVueloPage } from '../pages/private/EstadosVueloPage';
import { NotificacionesPage } from '../pages/private/NotificacionesPage';
import { PerfilPage } from '../pages/private/PerfilPage';
import { CheckoutPage } from '../pages/private/CheckoutPage';
import { PrivateLayout } from '../components/PrivateLayout';
import { PrivateRoute } from './PrivateRoute';
import { StaffRoute } from './StaffRoute';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<PrivateLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/vuelos" element={<VuelosPage />} />
            <Route path="/checkout/:vueloId" element={<CheckoutPage />} />
            <Route path="/reservas" element={<ReservasPage />} />
            <Route path="/pasajeros" element={<PasajerosPage />} />
            <Route path="/checkins" element={<CheckInsPage />} />
            <Route path="/asientos" element={<AsientosPage />} />
            <Route path="/equipajes" element={<EquipajesPage />} />
            <Route path="/reserva-servicios" element={<ReservaServiciosPage />} />

            <Route path="/aeropuertos" element={<AeropuertosPage />} />
            <Route path="/aeronaves" element={<AeronavesPage />} />
            <Route path="/servicios" element={<ServiciosPage />} />

            <Route path="/facturas" element={<FacturasPage />} />
            <Route path="/pagos" element={<PagosPage />} />
            <Route path="/metodos-pago" element={<MetodosPagoPage />} />

            <Route path="/perfil" element={<PerfilPage />} />
            <Route path="/notificaciones" element={<NotificacionesPage />} />

            <Route element={<StaffRoute />}>
              <Route path="/tripulacion" element={<TripulacionPage />} />
              <Route path="/aerolineas" element={<AerolineasPage />} />
              <Route path="/tipos-avion" element={<TiposAvionPage />} />
              <Route path="/tarifas" element={<TarifasPage />} />
              <Route path="/paises" element={<PaisesPage />} />
              <Route path="/ciudades" element={<CiudadesPage />} />
              <Route path="/terminales" element={<TerminalesPage />} />
              <Route path="/puertas" element={<PuertasPage />} />
              <Route path="/escalas" element={<EscalasPage />} />
              <Route path="/asignaciones" element={<AsignacionesPage />} />
              <Route path="/estados-vuelo" element={<EstadosVueloPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
