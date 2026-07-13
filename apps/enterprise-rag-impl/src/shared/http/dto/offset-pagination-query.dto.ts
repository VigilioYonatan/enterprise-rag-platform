import { z } from 'zod';

const unsigned_query_integer = z
  .union([
    z.number().int().nonnegative(),
    z
      .string()
      .regex(/^(0|[1-9]\d*)$/)
      .transform(Number),
  ])
  .pipe(z.number().int().safe().nonnegative());

export const offsetPaginationQueryDto = z
  .object({
    limit: unsigned_query_integer.pipe(z.number().min(1).max(100)).default(50),
    offset: unsigned_query_integer.default(0),
  })
  .strict();

export type OffsetPaginationQueryDto = z.output<typeof offsetPaginationQueryDto>;
