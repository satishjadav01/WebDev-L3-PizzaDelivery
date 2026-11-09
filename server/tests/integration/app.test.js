import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ERROR_CODE, HTTP_STATUS } from '../../src/constants/index.js';
import { createTestApp } from '../helpers/testApp.js';

const { app, config } = createTestApp();
const apiBase = `${config.app.api.prefix}/${config.app.api.version}`;

describe('http foundation', () => {
  it('reports 503 on /health while the database is not connected', async () => {
    const res = await request(app).get(`${apiBase}/health`);
    expect(res.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
    expect(res.body.checks.database).toBe('down');
  });

  it('echoes a generated request id header', async () => {
    const res = await request(app).get(`${apiBase}/health`);
    expect(res.headers[config.security.requestIdHeader]).toBeTruthy();
  });

  it('keeps a caller supplied request id', async () => {
    const res = await request(app)
      .get(`${apiBase}/health`)
      .set(config.security.requestIdHeader, 'trace-abc');
    expect(res.headers[config.security.requestIdHeader]).toBe('trace-abc');
  });

  it('returns the uniform error shape for unknown routes', async () => {
    const res = await request(app).get(`${apiBase}/nope`);
    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(res.body.error).toMatchObject({ code: ERROR_CODE.NOT_FOUND });
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('turns unparsable JSON into a 400 instead of a 500', async () => {
    const res = await request(app)
      .post(`${apiBase}/health`)
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body.error.code).toBe(ERROR_CODE.MALFORMED_REQUEST);
  });

  it('sends security headers and hides the framework', async () => {
    const res = await request(app).get(`${apiBase}/health`);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
