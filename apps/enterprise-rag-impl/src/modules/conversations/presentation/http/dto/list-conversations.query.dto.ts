import { z } from 'zod';
import { offsetPaginationQueryDto } from '../../../../../shared/http/dto/offset-pagination-query.dto';

export const listConversationsQueryDto = offsetPaginationQueryDto.extend({
  knowledge_base_id: z.uuid().optional(),
});

export type ListConversationsQueryDto = z.output<typeof listConversationsQueryDto>;
