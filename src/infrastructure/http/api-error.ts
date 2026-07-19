import axios from 'axios';
import { ApiException } from '../../domain/exceptions/ApiException';

function extraerDetalle(data: unknown): string | null {
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  for (const key of ['detail', 'error', 'message']) {
    const valor = record[key];
    if (typeof valor === 'string') return valor;
  }

  const partes: string[] = [];
  for (const [campo, valor] of Object.entries(record)) {
    if (typeof valor === 'string') {
      partes.push(`${campo}: ${valor}`);
    } else if (Array.isArray(valor) && valor.every((v) => typeof v === 'string')) {
      partes.push(`${campo}: ${valor.join(' ')}`);
    }
  }
  return partes.length > 0 ? partes.join(' | ') : null;
}

export function parseApiError(error: unknown, fallback: string): ApiException {
  if (error instanceof ApiException) return error;
  if (axios.isAxiosError(error)) {
    const detalle = extraerDetalle(error.response?.data);
    return new ApiException(detalle ?? fallback, error.response?.status ?? null);
  }
  return new ApiException(fallback);
}
