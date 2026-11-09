import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, HTTP_STATUS } from '../config/constants.js';
import { sessionStore } from '../storage/sessionStore.js';
import { ApiError } from './ApiError.js';
import { httpClient, request } from './httpClient.js';

const originalAdapter = httpClient.defaults.adapter;

function respondWith(status, data) {
  httpClient.defaults.adapter = vi.fn(async (config) => {
    const response = { status, data, config, headers: {}, statusText: '' };
    if (status >= HTTP_STATUS.BAD_REQUEST) {
      const error = new Error('request failed');
      error.isAxiosError = true;
      error.response = response;
      throw error;
    }
    return response;
  });
}

beforeEach(() => sessionStore.write({ accessToken: 'token-123' }));
afterEach(() => {
  httpClient.defaults.adapter = originalAdapter;
});

describe('http client', () => {
  it('sends the stored bearer token', async () => {
    respondWith(200, { ok: true });
    await request({ method: 'get', url: '/auth/me' });
    expect(httpClient.defaults.adapter.mock.calls[0][0].headers.Authorization).toBe(
      'Bearer token-123',
    );
  });

  it('unwraps the response body', async () => {
    respondWith(200, { hello: 'world' });
    await expect(request({ method: 'get', url: '/x' })).resolves.toEqual({ hello: 'world' });
  });

  it('clears the session and notifies listeners on a 401', async () => {
    const listener = vi.fn();
    const unsubscribe = sessionStore.subscribe(listener);
    respondWith(HTTP_STATUS.UNAUTHORIZED, {
      error: { code: 'UNAUTHENTICATED', message: 'Expired' },
    });

    await expect(request({ method: 'get', url: '/orders' })).rejects.toBeInstanceOf(ApiError);
    expect(sessionStore.read()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('keeps the session after other errors and exposes code, message and fields', async () => {
    respondWith(HTTP_STATUS.BAD_REQUEST, {
      error: {
        code: ERROR_CODE.VALIDATION_FAILED,
        message: 'Request validation failed',
        details: [{ path: 'email', message: 'Enter a valid email address' }],
      },
    });
    const error = await request({ method: 'post', url: '/auth/register' }).catch((e) => e);

    expect(sessionStore.read()).not.toBeNull();
    expect(error).toMatchObject({ status: 400, code: ERROR_CODE.VALIDATION_FAILED });
    expect(error.fieldErrors()).toEqual({ email: 'Enter a valid email address' });
  });

  it('turns a missing response into a readable network error', async () => {
    httpClient.defaults.adapter = vi.fn(async () => {
      const error = new Error('Network Error');
      error.isAxiosError = true;
      throw error;
    });
    const error = await request({ method: 'get', url: '/x' }).catch((e) => e);
    expect(error.code).toBe(ERROR_CODE.NETWORK);
    expect(error.message).toMatch(/cannot reach the server/i);
  });
});
