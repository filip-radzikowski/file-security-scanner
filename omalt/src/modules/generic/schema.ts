import { z } from 'zod';

/** Placeholder payload for module types that don't have a dedicated dashboard yet. */
export const genericPayloadSchema = z.record(z.string(), z.unknown());
export type GenericPayload = z.infer<typeof genericPayloadSchema>;
