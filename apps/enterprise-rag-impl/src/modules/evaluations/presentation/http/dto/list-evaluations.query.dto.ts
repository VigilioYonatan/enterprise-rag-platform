import { z } from 'zod';
import { offsetPaginationQueryDto } from '../../../../../shared/http/dto/offset-pagination-query.dto';

export const listEvaluationsQueryDto = offsetPaginationQueryDto.extend({
  tenant_id: z.uuid(),
});

export type ListEvaluationsQueryDto = z.output<typeof listEvaluationsQueryDto>;
