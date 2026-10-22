/** Today in the device's calendar as `YYYY-MM-DD` (the shop's tablets run in its time zone). */
export function localToday(now = new Date()): string {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
