const { chromium } = require('playwright');
const fs = require('fs');
const { BASE, CURSOR, moveTo, click, smoothScroll } = require('./lib.cjs');
const OUT = __dirname + '/raw';
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2];
const PIN = process.env.VIDEO_PIN;
if (!PIN) throw new Error('Define VIDEO_PIN con el PIN de Configuración del entorno local');
const marks = fs.existsSync(OUT + '/marks.json')
  ? JSON.parse(fs.readFileSync(OUT + '/marks.json'))
  : {};

async function scene(browser, name, size, fn) {
  if (only && only !== name) return;
  const ctx = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
    storageState: __dirname + '/state.json',
    recordVideo: { dir: OUT + '/' + name, size },
  });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const mark = () => {
    marks[name] = (Date.now() - t0) / 1000;
  };
  await page.mouse.move(size.width * 0.6, size.height * 0.6);
  await fn(page, mark);
  const video = page.video();
  await ctx.close();
  fs.renameSync(await video.path(), `${OUT}/${name}.webm`);
  fs.rmSync(OUT + '/' + name, { recursive: true, force: true });
  console.log(name, 'listo, inicio', marks[name]);
}

(async () => {
  const browser = await chromium.launch();
  // Sesión de encargado una sola vez.
  {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(BASE + '/configuracion');
    const pin = p.locator('input[type=password], input[inputmode=numeric]').first();
    await pin.waitFor();
    await pin.fill(PIN);
    await pin.press('Enter');
    await p.waitForTimeout(1200);
    await ctx.storageState({ path: __dirname + '/state.json' });
    const tables = await (await p.request.get(BASE + '/api/v1/tables')).json();
    const qr = await (await p.request.get(BASE + '/api/v1/admin/tables/qr')).json();
    fs.writeFileSync(
      __dirname + '/ids.json',
      JSON.stringify({ tables: tables.data, qr: qr.data }, null, 1),
    );
    await ctx.close();
  }
  const ids = JSON.parse(fs.readFileSync(__dirname + '/ids.json'));
  const table = (label) => ids.tables.find((t) => t.label === label);
  const D = { width: 1600, height: 900 };

  await scene(browser, 's3', D, async (page, mark) => {
    await page.goto(BASE + '/');
    await page.getByText('Resumen de hoy').waitFor();
    await page.waitForTimeout(800);
    mark();
    await page.waitForTimeout(1200);
    await moveTo(page, page.getByText('Mesa 8 está listo'));
    await page.waitForTimeout(1200);
    await moveTo(page, page.getByText('Por cobrar', { exact: true }).last());
    await page.waitForTimeout(1000);
    await smoothScroll(page, 420, 1600);
    await page.waitForTimeout(2500);
  });

  await scene(browser, 's4', D, async (page, mark) => {
    await page.goto(BASE + '/pedido');
    await page.getByText('¿Para quién es el pedido?').waitFor();
    await page.waitForTimeout(700);
    mark();
    await page.waitForTimeout(500);
    await click(page, page.getByRole('link', { name: /^Mesa 3,/ }), { after: 1200 });
    await click(page, page.getByRole('button', { name: /^Agregar Chacarero/ }), { after: 700 });
    await click(page, page.getByRole('button', { name: /^Agregar Chacarero/ }), { after: 700 });
    await click(page, page.getByRole('button', { name: /^Agregar Italiano/ }), { after: 900 });
    await page.waitForTimeout(500);
    await click(page, page.getByRole('button', { name: 'Enviar a cocina' }), { after: 2600 });
  });

  await scene(browser, 's5', D, async (page, mark) => {
    await page.goto(BASE + '/cocina');
    await page.getByText('Nuevos').first().waitFor();
    await page.waitForTimeout(700);
    mark();
    await page.waitForTimeout(600);
    const ticket = page
      .locator('article, li')
      .filter({ hasText: 'Mesa 3' })
      .filter({ has: page.getByRole('button', { name: /Empezar/ }) })
      .last();
    await click(page, ticket.getByRole('button', { name: /Empezar/ }), { after: 1500 });
    const ticket2 = page
      .locator('article, li')
      .filter({ hasText: 'Mesa 3' })
      .filter({ has: page.getByRole('button', { name: /Marcar listo/ }) })
      .last();
    await click(page, ticket2.getByRole('button', { name: /Marcar listo/ }), { after: 2600 });
  });

  await scene(browser, 's6', D, async (page, mark) => {
    await page.goto(BASE + '/mesas/' + table('Mesa 4').id);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    mark();
    await page.waitForTimeout(800);
    await click(page, page.getByRole('button', { name: /^Cobrar/ }).first(), { after: 1200 });
    await click(page, page.getByRole('radio', { name: 'Partes iguales' }), { after: 1400 });
    await click(page, page.getByRole('radio', { name: 'Por productos' }), { after: 1800 });
  });

  await scene(browser, 's7', D, async (page, mark) => {
    await page.goto(BASE + '/bodega');
    await page.getByText('Palta').first().waitFor();
    await page.waitForTimeout(700);
    mark();
    await page.waitForTimeout(800);
    await moveTo(page, page.getByText('Por vencer').first());
    await page.waitForTimeout(1200);
    await click(page, page.getByRole('button', { name: 'Lista de compra' }), { after: 1400 });
    await moveTo(page, page.getByText('Enviar por WhatsApp').first());
    await page.waitForTimeout(2500);
  });

  await scene(browser, 's8', D, async (page, mark) => {
    await page.goto(BASE + '/reportes');
    await page.getByRole('heading', { name: 'Ventas por día' }).waitFor();
    await page.waitForTimeout(900);
    mark();
    await page.waitForTimeout(500);
    await click(page, page.getByRole('button', { name: 'Últimos 30 días' }), { after: 300 });
    await page
      .getByText('Calculando ventas…')
      .waitFor({ state: 'detached' })
      .catch(() => {});
    await page.getByRole('heading', { name: 'Ventas por día' }).waitFor();
    await page.waitForTimeout(1600);
    await smoothScroll(page, 420, 2000);
    await page.waitForTimeout(800);
    await moveTo(page, page.getByText('Lo más vendido'));
    await page.waitForTimeout(2200);
  });

  await scene(browser, 's9', { width: 430, height: 932 }, async (page, mark) => {
    const token =
      ids.qr.find((t) => t.label === 'Mesa 5').qrToken ??
      ids.qr.find((t) => t.label === 'Mesa 5').token;
    await page.goto(BASE + '/carta?mesa=' + token);
    await page.getByText('¿Qué te gustaría?').waitFor();
    await page.waitForTimeout(900);
    mark();
    await page.waitForTimeout(1200);
    await click(page, page.getByRole('link', { name: /Churrascos/ }), { after: 1500 });
    await smoothScroll(page, 500, 1400);
    await page.waitForTimeout(500);
    await smoothScroll(page, -2000, 600);
    await click(page, page.getByRole('button', { name: 'Agrandar texto' }), { after: 1400 });
    await click(page, page.getByRole('button', { name: 'Alto contraste' }), { after: 1200 });
    await smoothScroll(page, 600, 1400);
    await page.waitForTimeout(1200);
  });

  await scene(browser, 's10', D, async (page, mark) => {
    await page.goto(BASE + '/configuracion/braille');
    await page.getByText('Carta braille para imprimir en 3D').waitFor();
    await page.waitForTimeout(900);
    mark();
    await page.waitForTimeout(600);
    await smoothScroll(page, 380, 1600);
    await page.waitForTimeout(600);
    await moveTo(
      page,
      page
        .getByRole('link', { name: /Descargar STL/ })
        .first()
        .or(page.getByRole('button', { name: /Descargar STL/ }).first()),
    );
    await page.waitForTimeout(3000);
  });

  fs.writeFileSync(OUT + '/marks.json', JSON.stringify(marks, null, 1));
  await browser.close();
})();
