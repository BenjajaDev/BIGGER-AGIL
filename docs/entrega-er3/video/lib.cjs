const BASE = 'http://localhost:5173';
// Visible cursor + click ripple: Playwright videos do not draw the real pointer.
const CURSOR = `
(() => {
  const install = () => {
    if (document.getElementById('__cursor')) return;
    const c = document.createElement('div');
    c.id = '__cursor';
    Object.assign(c.style, {position:'fixed',left:'-40px',top:'-40px',width:'26px',height:'26px',zIndex:2147483647,pointerEvents:'none',
      transform:'translate(-4px,-2px)',transition:'transform 120ms ease'});
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.6 L12 13.8 L19 13.8 Z" fill="#1e1e1e" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', e => {
      c.style.transform = 'translate(-4px,-2px) scale(0.85)';
      const r = document.createElement('div');
      Object.assign(r.style, {position:'fixed',left:(e.clientX-22)+'px',top:(e.clientY-22)+'px',width:'44px',height:'44px',borderRadius:'50%',
        background:'rgba(192,39,45,0.35)',zIndex:2147483646,pointerEvents:'none',transition:'transform 450ms ease-out, opacity 450ms ease-out'});
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(1.8)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 500);
    }, true);
    addEventListener('mouseup', () => { c.style.transform = 'translate(-4px,-2px)'; }, true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', install); else install();
})();`;

let pos = { x: 960, y: 540 };
async function moveTo(page, locator, opts = {}) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('sin caja: ' + locator);
  const x = box.x + box.width * (opts.fx ?? 0.5),
    y = box.y + box.height * (opts.fy ?? 0.5);
  await page.mouse.move(x, y, { steps: opts.steps ?? 25 });
  pos = { x, y };
}
async function click(page, locator, opts = {}) {
  await moveTo(page, locator, opts);
  await page.waitForTimeout(opts.pause ?? 250);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
  await page.waitForTimeout(opts.after ?? 600);
}
async function smoothScroll(page, dy, ms = 1200) {
  const steps = Math.max(1, Math.round(ms / 30));
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await page.waitForTimeout(30);
  }
}
module.exports = { BASE, CURSOR, moveTo, click, smoothScroll };
