import { z } from 'zod';

export const paginatorMetaDto = z.object({
  count: z.number().int().nonnegative(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});

export const createPaginatorDto = <T extends z.ZodType>(item_schema: T) =>
  paginatorMetaDto.extend({
    results: z.array(item_schema),
  });

export interface PaginatedPayload<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BuildPaginatedOptions<T> {
  path: string;
  results: T[];
  count: number;
  limit: number;
  offset: number;
  extraQuery?: Record<string, string | undefined>;
}

export function buildPaginatedPayload<T>(options: BuildPaginatedOptions<T>): PaginatedPayload<T>;
export function buildPaginatedPayload<T>(
  base_path: string,
  results: T[],
  count: number,
  limit: number,
  offset: number,
  extra_params?: Record<string, string | undefined>,
): PaginatedPayload<T>;
export function buildPaginatedPayload<T>(
  first: string | BuildPaginatedOptions<T>,
  resultsArg?: T[],
  countArg?: number,
  limitArg?: number,
  offsetArg?: number,
  extraParamsArg: Record<string, string | undefined> = {},
): PaginatedPayload<T> {
  let base_path: string;
  let results: T[];
  let count: number;
  let limit: number;
  let offset: number;
  let extra_params: Record<string, string | undefined>;

  if (typeof first === 'object') {
    base_path = first.path;
    results = first.results;
    count = first.count;
    limit = first.limit;
    offset = first.offset;
    extra_params = first.extraQuery ?? {};
  } else {
    base_path = first;
    results = resultsArg ?? [];
    count = countArg ?? 0;
    limit = limitArg ?? 50;
    offset = offsetArg ?? 0;
    extra_params = extraParamsArg;
  }

  const buildUrl = (target_offset: number): string => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(extra_params)) {
      if (v !== undefined && v !== '') {
        search.set(k, v);
      }
    }
    search.set('limit', String(limit));
    search.set('offset', String(target_offset));
    return `${base_path}?${search.toString()}`;
  };

  const next = offset + limit < count ? buildUrl(offset + limit) : null;
  const previous = offset > 0 ? buildUrl(Math.max(0, offset - limit)) : null;
  return { count, next, previous, results };
}
