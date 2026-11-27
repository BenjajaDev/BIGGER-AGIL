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
  'Loopback Pseudo-Interface 1': [entry('127.0.0.1', { internal: true })],
  'vEthernet (WSL)': [entry('172.24.80.1')],
  'VirtualBox Host-Only Network': [entry('192.168.56.1')],
  'Wi-Fi': [entry('192.168.1.20'), entry('fe80::1', { family: 'IPv6' })],
  'Conexión de área local* 2': [entry('192.168.137.1'), entry('169.254.10.2')],
  'Radmin VPN': [entry('26.10.0.7')],
  docker0: [entry('172.17.0.1')],
};

describe('listLanAddresses', () => {
  it('puts the Wi-Fi first, then other private networks, and leaves virtual adapters out', () => {
    expect(listLanAddresses(INTERFACES)).toEqual(['192.168.1.20', '192.168.137.1']);
  });

  it('orders several real networks numerically', () => {
    expect(
      listLanAddresses({ Ethernet: [entry('192.168.0.10')], 'Wi-Fi': [entry('10.0.0.5')] }),
    ).toEqual(['10.0.0.5', '192.168.0.10']);
  });

  it('falls back to virtual adapters when there is nothing else', () => {
    expect(listLanAddresses({ 'vEthernet (Default Switch)': [entry('172.20.0.1')] })).toEqual([
      '172.20.0.1',
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
      addresses: ['http://192.168.1.20:3000', 'http://192.168.137.1:3000'],
    });
  });
});
