const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      sessionStorage.setItem('agtech.demo.session', 'test-token');
      const original = window.setTimeout;
      window.setTimeout = (fn, ms, ...args) => original(fn,
        window.testAnalysisTimeout && ms === 180000 ? 50 : ms, ...args);
    });
    let expired = false, mode = 'success', posts = 0, release;
    const farm = { farmId: 'demo', nombre: 'Parcela demo', esDemostracion: true };
    const analysis = { farmId: 'demo', analysisId: 'stored-1', score: 0, nivelRiesgo: 'Alto',
      resumenEjecutivo: '<img src=x onerror=alert(1)>', fechaCreacion: '2026-09-23T12:00:00Z',
      periodoReferencia: { inicio: '2024-01-01', fin: '2024-06-01' },
      periodoReciente: { inicio: '2026-01-01', fin: '2026-06-01' } };
    await page.route('**/providers/me', r => r.fulfill({ status: expired ? 401 : 200,
      json: { providerId: 'demo-provider', nombrePublico: 'Proveedor demo' } }));
    await page.route('**/providers/me/farms', r => r.fulfill({ json: [farm, { farmId: 'other', nombre: 'Otra parcela' }] }));
    await page.route('**/farms/demo/analyze', async r => {
      posts++;
      assert.equal(r.request().method(), 'POST');
      assert.deepEqual(r.request().postDataJSON(), {});
      if (mode === 'hold') await new Promise(resolve => { release = resolve; });
      if (mode === 'network') return r.abort();
      if (mode === 'timeout') await new Promise(resolve => setTimeout(resolve, 200));
      return r.fulfill({ status: mode === 'error' ? 502 : 200, json: analysis });
    });
    await page.route('**/farms/demo', r => r.fulfill({ json: farm }));
    await page.route('**/farms/demo/certificate', r => r.fulfill({ json: analysis }));
    await page.route('**/farms/demo/seal', r => r.fulfill({ status: 503, json: {} }));
    await page.goto('http://127.0.0.1:8010/proveedor.html');
    await page.locator('summary').first().click();
    assert.equal(posts, 0);
    const run = page.getByRole('button', { name: 'Ejecutar análisis', exact: true }).first();
    mode = 'hold';
    await run.click();
    await page.getByText('Procesando imágenes satelitales', { exact: false }).waitFor();
    assert.equal(await run.isDisabled(), true);
    assert.equal(await page.locator('.provider-analysis button:disabled').count(), 2);
    await page.waitForFunction(() => document.querySelector('.provider-analysis').getAttribute('aria-busy') === 'true');
    // El segundo clic programático tampoco debe enviar otra petición.
    await run.evaluate(b => b.click());
    await page.waitForRequest(() => false, { timeout: 100 }).catch(() => {});
    assert.equal(posts, 1);
    release();
    await page.getByText('Análisis guardado.', { exact: false }).waitFor();
    assert.match(await page.locator('.analysis-metric').textContent(), /0 \/ 100/);
    assert.equal(await page.locator('.provider-analysis-result img').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const rerun = page.getByRole('button', { name: 'Ejecutar nuevo análisis' });
    mode = 'error'; await rerun.click();
    await page.getByText('El servicio satelital no pudo completar', { exact: false }).waitFor();
    mode = 'network'; await rerun.click();
    await page.getByText('No pudimos confirmar el resultado.', { exact: false }).waitFor();
    mode = 'timeout';
    await page.evaluate(() => { window.testAnalysisTimeout = true; });
    await rerun.click();
    await page.getByText('No pudimos confirmar el resultado.', { exact: false }).waitFor();
    assert.equal(await rerun.isDisabled(), false);
    await page.getByRole('link', { name: 'Ver perfil público y análisis disponible →' }).first().click();
    await page.locator('#analysis-content:not([hidden])').waitFor();
    assert.equal(await page.locator('#analysis-score').textContent(), '0 / 100');
    await page.goto('http://127.0.0.1:8010/proveedor.html');
    await page.locator('summary').first().click();
    expired = true;
    const before = posts;
    await page.getByRole('button', { name: 'Ejecutar análisis', exact: true }).first().click();
    await page.waitForURL('**/acceso.html');
    assert.equal(posts, before);
    assert.deepEqual(errors, []);
    console.log('OK: ejecución explícita, bloqueo de duplicados, score cero, resultado público, errores, móvil y sesión vencida.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
