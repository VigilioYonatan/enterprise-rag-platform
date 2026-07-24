import { z } from 'zod';

export const actorProfileSchema = z.object({
  sub: z.string().min(1),
  email: z.string().nullable(),
});

export type ActorProfileSchema = z.infer<typeof actorProfileSchema>;
