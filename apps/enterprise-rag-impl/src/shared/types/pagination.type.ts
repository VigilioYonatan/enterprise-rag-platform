export interface PaginationWindow {
  limit: number;
  offset: number;
}

export interface CountedRows<T> {
  count: number;
  results: T[];
}
