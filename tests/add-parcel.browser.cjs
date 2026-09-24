const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [], analyses = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (r.url().includes('/analyze')) analyses.push(r.url()); });
    await page.goto('http://127.0.0.1:8010/agregar-parcela.html');
    await page.waitForURL('**/acceso.html');
    await page.addInitScript(() => sessionStorage.setItem('agtech.demo.session', 'mock'));
    await page.route('**/providers/me', r => r.fulfill({ json: { providerId: 'demo-provider-001' } }));
    let writes = 0, fail = true, payload;
    await page.route('**/providers/me/farms', r => {
      writes++; payload = r.request().postDataJSON();
      return r.fulfill({ status: fail ? 503 : 201, json: fail ? {} : { ...payload, farmId: 'saved-demo', esDemostracion: true } });
    });
    await page.goto('http://127.0.0.1:8010/agregar-parcela.html');
    await page.waitForFunction(() => !document.getElementById('start-draw').disabled);
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    assert.equal(await page.locator('#save-parcel').isDisabled(), true);
    await page.getByRole('button', { name: 'Dibujar parcela', exact: true }).click();
    await page.locator('#map').scrollIntoViewIfNeeded();
    const box = await page.locator('#map').boundingBox();
    for (const [x, y] of [[200,100],[400,100],[400,250],[200,100]]) {
      await page.mouse.click(box.x+x, box.y+y, { delay: 120 });
      // Leaflet.draw ignora entradas durante su breve bloqueo tras cada vértice.
      await page.waitForTimeout(250);
    }
    await page.waitForFunction(() => !document.getElementById('confirm-polygon').disabled);
    assert.equal(await page.locator('#save-parcel').isDisabled(), true);
    await page.getByRole('button', { name: 'Confirmar polígono' }).click();
    await page.getByLabel('Nombre de la parcela *', { exact: true }).fill('Parcela de prueba');
    await page.getByLabel('Productor', { exact: true }).fill('Productor demo');
    await page.getByRole('button', { name: 'Guardar parcela' }).click();
    await page.getByText('No pudimos confirmar el guardado.', { exact: false }).waitFor();
    assert.equal(await page.locator('#nombre').inputValue(), 'Parcela de prueba');
    fail = false;
    await page.getByRole('button', { name: 'Guardar parcela' }).click();
    await page.getByRole('heading', { name: 'Parcela guardada' }).waitFor();
    assert.equal(payload.geojson.type, 'Polygon');
    assert.deepEqual(payload.geojson.coordinates[0][0], payload.geojson.coordinates[0].at(-1));
    assert.equal('providerId' in payload, false);
    assert.equal(writes, 2);
    assert.equal(await page.locator('#save-parcel').isDisabled(), true);
    assert.equal(await page.locator('#saved-profile').getAttribute('href'), '/parcela.html?id=saved-demo');
    if (process.env.ADD_SCREENSHOT) await page.screenshot({ path: process.env.ADD_SCREENSHOT, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(analyses, []);
    console.log('OK: sesión, dibujo con clics, confirmación, formulario, error sin pérdida, guardado, geometría cerrada, móvil y sin análisis automático.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
