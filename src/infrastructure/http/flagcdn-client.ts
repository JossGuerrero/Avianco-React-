
export interface PaisFlag {
  codigo: string;
  nombre: string;
  bandera: string;
}

let cache: PaisFlag[] | null = null;

export async function getPaisesFlagcdn(): Promise<PaisFlag[]> {
  if (cache) return cache;

  const respuesta = await fetch('https://flagcdn.com/en/codes.json');
  if (!respuesta.ok) throw new Error('No se pudo cargar la lista de países');

  const data = (await respuesta.json()) as Record<string, string>;
  cache = Object.entries(data)
    .filter(([codigo]) => !codigo.includes('-'))
    .map(([codigo, nombre]) => ({
      codigo,
      nombre,
      bandera: `https://flagcdn.com/w40/${codigo}.png`,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return cache;
}
