import { describe, expect, it } from 'vitest';
import { resolveTransport } from './printer-transport.js';

describe('resolveTransport', () => {
  it.each(['COM5', 'com12', '\\\\.\\COM10', '/dev/rfcomm0', '/dev/ttyUSB0', '/dev/ttyACM1'])(
    'uses the serial port for %s',
    (path) => {
      expect(resolveTransport(path, 'auto')).toBe('serial');
    },
  );

  it.each(['/dev/usb/lp0', '\\\\localhost\\POS58', '/tmp/ticket.bin'])(
    'writes straight to %s',
    (path) => {
      expect(resolveTransport(path, 'auto')).toBe('path');
    },
  );

  it('lets the shop force a transport', () => {
    expect(resolveTransport('COM5', 'path')).toBe('path');
    expect(resolveTransport('/dev/usb/lp0', 'serial')).toBe('serial');
  });
});
