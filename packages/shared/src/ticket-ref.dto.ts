import { z } from 'zod';

export const ticketRefSchema = z.object({
  glpiTicketId: z.number(),
  status: z.string(),
  url: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TicketRef = z.infer<typeof ticketRefSchema>;
