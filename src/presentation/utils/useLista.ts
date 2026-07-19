import { useEffect, useState } from 'react';

interface Listable<T> {
  getAll(): Promise<T[]>;
}

export function useLista<T>(fuente: Listable<T>): T[] {
  const [datos, setDatos] = useState<T[]>([]);

  useEffect(() => {
    let cancelado = false;
    fuente
      .getAll()
      .then((lista) => {
        if (!cancelado) setDatos(lista);
      })
      .catch(() => {
      });
    return () => {
      cancelado = true;
    };
  }, [fuente]);

  return datos;
}
