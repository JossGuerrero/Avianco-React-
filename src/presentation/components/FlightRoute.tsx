import { PlaneIcon } from './PlaneIcon';

interface FlightRouteProps {
etiqueta?: string;
animarEnHover?: boolean;
ancho?: 'sm' | 'md';
}

export function FlightRoute({
  etiqueta = 'Directo',
  animarEnHover = false,
  ancho = 'md',
}: FlightRouteProps) {
  const anchoClase = ancho === 'sm' ? 'w-12' : 'w-16';

  return (
    <div className={`flex shrink-0 flex-col items-center gap-1 px-2 ${anchoClase}`}>
      <div className={`relative ${anchoClase} py-2`}>
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2">
          <div className="h-full w-full animate-route-dash bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        </div>

        <div
          className={`absolute top-1/2 -translate-y-1/2 text-primary-light ${
            animarEnHover
              ? 'left-[15%] transition-all duration-700 ease-out group-hover:left-[65%] group-hover:-translate-y-[calc(50%+2px)] group-hover:rotate-3 motion-reduce:transition-none motion-reduce:group-hover:left-[15%]'
              : 'left-1/2 -translate-x-1/2 animate-float motion-reduce:animate-none'
          }`}
        >
          <PlaneIcon size={ancho === 'sm' ? 'sm' : 'md'} />
        </div>
      </div>

      {etiqueta && (
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {etiqueta}
        </span>
      )}
    </div>
  );
}
