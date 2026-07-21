import { useState } from 'react';
import { resolverUrlBandera } from '../utils/banderas';

interface BanderaPaisProps {
  codigo: string;
  bandera?: string;
  nombre: string;
  className?: string;
}

export function BanderaPais({ codigo, bandera, nombre, className = 'h-6 w-9' }: BanderaPaisProps) {
  const [src, setSrc] = useState(() => resolverUrlBandera(codigo, bandera));

  return (
    <img
      src={src}
      alt={`Bandera de ${nombre}`}
      loading="lazy"
      onError={() => {
        const alternativa = resolverUrlBandera(codigo);
        if (src !== alternativa) setSrc(alternativa);
      }}
      className={`rounded border border-dark-border object-cover shadow-sm ${className}`}
    />
  );
}
