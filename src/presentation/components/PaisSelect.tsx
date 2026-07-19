import { useEffect, useMemo, useRef, useState } from 'react';
import { getPaisesFlagcdn, type PaisFlag } from '../../infrastructure/http/flagcdn-client';
import { PAISES } from '../utils/paises';

interface PaisSelectProps {
  label: string;
  value: string;
  onChange: (nombre: string) => void;
  placeholder?: string;
}

export function PaisSelect({ label, value, onChange, placeholder = 'Busca un país...' }: PaisSelectProps) {
  const [paises, setPaises] = useState<PaisFlag[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;
    getPaisesFlagcdn()
      .then((lista) => {
        if (!cancelado) setPaises(lista);
      })
      .catch(() => {
        if (!cancelado) {
          setPaises(PAISES.map((nombre) => ({ codigo: '', nombre, bandera: '' })));
        }
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    function alClickFuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', alClickFuera);
    return () => document.removeEventListener('mousedown', alClickFuera);
  }, []);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return paises;
    return paises.filter((p) => p.nombre.toLowerCase().includes(texto));
  }, [paises, busqueda]);

  const seleccionado = paises.find((p) => p.nombre === value);

  function seleccionar(pais: PaisFlag) {
    onChange(pais.nombre);
    setBusqueda('');
    setAbierto(false);
  }

  return (
    <div className="block" ref={contenedorRef}>
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <div className="relative mt-1">
        <div className="flex items-center gap-2 rounded-lg border border-dark-border bg-dark px-4 py-2.5 transition-colors focus-within:border-primary">
          {seleccionado?.bandera && !abierto && (
            <img src={seleccionado.bandera} alt="" className="h-3.5 w-5 rounded-sm object-cover" />
          )}
          <input
            type="text"
            value={abierto ? busqueda : value}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setAbierto(true);
            }}
            onFocus={() => {
              setBusqueda('');
              setAbierto(true);
            }}
            placeholder={value || placeholder}
            className="w-full bg-transparent text-white outline-none placeholder:text-gray-500"
          />
          <svg
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </div>

        {abierto && (
          <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-dark-border bg-dark-surface shadow-2xl animate-fade-in">
            {filtrados.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400">Sin resultados</li>
            )}
            {filtrados.map((pais) => (
              <li key={pais.codigo || pais.nombre}>
                <button
                  type="button"
                  onClick={() => seleccionar(pais)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-dark ${
                    pais.nombre === value ? 'text-primary-light' : 'text-gray-200'
                  }`}
                >
                  {pais.bandera && (
                    <img src={pais.bandera} alt="" className="h-3.5 w-5 rounded-sm object-cover" />
                  )}
                  {pais.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
