import type { CrudRepository, Page, QueryParams } from '../../domain/ports/CrudRepository';
import { unwrapList, type ListResponseDto } from '../../application/dtos/common.dto';
import { axiosClient } from '../http/axios-client';
import { parseApiError } from '../http/api-error';

export class AxiosCrudRepository<T, TInput> implements CrudRepository<T, TInput> {
  protected readonly endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async list(params?: QueryParams): Promise<T[]> {
    try {
      const { data } = await axiosClient.get<ListResponseDto<T>>(this.endpoint, { params });
      return unwrapList(data);
    } catch (error) {
      throw parseApiError(error, 'No se pudo cargar la lista');
    }
  }

  async listPage(params?: QueryParams): Promise<Page<T>> {
    try {
      const { data } = await axiosClient.get<ListResponseDto<T>>(this.endpoint, { params });
      if (Array.isArray(data)) {
        return { items: data, count: data.length, hasNext: false, hasPrevious: false };
      }
      const items = data.results ?? [];
      return {
        items,
        count: data.count ?? items.length,
        hasNext: Boolean(data.next),
        hasPrevious: Boolean(data.previous),
      };
    } catch (error) {
      throw parseApiError(error, 'No se pudo cargar la lista');
    }
  }

  async getById(id: number): Promise<T> {
    try {
      const { data } = await axiosClient.get<T>(`${this.endpoint}${id}/`);
      return data;
    } catch (error) {
      throw parseApiError(error, 'No se pudo cargar el registro');
    }
  }

  async create(input: TInput): Promise<T> {
    try {
      const { data } = await axiosClient.post<T>(this.endpoint, input);
      return data;
    } catch (error) {
      throw parseApiError(error, 'No se pudo crear el registro');
    }
  }

  async update(id: number, input: Partial<TInput>): Promise<T> {
    try {
      const { data } = await axiosClient.patch<T>(`${this.endpoint}${id}/`, input);
      return data;
    } catch (error) {
      throw parseApiError(error, 'No se pudo actualizar el registro');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await axiosClient.delete(`${this.endpoint}${id}/`);
    } catch (error) {
      throw parseApiError(error, 'No se pudo eliminar el registro');
    }
  }
}
