import type { Promocion } from '../entities/Promocion';

// Una promoción es utilizable si está activa Y dentro de su ventana de fechas.
// (El flag `activa` por sí solo no basta: puede quedar en true tras vencer.)
export function promocionVigente(promocion: Promocion): boolean {
  if (!promocion.activa) return false;
  const ahora = Date.now();
  const inicio = new Date(`${promocion.fecha_inicio}T00:00:00`).getTime();
  const fin = new Date(`${promocion.fecha_fin}T23:59:59`).getTime();
  if (!Number.isNaN(inicio) && inicio > ahora) return false;
  if (!Number.isNaN(fin) && fin < ahora) return false;
  return true;
}

// Descuento como porcentaje 0-100 saneado.
export function porcentajeDescuento(promocion: Promocion): number {
  const pct = Number(promocion.descuento);
  if (Number.isNaN(pct) || pct <= 0) return 0;
  return Math.min(pct, 100);
}
