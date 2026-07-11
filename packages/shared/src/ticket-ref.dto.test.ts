import { describe, expect, it } from 'vitest';
import { ticketRefSchema } from './ticket-ref.dto';

describe('ticketRefSchema', () => {
  it('accepts a valid ticket reference', () => {
    const result = ticketRefSchema.parse({
      glpiTicketId: 42,
      status: 'New',
      url: 'https://glpi.example.com/front/ticket.form.php?id=42',
      createdAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
    });
    expect(result.glpiTicketId).toBe(42);
    expect(result.status).toBe('New');
  });

  it('rejects a non-numeric glpiTicketId', () => {
    expect(() =>
      ticketRefSchema.parse({
        glpiTicketId: '42',
        status: 'New',
        url: 'https://glpi.example.com/front/ticket.form.php?id=42',
        createdAt: '2026-07-10T00:00:00.000Z',
        updatedAt: '2026-07-10T00:00:00.000Z',
      }),
    ).toThrow();
  });
});
