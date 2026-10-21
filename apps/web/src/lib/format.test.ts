import {
  formatClockTime,
  formatClp,
  formatClpSpoken,
  formatElapsed,
  minutesSince,
  pluralize,
} from './format';

describe('formatClp', () => {
  it('formats Chilean pesos with thousands separator', () => {
    expect(formatClp(3200)).toBe('$\u00a03.200');
    expect(formatClp(1284000)).toBe('$\u00a01.284.000');
  });
});

describe('formatClpSpoken', () => {
  it('produces a screen-reader friendly price', () => {
    expect(formatClpSpoken(3200)).toBe('3.200 pesos');
  });
});

describe('elapsed time', () => {
  const now = new Date('2026-10-21T12:12:30.000Z');

  it('counts whole minutes and never goes negative', () => {
    expect(minutesSince('2026-10-21T12:00:00.000Z', now)).toBe(12);
    expect(minutesSince('2026-10-21T12:20:00.000Z', now)).toBe(0);
  });

  it('describes recent and older orders', () => {
    expect(formatElapsed('2026-10-21T12:12:00.000Z', now)).toBe('recién');
    expect(formatElapsed('2026-10-21T12:06:00.000Z', now)).toBe('hace 6 min');
  });
});

describe('pluralize', () => {
  it('chooses singular or plural', () => {
    expect(pluralize(1, 'producto', 'productos')).toBe('1 producto');
    expect(pluralize(3, 'producto', 'productos')).toBe('3 productos');
  });
});

describe('formatClockTime', () => {
  it('uses the 24-hour clock the team reads in the shop', () => {
    const afternoon = new Date(2026, 9, 21, 17, 5).toISOString();
    expect(formatClockTime(afternoon)).toBe('17:05');
  });
});
