import type { ReactNode } from 'react';
import { FlyingPlaneDecor } from './FlyingPlaneDecor';
import { ImagenConFallback } from './ImagenConFallback';

interface PageHeroProps {
  titulo: string;
  subtitulo?: string;
  imagen: string;
  imagenFallback?: string;
  destacado?: string;
  accion?: ReactNode;
  compacto?: boolean;
}

export function PageHero({
  titulo,
  subtitulo,
  imagen,
  imagenFallback,
  destacado,
  accion,
  compacto = false,
}: PageHeroProps) {
  const tituloRenderizado =
    destacado && titulo.includes(destacado) ? (
      <>
        {titulo.split(destacado)[0]}
        <span className="text-primary-light">{destacado}</span>
        {titulo.split(destacado)[1]}
      </>
    ) : (
      titulo
    );

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-dark-border shadow-2xl ${
        compacto ? 'min-h-[160px] sm:min-h-[180px]' : 'min-h-[220px] sm:min-h-[280px]'
      }`}
    >
      <ImagenConFallback
        src={imagen}
        fallbackSrc={imagenFallback}
        className="absolute inset-0 h-full w-full object-cover motion-safe:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-dark/95 via-dark/75 to-dark/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/50 via-transparent to-dark/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(211,47,47,0.15),transparent_60%)]" />
      <FlyingPlaneDecor />

      <div
        className={`relative flex flex-wrap items-end justify-between gap-4 ${
          compacto ? 'p-6 sm:p-8' : 'p-8 sm:p-10'
        }`}
      >
        <div className="max-w-2xl">
          <h1
            className={`font-black tracking-tight text-white drop-shadow-lg ${
              compacto ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl lg:text-5xl'
            }`}
          >
            {tituloRenderizado}
          </h1>
          {subtitulo && (
            <p className="mt-2 max-w-xl text-sm text-gray-200 sm:text-base">{subtitulo}</p>
          )}
        </div>
        {accion && <div className="shrink-0">{accion}</div>}
      </div>
    </section>
  );
}
