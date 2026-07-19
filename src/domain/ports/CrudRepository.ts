export type QueryParams = Record<string, string | number | boolean>;

export interface Page<T> {
  items: T[];
  count: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CrudRepository<T, TInput> {
  list(params?: QueryParams): Promise<T[]>;
  listPage(params?: QueryParams): Promise<Page<T>>;
  getById(id: number): Promise<T>;
  create(input: TInput): Promise<T>;
  update(id: number, input: Partial<TInput>): Promise<T>;
  remove(id: number): Promise<void>;
}
