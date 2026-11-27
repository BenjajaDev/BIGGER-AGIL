/**
 * Copies text to the clipboard. `navigator.clipboard` only exists on https or localhost, and the
 * installed system is opened over plain http on the local network, so there is a fallback.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator.clipboard === 'object') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Falls through to the selection-based copy.
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  try {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the only copy that works over http
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
