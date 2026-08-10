import { describe, expect, it } from 'vitest';
import authConfig from '@/auth.config';

describe('authentication route policy', () => {
  it('lets the notification endpoint perform its own bearer-token check', async () => {
    const authorized = authConfig.callbacks?.authorized;
    expect(authorized).toBeTypeOf('function');

    const result = await authorized!({
      auth: null,
      request: {
        nextUrl: { pathname: '/api/notifications/run' },
      },
    } as never);

    expect(result).toBe(true);
  });
});
