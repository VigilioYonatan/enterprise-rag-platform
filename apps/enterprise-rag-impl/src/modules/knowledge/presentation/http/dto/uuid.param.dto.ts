import { z } from 'zod';

export const uuidParamDto = z.object({ id: z.uuid() });
export type UuidParamDto = z.output<typeof uuidParamDto>;
