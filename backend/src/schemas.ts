import { z } from "zod";

export const EventSchema = z.object({
  externalId: z.string().min(1),
  type: z.string().min(1),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
  deviceId: z.string().min(1),
  payload: z.record(z.any()),
  publishedAt: z.string().datetime(),
});

export type EventInput = z.infer<typeof EventSchema>;