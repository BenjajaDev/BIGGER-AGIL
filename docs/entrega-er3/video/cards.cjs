const { chromium } = require('playwright');
const fs = require('fs');
const D = __dirname;
const LOGO = fs.readFileSync(D + '/../figuras/logo-oscuro.svg', 'utf8');
const CSS = `
@font-face{font-family:F;src:url(file://${D}/fraunces.woff2)}
@font-face{font-family:I;src:url(file://${D}/inter.woff2)}
*{margin:0;box-sizing:border-box} svg{display:block;width:100%;height:auto}
body{width:1920px;height:1080px;font-family:I;color:#fff;overflow:hidden}
.dark{background:radial-gradient(circle at 1px 1px,rgba(255,255,255,.07) 1px,transparent 1.6px) 0 0/26px 26px,
  radial-gradient(70% 90% at 100% 0%,rgba(166,70,46,.55),transparent 70%),#1e1e1e}
.serif{font-family:F}
.bar{position:absolute;left:0;right:0;bottom:0;height:14px;background:#a6462e}
`;
const cards = {
  title1: `<body class="dark"><div style="position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:36px;text-align:center">
    <div style="width:760px">${LOGO}</div>
    <div class="serif" style="font-size:96px;font-weight:700;letter-spacing:-1px">BIGGER Ágil</div>
    <div style="font-size:38px;color:#c9a24b;font-weight:600">Co-creado con BIGGER · Curicó</div>
  </div><div class="bar"></div></body>`,
  title2: `<body class="dark"><div style="position:absolute;inset:0;padding:150px 170px;display:grid;align-content:center;gap:56px">
    <div style="font-size:34px;color:#c9a24b;font-weight:700;letter-spacing:4px">EL PROBLEMA</div>
    <div class="serif" style="font-size:86px;font-weight:700;line-height:1.05;max-width:1400px">Un local con mucho movimiento y todo en papel</div>
    <div style="display:flex;gap:28px">
      ${[
        'Comandas en papel que se pierden',
        'Insumos sin control: mermas y compras a ciegas',
        'Una carta que una persona ciega no puede leer',
      ]
        .map(
          (
            t,
            i,
          ) => `<div style="flex:1;padding:34px;border-radius:24px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16)">
          <div class="serif" style="font-size:64px;color:#e8a33d;font-weight:700">0${i + 1}</div>
          <div style="font-size:36px;font-weight:600;line-height:1.25;margin-top:10px">${t}</div></div>`,
        )
        .join('')}
    </div></div><div class="bar"></div></body>`,
  title11: `<body class="dark"><div style="position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:40px;text-align:center">
    <div class="serif" style="font-size:84px;font-weight:700;line-height:1.1;max-width:1500px">Un local más ordenado y una mesa abierta a todas las personas</div>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px;max-width:1720px">
      ${[
        ['8', 'Trabajo decente y crecimiento económico', '#a21942'],
        ['10', 'Reducción de las desigualdades', '#dd1367'],
        ['12', 'Producción y consumo responsables', '#bf8b2e'],
      ]
        .map(
          ([
            n,
            t,
            c,
          ]) => `<div style="display:flex;align-items:center;gap:12px;padding:10px 22px 10px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18)">
          <span style="display:grid;place-items:center;width:50px;height:50px;border-radius:50%;background:${c};font-weight:800;font-size:24px">${n}</span>
          <span style="font-size:22px;font-weight:600;white-space:nowrap">ODS ${n} · ${t}</span></div>`,
        )
        .join('')}
    </div>
    <div style="display:flex;align-items:center;gap:28px;margin-top:20px"><div style="width:420px">${LOGO}</div>
      <div style="font-size:34px;color:#c9a24b;font-weight:700">Gracias, BIGGER</div></div>
  </div><div class="bar"></div></body>`,
  phonebg: `<body class="dark"><div style="position:absolute;left:150px;top:0;bottom:0;width:820px;display:grid;align-content:center;gap:34px">
    <div style="font-size:30px;color:#c9a24b;font-weight:700;letter-spacing:4px">CARTA DIGITAL ACCESIBLE</div>
    <div class="serif" style="font-size:78px;font-weight:700;line-height:1.05">Para que todas las personas pidan solas</div>
    <ul style="list-style:none;padding:0;display:grid;gap:22px;font-size:36px;font-weight:500">
      ${['Funciona con lector de pantalla', 'Texto grande y alto contraste', 'Un QR por mesa: la carta sabe dónde estás'].map((t) => `<li style="display:flex;gap:18px;align-items:center"><span style="width:18px;height:18px;border-radius:50%;background:#e8a33d;flex:none"></span>${t}</li>`).join('')}
    </ul></div>
    <div style="position:absolute;left:1214px;top:50px;width:461px;height:980px;border-radius:64px;background:#0d0d0d;box-shadow:0 30px 80px rgba(0,0,0,.6),inset 0 0 0 3px #3a3633"></div>
    <div class="bar"></div></body>`,
  phonemask: `<body style="background:#000"><div style="position:absolute;left:1237px;top:73px;width:415px;height:900px;border-radius:44px;background:#fff"></div></body>`,
};
const captions = {
  s3: ['01', 'Todo el local de un vistazo'],
  s4: ['02', 'Pedido en segundos · comanda impresa'],
  s5: ['03', 'Cocina en vivo'],
  s6: ['04', 'Cobro flexible'],
  s7: ['05', 'Menos mermas · compras con datos'],
  s8: ['06', 'Decisiones con datos'],
  s10: ['08', 'Carta braille impresa en 3D'],
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [name, body] of Object.entries(cards)) {
    fs.writeFileSync(
      `${D}/_card.html`,
      `<html><head><meta charset="utf-8"><style>${CSS}</style></head>${body}</html>`,
    );
    await p.goto(`file://${D}/_card.html`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${D}/${name}.png` });
  }
  for (const [name, [n, t]] of Object.entries(captions)) {
    const side = name === 's6' ? 'right:40px' : 'left:56px';
    fs.writeFileSync(
      `${D}/_card.html`,
      `<html><head><meta charset="utf-8"><style>${CSS} body{background:transparent}</style></head><body>
      <div style="position:absolute;bottom:56px;${side};display:flex;align-items:center;gap:22px;padding:22px 38px 22px 22px;border-radius:22px;
        background:rgba(30,30,30,.92);box-shadow:0 16px 40px rgba(0,0,0,.35);border-left:10px solid #c0272d">
        <span style="display:grid;place-items:center;width:64px;height:64px;border-radius:16px;background:#c9a24b;color:#1e1e1e;font-weight:800;font-size:28px">${n}</span>
        <span style="font-size:44px;font-weight:700;letter-spacing:-.3px">${t}</span></div></body></html>`,
    );
    await p.goto(`file://${D}/_card.html`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
    await p.screenshot({ path: `${D}/cap_${name}.png`, omitBackground: true });
  }
  await b.close();
})();
