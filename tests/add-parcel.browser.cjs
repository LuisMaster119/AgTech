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
    let searches = 0;
    let reverseCalls = 0, reverseFailure = false, releaseReverse;
    let address = { town: 'Bacalar', state: 'Quintana Roo', country: 'México', municipality: 'Bacalar' };
    await page.route('https://nominatim.openstreetmap.org/reverse?**', async r => {
      reverseCalls++;
      const result = { ...address };
      if (releaseReverse) await new Promise(resolve => { releaseReverse = resolve; });
      return r.fulfill({ status: reverseFailure ? 503 : 200, json: { address: result } });
    });
    await page.route('https://nominatim.openstreetmap.org/search?**', r => {
      searches++;
      return r.fulfill({ json: [{ lat: '18.68', lon: '-88.39', display_name: 'Bacalar, Quintana Roo, México' }] });
    });
    await page.route('**/providers/me/farms', r => {
      writes++; payload = r.request().postDataJSON();
      return r.fulfill({ status: fail ? 503 : 201, json: fail ? {} : { ...payload, farmId: 'saved-demo', esDemostracion: true } });
    });
    await page.goto('http://127.0.0.1:8010/agregar-parcela.html');
    await page.waitForFunction(() => !document.getElementById('start-draw').disabled);
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    await page.getByLabel('Buscar localidad', { exact: true }).fill('Bacalar');
    assert.equal(searches, 0);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await page.getByRole('button', { name: 'Bacalar, Quintana Roo, México', exact: true }).click();
    await page.waitForFunction(() => Math.abs(MapModule.map.getCenter().lat - 18.68) < .001);
    assert.equal(searches, 1);
    assert.equal(await page.locator('#coordinate-preview').textContent(), '');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await page.getByRole('button', { name: 'Bacalar, Quintana Roo, México', exact: true }).waitFor();
    assert.equal(searches, 1);
    await page.getByRole('button', { name: 'Bacalar, Quintana Roo, México', exact: true }).click();
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
    await page.getByText('Ubicación completada.', { exact: false }).waitFor();
    assert.equal(await page.locator('#ciudad').inputValue(), 'Bacalar');
    assert.equal(await page.locator('#estado').inputValue(), 'Quintana Roo');
    assert.equal(await page.locator('#pais').inputValue(), 'México');
    assert.equal(reverseCalls, 1);
    // Redibujo elimina solo valores automáticos y conserva correcciones manuales.
    await page.locator('#ciudad').fill('Ciudad manual');
    async function redraw(lon) {
      await page.getByRole('button', { name: 'Descartar polígono' }).click();
      await page.evaluate(lon => MapModule.onPolygonCreatedCallback({ vertexCount: 3, geojson: {
        type: 'Polygon', coordinates: [[[lon,18], [lon+.01,18], [lon,18.01], [lon,18]]]
      } }), lon);
      await page.getByRole('button', { name: 'Confirmar polígono' }).click();
    }
    address = { country: 'México' };
    await redraw(-89);
    await page.getByText('La ubicación disponible es parcial.', { exact: false }).waitFor();
    assert.equal(await page.locator('#ciudad').inputValue(), 'Ciudad manual');
    assert.equal(await page.locator('#estado').inputValue(), '');
    reverseFailure = true;
    await redraw(-90);
    await page.getByText('No pudimos consultar la ubicación.', { exact: false }).waitFor();
    assert.equal(await page.locator('#save-parcel').isEnabled(), true);
    reverseFailure = false;
    address = { city: 'Respuesta antigua', state: 'Estado antiguo', country: 'México' };
    releaseReverse = true;
    await redraw(-91);
    await page.waitForFunction(() => document.getElementById('save-parcel').disabled);
    const deadline = Date.now() + 10000;
    while (typeof releaseReverse !== 'function' && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(typeof releaseReverse, 'function');
    await page.getByRole('button', { name: 'Descartar polígono' }).click();
    const release = releaseReverse; releaseReverse = null; release();
    address = { city: 'Mérida', state: 'Yucatán', country: 'México' };
    await redraw(-92);
    await page.getByText('Ubicación completada.', { exact: false }).waitFor();
    assert.equal(await page.locator('#ciudad').inputValue(), 'Ciudad manual');
    assert.equal(await page.locator('#estado').inputValue(), 'Yucatán');
    await page.getByLabel('Nombre de la parcela *', { exact: true }).fill('Parcela de prueba');
    await page.getByLabel('Productor', { exact: true }).fill('Productor demo');
    await page.getByRole('button', { name: 'Guardar parcela' }).click();
    await page.getByText('No pudimos confirmar el guardado.', { exact: false }).waitFor();
    assert.equal(await page.locator('#nombre').inputValue(), 'Parcela de prueba');
    fail = false;
    await page.getByRole('button', { name: 'Guardar parcela' }).click();
    await page.getByRole('heading', { name: 'Parcela guardada' }).waitFor();
    assert.equal(payload.geojson.type, 'Polygon');
    assert.equal(payload.ciudad, 'Ciudad manual');
    assert.equal(payload.estado, 'Yucatán');
    assert.equal(payload.pais, 'México');
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
