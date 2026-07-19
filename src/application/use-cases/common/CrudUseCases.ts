import type { CrudRepository, Page, QueryParams } from '../../../domain/ports/CrudRepository';

export class CrudUseCases<T, TInput> {
  protected readonly repository: CrudRepository<T, TInput>;

  constructor(repository: CrudRepository<T, TInput>) {
    this.repository = repository;
  }

  getAll(params?: QueryParams): Promise<T[]> {
    return this.repository.list(params);
  }

  getPage(params?: QueryParams): Promise<Page<T>> {
    return this.repository.listPage(params);
  }

  getById(id: number): Promise<T> {
    return this.repository.getById(id);
  }

  create(input: TInput): Promise<T> {
    return this.repository.create(input);
  }

  update(id: number, input: Partial<TInput>): Promise<T> {
    return this.repository.update(id, input);
  }

  remove(id: number): Promise<void> {
    return this.repository.remove(id);
  }
}
