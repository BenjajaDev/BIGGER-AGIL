import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from './helpers/test-app.js';

let webDir: string;
let context: TestContext;

beforeAll(async () => {
  webDir = mkdtempSync(join(tmpdir(), 'bigger-web-'));
  mkdirSync(join(webDir, 'assets'));
  writeFileSync(join(webDir, 'index.html'), '<!doctype html><title>BIGGER</title>');
  writeFileSync(join(webDir, 'assets', 'app-abc123.js'), 'console.log(1)');
  writeFileSync(join(webDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  context = await createTestContext({ webDistDir: webDir });
});

afterAll(() => {
  context.connection.close();
  rmSync(webDir, { recursive: true, force: true });
});

describe('serving the web app (WEB_DIST_DIR)', () => {
  it('serves index.html at / without caching it', async () => {
    const response = await request(context.app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('<title>BIGGER</title>');
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('caches fingerprinted assets for a year', async () => {
    const response = await request(context.app).get('/assets/app-abc123.js');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('revalidates other static files such as the favicon', async () => {
    const response = await request(context.app).get('/favicon.svg');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it.each(['/mesas', '/mesas/0b8f7c6e', '/configuracion/equipos', '/carta'])(
    'falls back to index.html for the app route %s',
    async (path) => {
      const response = await request(context.app).get(path).set('Accept', 'text/html');
      expect(response.status).toBe(200);
      expect(response.text).toContain('<title>BIGGER</title>');
    },
  );

  it('does not shadow API responses', async () => {
    const found = await request(context.app).get('/api/v1/health');
    expect(found.status).toBe(200);
    expect(found.headers['content-type']).toMatch(/json/);

    const missing = await request(context.app).get('/api/v1/nope').set('Accept', 'text/html');
    expect(missing.status).toBe(404);
    expect(missing.headers['content-type']).toMatch(/json/);
    expect(missing.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('keeps a missing asset a 404 and never answers non-GET with the page', async () => {
    expect((await request(context.app).get('/assets/viejo-123.js')).status).toBe(404);
    expect((await request(context.app).post('/mesas')).status).toBe(404);
    expect(
      (await request(context.app).get('/mesas').set('Accept', 'application/json')).status,
    ).toBe(404);
  });

  it('allows http assets (no upgrade-insecure-requests in the CSP)', async () => {
    const response = await request(context.app).get('/');
    expect(response.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
  });
});

describe('without WEB_DIST_DIR', () => {
  let plain: TestContext;
  afterEach(() => {
    plain.connection.close();
  });

  it('answers unknown paths with the JSON 404, not a page', async () => {
    plain = await createTestContext();
    const response = await request(plain.app).get('/mesas').set('Accept', 'text/html');
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/json/);
  });
});
