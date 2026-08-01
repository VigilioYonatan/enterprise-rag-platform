import { z } from 'zod';
import { offsetPaginationQueryDto } from '../../../../../shared/http/dto/offset-pagination-query.dto';

export const tenantScopedPaginationDto = offsetPaginationQueryDto.extend({
  tenant_id: z.uuid(),
});

export const cursorDto = z.object({
  tenant_id: z.uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type TenantScopedPaginationDto = z.output<typeof tenantScopedPaginationDto>;
export type CursorDto = z.output<typeof cursorDto>;
