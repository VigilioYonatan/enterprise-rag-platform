import { z } from 'zod';
import { createPaginatorDto } from '../../../../../shared/http/dto/paginator.dto';
import { conversationSchema } from '../../../domain/schemas/conversation.schema';
import { conversationCitationSchema } from '../../../domain/schemas/conversation-citation.schema';
import { conversationMessageSchema } from '../../../domain/schemas/conversation-message.schema';

export const conversationSummaryResponseDto = conversationSchema.pick({
  id: true,
  knowledge_base_id: true,
  tenant_id: true,
  title: true,
  created_at: true,
});

export const conversationCitationResponseDto = conversationCitationSchema.pick({
  id: true,
  message_id: true,
  document_id: true,
  chunk_id: true,
  reference_index: true,
  index: true,
  document_version: true,
  title: true,
});

export const conversationMessageResponseDto = conversationMessageSchema
  .pick({
    id: true,
    role: true,
    content: true,
    abstained: true,
    created_at: true,
  })
  .extend({
    citations: z.array(conversationCitationResponseDto),
  });

export const conversationDetailResponseDto = conversationSchema
  .pick({
    id: true,
    knowledge_base_id: true,
    title: true,
    created_at: true,
  })
  .extend({
    messages: z.array(conversationMessageResponseDto),
  });

export const conversationTurnResponseDto = z.object({
  user_message_id: z.uuid(),
  assistant_message_id: z.uuid(),
  answer: z.string(),
  abstained: z.boolean(),
  citations: z.array(conversationCitationResponseDto),
});

export const resolvedCitationResponseDto = conversationCitationSchema
  .pick({
    id: true,
    document_id: true,
    chunk_id: true,
    document_version: true,
    title: true,
  })
  .extend({
    reference_index: z.number().int(),
    content: z.string(),
  });

export const deletedConversationResponseDto = z.object({
  deleted: z.boolean(),
});

export const paginatedConversationsResponseDto = createPaginatorDto(conversationSummaryResponseDto);

export type ConversationSummaryResponseDto = z.output<typeof conversationSummaryResponseDto>;
export type ConversationCitationResponseDto = z.output<typeof conversationCitationResponseDto>;
export type ConversationMessageResponseDto = z.output<typeof conversationMessageResponseDto>;
export type ConversationDetailResponseDto = z.output<typeof conversationDetailResponseDto>;
export type ConversationTurnResponseDto = z.output<typeof conversationTurnResponseDto>;
export type ResolvedCitationResponseDto = z.output<typeof resolvedCitationResponseDto>;
export type DeletedConversationResponseDto = z.output<typeof deletedConversationResponseDto>;
export type PaginatedConversationsResponseDto = z.output<typeof paginatedConversationsResponseDto>;
