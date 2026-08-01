import { z } from 'zod';

export const usageSummarySchema = z.object({
  category: z.string(),
  requests: z.number().int(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  cost_usd: z.number(),
  average_latency_ms: z.number().int(),
});

export type UsageSummarySchema = z.infer<typeof usageSummarySchema>;
