export interface PaginatedResponseDto<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type ListResponseDto<T> = T[] | Partial<PaginatedResponseDto<T>>;

export function unwrapList<T>(data: ListResponseDto<T>): T[] {
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}
