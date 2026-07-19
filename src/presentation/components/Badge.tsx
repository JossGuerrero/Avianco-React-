const TONOS: Record<string, string> = {
  confirmada: 'bg-green-500/15 text-green-400 border-green-500/40',
  completado: 'bg-green-500/15 text-green-400 border-green-500/40',
  pagada: 'bg-green-500/15 text-green-400 border-green-500/40',
  programado: 'bg-green-500/15 text-green-400 border-green-500/40',
  activa: 'bg-green-500/15 text-green-400 border-green-500/40',
  activo: 'bg-green-500/15 text-green-400 border-green-500/40',
  cancelada: 'bg-primary/15 text-primary-light border-primary/40',
  cancelado: 'bg-primary/15 text-primary-light border-primary/40',
  fallido: 'bg-primary/15 text-primary-light border-primary/40',
  anulada: 'bg-primary/15 text-primary-light border-primary/40',
  inactivo: 'bg-primary/15 text-primary-light border-primary/40',
  pendiente: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
  reembolsado: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
  embarcado: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
  abordando: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
  despegado: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
  aterrizado: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
  embarque: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
  disponible: 'bg-green-500/15 text-green-400 border-green-500/40',
  ocupado: 'bg-primary/15 text-primary-light border-primary/40',
  alerta: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
  leída: 'bg-green-500/15 text-green-400 border-green-500/40',
  'no leída': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
};

const TONO_DEFAULT = 'bg-gray-500/15 text-gray-300 border-gray-500/40';

interface BadgeProps {
  estado: string;
}

export function Badge({ estado }: BadgeProps) {
  const tono = TONOS[estado.toLowerCase()] ?? TONO_DEFAULT;
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${tono}`}
    >
      {estado}
    </span>
  );
}
