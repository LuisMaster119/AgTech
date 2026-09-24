const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let saved = false, mode = 'hold', posts = 0, release, owner = true;
  const result = { farmId: 'demo', analysisId: 'a1', score: 0, nivelRiesgo: 'Alto', resumenEjecutivo: 'Resultado de prueba' };
  await page.route('**/farms/demo', r => r.fulfill({ json: { farmId: 'demo', nombre: 'Parcela demo' } }));
  await page.route('**/farms/demo/seal', r => r.fulfill({ status: 503, json: {} }));
  await page.route('**/farms/demo/share', r => r.fulfill({ status: 503, json: {} }));
  await page.route('**/farms/demo/certificate', r => r.fulfill({ status: saved ? 200 : 404, json: result }));
  await page.route('**/providers/me/farms', r => r.fulfill({ json: owner ? [{ farmId: 'demo' }] : [] }));
  await page.route('**/farms/demo/analyze', async r => {
   posts++; assert.equal(r.request().method(), 'POST'); assert.deepEqual(r.request().postDataJSON(), {});
   if (mode === 'hold') await new Promise(resolve => { release = resolve; });
   if (mode === 'network') return r.abort();
   if (mode === 'error') return r.fulfill({ status: 502, json: {} });
   saved = true; return r.fulfill({ json: result });
  });
  await page.goto('http://127.0.0.1:8010/parcela.html?id=demo');
  await page.getByText('No hay un análisis disponible para esta parcela.', { exact: true }).waitFor();
  assert.equal(await page.locator('#run-analysis').isVisible(), false);
  await page.evaluate(() => sessionStorage.setItem('agtech.demo.session', 'test'));
  await page.reload();
  const button = page.locator('#run-analysis'); await button.waitFor();
  assert.equal(posts, 0); await button.click();
  await page.getByText('Procesando imágenes satelitales', { exact: false }).waitFor();
  assert.equal(await button.isDisabled(), true);
  await button.evaluate(b => b.click());
  await page.waitForTimeout(100); assert.equal(posts, 1); release();
  await page.getByText('Análisis guardado.', { exact: false }).waitFor();
  assert.equal(await page.locator('#analysis-score').textContent(), '0 / 100');
  assert.equal(await page.locator('#indices-body tr').count(), 3);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  mode = 'error'; await button.click();
  await page.getByText('El servicio satelital no pudo completar', { exact: false }).waitFor();
  mode = 'network'; await button.click();
  await page.getByText('No pudimos confirmar el resultado.', { exact: false }).waitFor();
  await page.locator('#analysis-retry').click();
  await page.getByText('Resultados del último análisis almacenado.', { exact: true }).waitFor();
  owner = false; await page.reload();
  await page.getByText('Resultados del último análisis almacenado.', { exact: true }).waitFor();
  assert.equal(await button.isVisible(), false);
  assert.deepEqual(errors, []);
  console.log('OK: visitante solo lectura, propietario, ejecución explícita, duplicados, resultado inmediato, error/reconsulta y móvil.');
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
