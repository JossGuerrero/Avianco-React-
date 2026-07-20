import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificacionesStore } from '../store/notificacionesStore';

interface NavItem {
  to: string;
  label: string;
  soloStaff?: boolean;
}

interface NavSeccion {
  titulo: string;
  items: NavItem[];
}

const SECCIONES: NavSeccion[] = [
  {
    titulo: 'General',
    items: [{ to: '/dashboard', label: 'Dashboard' }],
  },
  {
    titulo: 'Operaciones',
    items: [
      { to: '/vuelos', label: 'Vuelos' },
      { to: '/reservas', label: 'Reservas' },
      { to: '/pasajeros', label: 'Pasajeros' },
      { to: '/checkins', label: 'Check-ins' },
      { to: '/asientos', label: 'Asientos' },
      { to: '/escalas', label: 'Escalas', soloStaff: true },
      { to: '/estados-vuelo', label: 'Estados de vuelo', soloStaff: true },
      { to: '/asignaciones', label: 'Asignaciones', soloStaff: true },
    ],
  },
  {
    titulo: 'Catálogos',
    items: [
      { to: '/aeropuertos', label: 'Aeropuertos' },
      { to: '/aeronaves', label: 'Aeronaves' },
      { to: '/servicios', label: 'Servicios' },
      { to: '/tripulacion', label: 'Tripulación', soloStaff: true },
      { to: '/aerolineas', label: 'Aerolíneas', soloStaff: true },
      { to: '/tipos-avion', label: 'Tipos de avión', soloStaff: true },
      { to: '/tarifas', label: 'Tarifas' },
      { to: '/paises', label: 'Países', soloStaff: true },
      { to: '/ciudades', label: 'Ciudades', soloStaff: true },
      { to: '/terminales', label: 'Terminales', soloStaff: true },
      { to: '/puertas', label: 'Puertas', soloStaff: true },
    ],
  },
  {
    titulo: 'Finanzas',
    items: [
      { to: '/facturas', label: 'Facturas' },
      { to: '/pagos', label: 'Pagos' },
      { to: '/metodos-pago', label: 'Métodos de pago', soloStaff: true },
      { to: '/reserva-servicios', label: 'Servicios por reserva' },
      { to: '/equipajes', label: 'Equipajes' },
    ],
  },
  {
    titulo: 'Mi cuenta',
    items: [
      { to: '/perfil', label: 'Perfil' },
      { to: '/notificaciones', label: 'Notificaciones' },
    ],
  },
];

function claseNavLink({ isActive }: { isActive: boolean }): string {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
    isActive ? 'bg-primary text-white' : 'text-gray-300 hover:bg-dark hover:text-white'
  }`;
}

function CampanaNotificaciones() {
  const noLeidas = useNotificacionesStore((state) => state.noLeidas);

  return (
    <Link
      to="/notificaciones"
      aria-label="Notificaciones"
      className="relative rounded-lg p-2 text-gray-300 transition-colors hover:bg-dark hover:text-white"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
        />
      </svg>
      {noLeidas > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
          {noLeidas > 9 ? '9+' : noLeidas}
        </span>
      )}
    </Link>
  );
}

interface NavSeccionesProps {
  secciones: NavSeccion[];
  onNavegar?: () => void;
}

function NavSecciones({ secciones, onNavegar }: NavSeccionesProps) {
  return (
    <>
      {secciones.map((seccion) => (
        <div key={seccion.titulo} className="mb-5">
          <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            {seccion.titulo}
          </p>
          <div className="flex flex-col gap-0.5">
            {seccion.items.map((item) => (
              <NavLink key={item.to} to={item.to} className={claseNavLink} onClick={onNavegar}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function PrivateLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isStaff, logout } = useAuthStore();
  const cargarNoLeidas = useNotificacionesStore((state) => state.cargarNoLeidas);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    cargarNoLeidas();
  }, [cargarNoLeidas, location.pathname]);

  // Cerrar el drawer móvil al cambiar de ruta
  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

  const secciones = SECCIONES.map((seccion) => ({
    ...seccion,
    items: seccion.items.filter((item) => !item.soloStaff || isStaff),
  })).filter((seccion) => seccion.items.length > 0);

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-dark text-white">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-dark-border bg-dark-surface md:flex">
        <div className="flex items-center justify-between border-b border-dark-border px-4 py-5">
          <Link to="/" className="text-2xl font-black">
            <span className="text-primary">AVIAN</span>CO
          </Link>
          <CampanaNotificaciones />
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <NavSecciones secciones={secciones} />
        </nav>

        <div className="border-t border-dark-border p-4">
          <p className="truncate text-sm font-semibold">{user?.username}</p>
          <p className="text-xs text-gray-400">{isStaff ? 'Staff / Administrador' : 'Cliente'}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary-light transition-all duration-200 hover:bg-primary hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="min-w-0 flex-1 md:ml-60">
        {/* Barra superior móvil */}
        <header className="sticky top-0 z-30 border-b border-dark-border bg-dark-surface md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMenuAbierto(true)}
                aria-label="Abrir menú"
                className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-dark hover:text-white"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link to="/" className="text-xl font-black">
                <span className="text-primary">AVIAN</span>CO
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <CampanaNotificaciones />
              <button
                onClick={handleLogout}
                className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary-light"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        {/* Drawer móvil */}
        {menuAbierto && (
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-fade-in md:hidden"
            onClick={() => setMenuAbierto(false)}
          >
            <div
              className="flex h-full w-72 max-w-[85vw] flex-col bg-dark-surface shadow-2xl animate-slide-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-dark-border px-4 py-4">
                <span className="text-xl font-black">
                  <span className="text-primary">AVIAN</span>CO
                </span>
                <button
                  onClick={() => setMenuAbierto(false)}
                  aria-label="Cerrar menú"
                  className="rounded-lg px-2 py-1 text-gray-400 transition-colors hover:bg-dark hover:text-white"
                >
                  ✕
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4">
                <NavSecciones secciones={secciones} onNavegar={() => setMenuAbierto(false)} />
              </nav>
              <div className="border-t border-dark-border p-4 text-sm">
                <p className="truncate font-semibold">{user?.username}</p>
                <p className="text-xs text-gray-400">
                  {isStaff ? 'Staff / Administrador' : 'Cliente'}
                </p>
              </div>
            </div>
          </div>
        )}

        <main key={location.pathname} className="p-4 md:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
