import { apiSuccessSchema, SystemInfoSchema } from '@bigger/shared';
import type { NetworkInterfaceInfo } from 'node:os';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { listLanAddresses } from '../src/modules/system/system.service.js';
import { createTestContext, TEST_ADMIN_PIN, type TestContext } from './helpers/test-app.js';

const entry = (
  address: string,
  overrides: { internal?: boolean; family?: 'IPv4' | 'IPv6' } = {},
): NetworkInterfaceInfo => {
  const base = {
    address,
    netmask: '255.255.255.0',
    mac: '00:00:00:00:00:00',
    internal: overrides.internal ?? false,
    cidr: `${address}/24`,
  };
  return overrides.family === 'IPv6'
    ? { ...base, family: 'IPv6', scopeid: 0 }
    : { ...base, family: 'IPv4' };
};

const INTERFACES = {
  lo: [entry('127.0.0.1', { internal: true })],
  vpn: [entry('100.64.0.7')],
  wifi: [entry('192.168.1.20'), entry('fe80::1', { family: 'IPv6' })],
  ethernet: [entry('10.0.0.5'), entry('169.254.10.2')],
  docker: [entry('172.17.0.1')],
};

describe('listLanAddresses', () => {
  it('keeps external IPv4 only, private ranges first, then in numeric order', () => {
    expect(listLanAddresses(INTERFACES)).toEqual([
      '10.0.0.5',
      '172.17.0.1',
      '192.168.1.20',
      '100.64.0.7',
    ]);
  });

  it('returns nothing for a computer without network', () => {
    expect(listLanAddresses({ lo: [entry('127.0.0.1', { internal: true })] })).toEqual([]);
  });
});

describe('GET /api/v1/admin/system/info', () => {
  let context: TestContext;
  afterEach(() => {
    context.connection.close();
  });

  it('requires an admin session', async () => {
    context = await createTestContext();
    expect((await request(context.app).get('/api/v1/admin/system/info')).status).toBe(401);
  });

  it('reports version, port and the addresses to open from other devices', async () => {
    context = await createTestContext({ networkInterfaces: INTERFACES });
    const agent = request.agent(context.app);
    await agent.post('/api/v1/admin/session').send({ pin: TEST_ADMIN_PIN }).expect(200);

    const response = await agent.get('/api/v1/admin/system/info');
    expect(response.status).toBe(200);
    expect(apiSuccessSchema(SystemInfoSchema).parse(response.body).data).toEqual({
      version: '9.9.9',
      port: 3000,
      addresses: [
        'http://10.0.0.5:3000',
        'http://172.17.0.1:3000',
        'http://192.168.1.20:3000',
        'http://100.64.0.7:3000',
      ],
    });
  });
});
