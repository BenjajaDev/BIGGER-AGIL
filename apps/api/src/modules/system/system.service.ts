import type { SystemInfo } from '@bigger/shared';
import type { NetworkInterfaceInfo } from 'node:os';

export type NetworkInterfaces = Record<string, readonly NetworkInterfaceInfo[] | undefined>;

export interface SystemInfoSource {
  version: string;
  port: number;
  /** `os.networkInterfaces` in production; injected so tests do not depend on the machine. */
  networkInterfaces: () => NetworkInterfaces;
}

function octets(address: string): number[] {
  return address.split('.').map(Number);
}

/** 10.x, 172.16–31.x and 192.168.x: the Wi-Fi of a shop, as opposed to a VPN or a public IP. */
export function isPrivateIPv4(address: string): boolean {
  const [a = 0, b = 0] = octets(address);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function compareAddresses(left: string, right: string): number {
  const byPrivacy = Number(isPrivateIPv4(right)) - Number(isPrivateIPv4(left));
  if (byPrivacy !== 0) return byPrivacy;
  const a = octets(left);
  const b = octets(right);
  for (let index = 0; index < 4; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/** Non-internal IPv4 addresses of this computer, private ranges first, then numerically. */
export function listLanAddresses(interfaces: NetworkInterfaces): string[] {
  const found = new Set<string>();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      // Older Node versions report the family as the number 4.
      const isIPv4 = entry.family === 'IPv4' || (entry.family as string | number) === 4;
      // 169.254.x.x is what Windows assigns when it found no network: nobody can reach it.
      if (isIPv4 && !entry.internal && !entry.address.startsWith('169.254.')) {
        found.add(entry.address);
      }
    }
  }
  return [...found].sort(compareAddresses);
}

export class SystemService {
  constructor(private readonly source: SystemInfoSource) {}

  info(): SystemInfo {
    const { version, port, networkInterfaces } = this.source;
    return {
      version,
      port,
      addresses: listLanAddresses(networkInterfaces()).map(
        (address) => `http://${address}:${port}`,
      ),
    };
  }
}
