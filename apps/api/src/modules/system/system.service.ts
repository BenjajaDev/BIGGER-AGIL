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

/**
 * Adapters no tablet can reach: Hyper-V/WSL, VirtualBox, VMware, Docker, VPNs and similar. On
 * Windows they carry private addresses too (172.x, 192.168.56.x), so the range alone is not enough.
 */
const VIRTUAL_ADAPTER =
  /vethernet|virtualbox|vbox|vmware|vmnet|hyper-?v|wsl|docker|br-|veth|virbr|loopback|bluetooth|tailscale|zerotier|vpn|\btap|\btun|utun|wireguard|wintun|hamachi/i;

/** The shop's Wi-Fi or cable, by the names Windows, macOS and Linux give them. */
const LAN_ADAPTER = /wi-?fi|wlan|wireless|inal[aá]mbrica|ethernet|^en\d|^eth\d|^wl/i;

interface Candidate {
  address: string;
  rank: number;
}

function rankOf(adapter: string, address: string): number {
  if (VIRTUAL_ADAPTER.test(adapter)) return 3;
  if (!isPrivateIPv4(address)) return 2;
  return LAN_ADAPTER.test(adapter) ? 0 : 1;
}

function compareCandidates(left: Candidate, right: Candidate): number {
  if (left.rank !== right.rank) return left.rank - right.rank;
  const a = octets(left.address);
  const b = octets(right.address);
  for (let index = 0; index < 4; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/**
 * Addresses other devices can open this computer at: the Wi-Fi or cable first. Virtual adapters
 * are left out whenever a real one exists, so the first QR on screen is the one that works.
 */
export function listLanAddresses(interfaces: NetworkInterfaces): string[] {
  const best = new Map<string, number>();
  for (const [adapter, entries] of Object.entries(interfaces)) {
    for (const entry of entries ?? []) {
      // Older Node versions report the family as the number 4.
      const isIPv4 = entry.family === 'IPv4' || (entry.family as string | number) === 4;
      // 169.254.x.x is what Windows assigns when it found no network: nobody can reach it.
      if (isIPv4 && !entry.internal && !entry.address.startsWith('169.254.')) {
        const rank = rankOf(adapter, entry.address);
        best.set(entry.address, Math.min(rank, best.get(entry.address) ?? rank));
      }
    }
  }
  const candidates = [...best].map(([address, rank]) => ({ address, rank }));
  const hasReal = candidates.some((candidate) => candidate.rank < 3);
  return candidates
    .filter((candidate) => !hasReal || candidate.rank < 3)
    .sort(compareCandidates)
    .map((candidate) => candidate.address);
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
