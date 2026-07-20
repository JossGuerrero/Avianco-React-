import { useState } from 'react';
import { PlaneIcon } from './PlaneIcon';

type VarianteImagen = 'vuelos' | 'reservas' | 'pasajeros' | 'default';

interface ImagenConFallbackProps {
  src: string;
  fallbackSrc?: string;
  className?: string;
  variante?: VarianteImagen;
}

const FONDOS: Record<VarianteImagen, string> = {
  vuelos: 'bg-gradient-to-br from-primary-dark/80 via-primary/40 to-dark',
  reservas: 'bg-gradient-to-br from-slate-800 via-dark to-primary-dark/60',
  pasajeros: 'bg-gradient-to-br from-indigo-950/80 via-dark to-primary/30',
  default: 'bg-gradient-to-br from-primary-dark/50 via-dark to-dark',
};

export function ImagenConFallback({
  src,
  fallbackSrc,
  className = '',
  variante = 'default',
}: ImagenConFallbackProps) {
  const [actual, setActual] = useState(src);

  if (actual === '__fallback__') {
    return (
      <div
        className={`relative flex h-full w-full items-center justify-center overflow-hidden ${FONDOS[variante]} ${className}`}
        aria-hidden="true"
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-8 top-1/4 h-32 w-32 rounded-full bg-primary blur-3xl" />
          <div className="absolute -right-8 bottom-1/4 h-24 w-24 rounded-full bg-primary-light blur-2xl" />
        </div>
        <PlaneIcon
          size="lg"
          className="relative text-white/40 animate-float motion-reduce:animate-none"
        />
      </div>
    );
  }

  return (
    <img
      src={actual}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => {
        if (fallbackSrc && actual !== fallbackSrc) {
          setActual(fallbackSrc);
        } else {
          setActual('__fallback__');
        }
      }}
      className={className}
    />
  );
}
