// Requiere servidor local, Playwright y Microsoft Edge. No escribe en Firestore.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    const mutations = [];
    const environmentalRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.url().includes('127.0.0.1') && request.method() !== 'GET') mutations.push(request.url());
      if (/\/(buffer|analyze)(\?|$)/.test(request.url())) environmentalRequests.push(request.url());
    });
    await page.route('https://fonts.**/**', route => route.abort());
    let imageMode = 'success';
    await page.route('https://server.arcgisonline.com/**/export?**', route => imageMode === 'error' ? route.abort() : route.fulfill({
      contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#465c35"/></svg>'
    }));
    const polygon = { type: 'Polygon', coordinates: [[[-88.40, 18.70], [-88.39, 18.70], [-88.39, 18.71], [-88.40, 18.70]]] };
    const farms = [
      { farmId: 'demo', nombre: 'Milpa de demostración', productor: 'María López', actividadEconomica: 'Maíz', estado: 'Quintana Roo', pais: 'México', esDemostracion: true, geojson: polygon },
      { farmId: 'old', nombre: 'Parcela antigua' },
      { farmId: 'unsafe', nombre: '<img src=x onerror=alert(1)>', productor: 'Pedro', actividadEconomica: 'Frutas', estado: 'Jalisco', geojson: polygon }
    ];
    let mode = 'success';
    await page.route('**/farms', route => route.fulfill({
      status: mode === 'error' ? 500 : 200,
      contentType: 'application/json',
      body: JSON.stringify(mode === 'empty' ? [] : mode === 'error' ? { detail: 'test' } : farms)
    }));
    await page.goto('http://127.0.0.1:8010');
    await page.locator('.parcel-card').first().waitFor();
    assert.equal(await page.locator('.parcel-card').count(), 3);
    assert.equal(await page.locator('.demo-badge').count(), 0);
    assert.equal(await page.locator('.parcel-card img').count(), 2);
    await page.locator('.parcel-preview.ready').first().waitFor();
    assert.equal(await page.locator('.parcel-preview svg path').count(), 2);
    assert.equal(await page.locator('#map-section, #map').count(), 0);
    await page.getByText('Vista satelital no disponible', { exact: true }).waitFor();
    assert.equal(await page.locator('.card-heading img').count(), 0);
    await page.locator('#catalog-search').fill('maria mexico');
    assert.equal(await page.locator('.parcel-card').count(), 1);
    await page.locator('#state-filter').selectOption('Jalisco');
    await page.getByText('No encontramos coincidencias', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.parcel-card').length === 3);
    await page.locator('#activity-filter').selectOption('Frutas');
    assert.equal(await page.locator('.parcel-card').count(), 1);
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.parcel-card').length === 3);
    await page.getByRole('button', { name: 'Iniciar sesión como productor' }).click();
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Volver al catálogo' }).click();
    await page.locator('.parcel-card').first().waitFor();
    assert.equal(await page.getByRole('link', { name: 'Conocer Milpa de demostración' }).getAttribute('href'), '/parcela.html?id=demo');
    assert.equal(await page.getByRole('button', { name: /en mapa/ }).count(), 0);
    assert.equal(await page.locator('.leaflet-container').count(), 0);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (process.env.CATALOG_SCREENSHOT) await page.screenshot({ path: process.env.CATALOG_SCREENSHOT, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    if (process.env.CATALOG_MOBILE_SCREENSHOT) await page.screenshot({ path: process.env.CATALOG_MOBILE_SCREENSHOT, fullPage: true });
    imageMode = 'error';
    await page.reload();
    await page.getByText('No se pudo cargar la vista satelital', { exact: true }).first().waitFor();
    assert.equal(await page.getByRole('link', { name: 'Conocer Milpa de demostración' }).count(), 1);
    mode = 'empty';
    await page.reload();
    await page.getByText('Todavía no hay parcelas', { exact: true }).waitFor();
    mode = 'error';
    await page.reload();
    await page.getByText('No pudimos cargar las parcelas', { exact: true }).waitFor();
    mode = 'success';
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await page.locator('.parcel-card').first().waitFor();
    assert.deepEqual(errors, []);
    assert.deepEqual(mutations, []);
    assert.deepEqual(environmentalRequests, []);
    console.log('OK: vistas satelitales simuladas, contornos, sin mapa general/buffer, filtros, datos antiguos, texto seguro, móvil, imagen fallida, vacío, error, reintento y solo GET.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
