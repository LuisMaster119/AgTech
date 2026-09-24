// Servidor local en 8010, Playwright y Edge; todas las respuestas de datos se simulan.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const share = JSON.parse(execFileSync('venv/Scripts/python.exe', ['-c',
  'import json; from app.services.sharing import profile_share; print(json.dumps(profile_share("http://127.0.0.1:8010", "demo")))'], { encoding: 'utf8' }));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.url().includes('/farms') && request.method() !== 'GET') writes.push(request.url()); });
    let profileMode = 'full', analysisMode = 'full', analysisRequests = 0, sealMode = 'full', shareMode = 'full';
    await page.addInitScript(() => { window.print = () => { window.printCalls = (window.printCalls || 0) + 1; }; });
    await page.route('**/farms/demo/share', route => route.fulfill({ status: shareMode === 'error' ? 503 : 200, json: share }));
    const farm = { farmId: 'demo', nombre: 'Milpa de demostración', productor: 'María López', historia: 'Tres generaciones cultivando la tierra.\nUna historia de demostración.', actividadEconomica: 'Cultivo de maíz', ciudad: 'Bacalar', municipio: 'Bacalar', estado: 'Quintana Roo', pais: 'México', esDemostracion: true,
      geojson: { type: 'Polygon', coordinates: [[[-88.40, 18.70], [-88.39, 18.70], [-88.39, 18.71], [-88.40, 18.70]]] } };
    const analysis = { farmId: 'demo', score: 0, nivelRiesgo: 'Alto', fechaCreacion: '2026-09-01T12:00:00Z', resumenEjecutivo: 'Resultado de prueba para verificar la visualización.', periodoReferencia: { inicio: '2024-01-01', fin: '2024-06-30' }, periodoReciente: { inicio: '2026-01-01', fin: '2026-06-30' }, indices: { referencia: { ndvi_granja: .7, ndvi_buffer: .75, ndmi_granja: .2, ndmi_buffer: .3, ndbi_granja: -.2, ndbi_buffer: -.3 }, reciente: { ndvi_granja: 0, ndvi_buffer: .74, ndmi_granja: -.1, ndmi_buffer: .2, ndbi_granja: .2, ndbi_buffer: -.2 } } };
    analysis.analysisId = 'analysis-test-001';
    await page.route('**/farms', route => route.fulfill({ json: [farm] }));
    await page.route('**/farms/demo/seal', route => route.fulfill({ status: sealMode === 'error' ? 503 : 200, json: {
      farmId: 'demo', estado: profileMode === 'old' ? 'faltan_datos' : 'cumple', esDemostracion: profileMode !== 'old',
      versionCriterios: 'perfil-base-1.0', fechaEvaluacion: '2026-09-23T12:00:00Z',
      alcance: 'Comprueba presencia de información; no constituye certificación oficial.',
      criterios: ['Nombre de parcela', 'Productor', 'Historia', 'Actividad económica', 'Municipio', 'Estado', 'País', 'Polígono con estructura válida']
        .map(descripcion => ({ descripcion, cumple: profileMode !== 'old' })),
      nivelesPendientes: ['Nivel II Export · Pendiente de revisión', 'Élite Regenerativo · Pendiente de revisión']
    } }));
    await page.route('**/farms/demo', route => {
      const status = profileMode === 'missing' ? 404 : profileMode === 'error' ? 500 : 200;
      const body = profileMode === 'old' ? { farmId: 'demo', nombre: '<img src=x onerror=alert(1)>', geojson: {} } : farm;
      return route.fulfill({ status, json: body });
    });
    await page.route('**/farms/demo/certificate', route => {
      analysisRequests++;
      return route.fulfill({ status: analysisMode === 'missing' ? 404 : analysisMode === 'error' ? 500 : 200, json: analysis });
    });
    await page.goto('http://127.0.0.1:8010/');
    await page.getByRole('link', { name: 'Conocer Milpa de demostración' }).click();
    await page.locator('#analysis-content:not([hidden])').waitFor();
    await page.locator('#seal-content:not([hidden])').waitFor();
    assert.equal(await page.locator('#seal-status').textContent(), 'Nivel I Base · Perfil documentado');
    assert.match(await page.locator('#seal-demo').textContent(), /Caso de demostración/);
    assert.equal(await page.locator('#seal-pending li').count(), 2);
    assert.equal(await page.locator('#seal-criteria li').count(), 8);
    await page.waitForFunction(() => !document.getElementById('print-report').disabled);
    assert.equal(await page.locator('#profile-url').getAttribute('href'), share.publicUrl);
    assert.match(await page.locator('#share-note').textContent(), /localhost/);
    await page.locator('#print-report').click();
    assert.equal(await page.evaluate(() => window.printCalls), 1);
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.report-heading').isVisible(), true);
    assert.equal(await page.locator('.map-section').isVisible(), false);
    assert.equal(await page.locator('#demo-label').isVisible(), true);
    assert.equal(await page.locator('#profile-qr').isVisible(), true);
    if (process.env.REPORT_SCREENSHOT) await page.screenshot({ path: process.env.REPORT_SCREENSHOT, fullPage: true });
    await page.emulateMedia({ media: 'screen' });
    assert.equal(await page.locator('#parcel-name').textContent(), farm.nombre);
    assert.equal(await page.locator('#analysis-score').textContent(), '0 / 100');
    assert.equal(await page.locator('#indices-body tr').count(), 3);
    assert.equal(await page.locator('#indices-body tr').first().locator('td').nth(1).textContent(), '0');
    assert.equal(await page.locator('.leaflet-draw').count(), 0);
    assert.equal(await page.locator('.leaflet-interactive').count() > 0, true);
    if (process.env.PARCEL_SCREENSHOT) await page.screenshot({ path: process.env.PARCEL_SCREENSHOT, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    if (process.env.PARCEL_MOBILE_SCREENSHOT) await page.screenshot({ path: process.env.PARCEL_MOBILE_SCREENSHOT, fullPage: true });
    analysisMode = 'missing';
    await page.reload();
    await page.getByText('No hay un análisis disponible para esta parcela.', { exact: true }).waitFor();
    assert.equal(await page.locator('#analysis-content').isVisible(), false);
    assert.equal(await page.locator('#print-report').isDisabled(), true);
    analysisMode = 'error';
    await page.reload();
    await page.locator('#analysis-retry:not([hidden])').waitFor();
    assert.equal(await page.locator('#parcel-story').isVisible(), true);
    analysisMode = 'full';
    await page.locator('#analysis-retry').click();
    await page.locator('#analysis-content:not([hidden])').waitFor();
    profileMode = 'old'; analysisMode = 'missing';
    await page.reload();
    await page.getByText('Productor no disponible', { exact: true }).waitFor();
    assert.equal(await page.locator('#parcel-name img').count(), 0);
    assert.equal(await page.locator('#demo-label').isVisible(), false);
    await page.getByText('Nivel I Base · Faltan datos', { exact: true }).waitFor();
    assert.equal(await page.locator('#seal-demo').isVisible(), false);
    sealMode = 'error';
    await page.reload();
    await page.locator('#seal-retry:not([hidden])').waitFor();
    assert.equal(await page.locator('#print-report').isDisabled(), true);
    assert.equal(await page.locator('#parcel-name').isVisible(), true);
    sealMode = 'full';
    await page.locator('#seal-retry').click();
    await page.locator('#seal-content:not([hidden])').waitFor();
    shareMode = 'error';
    await page.reload();
    await page.locator('#share-retry:not([hidden])').waitFor();
    assert.equal(await page.locator('#print-report').isDisabled(), true);
    shareMode = 'full';
    await page.locator('#share-retry').click();
    await page.locator('#share-content:not([hidden])').waitFor();
    profileMode = 'missing';
    const previous = analysisRequests;
    await page.reload();
    await page.getByRole('heading', { name: 'Parcela no encontrada' }).waitFor();
    assert.equal(analysisRequests, previous);
    profileMode = 'error';
    await page.reload();
    await page.locator('#parcel-retry:not([hidden])').waitFor();
    profileMode = 'full';
    await page.locator('#parcel-retry').click();
    await page.locator('#parcel-content:not([hidden])').waitFor();
    await page.getByRole('link', { name: '← Volver al catálogo' }).click();
    await page.getByRole('heading', { name: 'Explora las parcelas' }).waitFor();
    await page.goto('http://127.0.0.1:8010/parcela.html');
    await page.getByRole('heading', { name: 'Enlace de parcela incompleto' }).waitFor();
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    console.log('OK: navegación, perfil, mapa, score cero, índices, móvil, ausencia/error de análisis, perfil antiguo, 404, reintentos, texto seguro y solo GET.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
