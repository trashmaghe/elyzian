import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './health.dto';

describe('healthResponseSchema', () => {
  it('accepts a valid health response', () => {
    const result = healthResponseSchema.parse({
      status: 'ok',
      uptime: 42,
      timestamp: new Date().toISOString(),
    });
    expect(result.status).toBe('ok');
  });

  it('rejects an invalid status value', () => {
    expect(() =>
      healthResponseSchema.parse({ status: 'unknown', uptime: 1, timestamp: '2026-01-01' }),
    ).toThrow();
  });
});
