import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

function obtenerItemsAnimables(bloque: HTMLElement): HTMLElement[] {
  const items: HTMLElement[] = [];

  for (const child of bloque.children) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.classList.contains('home-animate')) continue;
    if (child.classList.contains('home-animate-item')) {
      items.push(child);
      continue;
    }
    for (const nested of child.children) {
      if (nested instanceof HTMLElement && nested.classList.contains('home-animate-item')) {
        items.push(nested);
      }
    }
  }

  return items;
}

function animarAlScroll(bloque: HTMLElement, elementos: HTMLElement[]) {
  gsap.set(elementos, { opacity: 0, y: 22 });

  const mostrar = () => {
    gsap.to(elementos, {
      opacity: 1,
      y: 0,
      duration: 0.55,
      stagger: 0.06,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const ocultar = () => {
    gsap.to(elementos, {
      opacity: 0,
      y: 22,
      duration: 1.25,
      stagger: 0.05,
      ease: 'power1.inOut',
      overwrite: 'auto',
    });
  };

  ScrollTrigger.create({
    trigger: bloque,
    start: 'top 90%',
    onEnter: mostrar,
    onEnterBack: mostrar,
    onLeaveBack: ocultar,
  });
}

function configurarAnimacionesScroll(contenedor: HTMLElement) {
  contenedor.querySelectorAll<HTMLElement>('.home-animate').forEach((bloque) => {
    const items = obtenerItemsAnimables(bloque);

    if (items.length > 0) {
      animarAlScroll(bloque, items);
      return;
    }

    animarAlScroll(bloque, [bloque]);
  });
}

interface UseHomePageAnimationsOptions {
  listo: boolean;
}

export function useHomePageAnimations({ listo }: UseHomePageAnimationsOptions) {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const heroPlaneRef = useRef<HTMLDivElement>(null);
  const heroBadgeRef = useRef<HTMLSpanElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroSubtitleRef = useRef<HTMLParagraphElement>(null);
  const heroCtasRef = useRef<HTMLDivElement>(null);
  const heroStatsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.set([heroBadgeRef.current, heroTitleRef.current, heroSubtitleRef.current, heroCtasRef.current, heroStatsRef.current], {
        opacity: 0,
        y: 48,
      });
      gsap.set(heroPlaneRef.current, { opacity: 0, x: '-12vw', y: '38%' });
      gsap.set(headerRef.current, { opacity: 0, y: -24 });

      const entrada = gsap.timeline({ defaults: { ease: 'power3.out' } });

      entrada
        .to(headerRef.current, { opacity: 1, y: 0, duration: 0.7 })
        .fromTo(
          heroBgRef.current,
          { scale: 1.18, opacity: 0.35 },
          { scale: 1, opacity: 1, duration: 2.4, ease: 'power2.out' },
          0,
        )
        .to(heroBadgeRef.current, { opacity: 1, y: 0, duration: 0.8 }, 0.45)
        .to(heroTitleRef.current, { opacity: 1, y: 0, duration: 1 }, 0.6)
        .to(heroSubtitleRef.current, { opacity: 1, y: 0, duration: 0.8 }, 0.82)
        .to(heroCtasRef.current, { opacity: 1, y: 0, duration: 0.7 }, 1)
        .to(
          heroStatsRef.current,
          { opacity: 1, y: 0, duration: 0.9, ease: 'back.out(1.4)' },
          1.15,
        );

      gsap.fromTo(
        heroPlaneRef.current,
        { opacity: 0, x: '-12vw', y: '38%' },
        {
          opacity: 0.92,
          x: '112vw',
          y: '38%',
          duration: 16,
          ease: 'none',
          repeat: -1,
          repeatDelay: 5,
          delay: 0.5,
        },
      );

      gsap.to(heroBgRef.current, {
        scale: 1.06,
        duration: 8,
        ease: 'none',
        repeat: -1,
        yoyo: true,
      });

      if (pageRef.current) {
        configurarAnimacionesScroll(pageRef.current);
      }

      ScrollTrigger.refresh();
    }, pageRef);

    return () => ctx.revert();
  }, [listo]);

  return {
    pageRef,
    headerRef,
    heroRef,
    heroBgRef,
    heroPlaneRef,
    heroBadgeRef,
    heroTitleRef,
    heroSubtitleRef,
    heroCtasRef,
    heroStatsRef,
  };
}
