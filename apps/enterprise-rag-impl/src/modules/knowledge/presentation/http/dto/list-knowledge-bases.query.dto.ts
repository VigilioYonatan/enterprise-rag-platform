import { z } from 'zod';
import { offsetPaginationQueryDto } from '../../../../../shared/http/dto/offset-pagination-query.dto';

export const listKnowledgeBasesQueryDto = offsetPaginationQueryDto.extend({
  tenant_id: z.uuid(),
});

export type ListKnowledgeBasesQueryDto = z.output<typeof listKnowledgeBasesQueryDto>;
