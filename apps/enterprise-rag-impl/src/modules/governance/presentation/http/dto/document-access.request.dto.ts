import { z } from 'zod';
import { MAX_DOCUMENT_GROUP_GRANTS, MAX_DOCUMENT_USER_GRANTS } from '../../../const/governance.const';

export const replaceAccessRequestDto = z
  .object({
    user_subs: z.array(z.string().min(1).max(255)).max(MAX_DOCUMENT_USER_GRANTS),
  })
  .strict();

export const groupGrantsRequestDto = z
  .object({
    group_ids: z.array(z.uuid()).max(MAX_DOCUMENT_GROUP_GRANTS),
  })
  .strict();

export type ReplaceAccessRequestDto = z.output<typeof replaceAccessRequestDto>;
export type GroupGrantsRequestDto = z.output<typeof groupGrantsRequestDto>;
