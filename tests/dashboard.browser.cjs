const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
    const errors = [], writes = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (r.url().includes('/farms') && r.method() !== 'GET') writes.push(r.url()); });
    await page.addInitScript(() => sessionStorage.setItem('agtech.demo.session', 'test-token'));
    await page.route('**/providers/me', r => r.fulfill({ json: { providerId: 'demo-provider-001', nombrePublico: 'Cooperativa Demo TerraSync' } }));
    let mode = 'full';
    await page.route('**/providers/me/farms', r => r.fulfill({ status: mode === 'error' ? 503 : mode === 'expired' ? 401 : 200,
      json: mode === 'empty' ? [] : [{ farmId: 'demo-farm-001', nombre: 'Parcela Demo Milpa', productor: 'Productor ficticio', historia: '<img src=x onerror=alert(1)>', actividadEconomica: 'Cultivo de maíz', estado: 'Quintana Roo', pais: 'México', esDemostracion: true }, { farmId: 'old', nombre: 'Parcela con datos parciales' }] }));
    await page.goto('http://127.0.0.1:8010/proveedor.html');
    await page.locator('.provider-farm').first().waitFor();
    assert.equal(await page.locator('.provider-farm').count(), 2);
    await page.locator('summary').first().click();
    assert.equal(await page.locator('.provider-farm img').count(), 0);
    assert.equal(await page.getByRole('link', { name: 'Ver perfil público y análisis disponible →' }).first().getAttribute('href'), '/parcela.html?id=demo-farm-001');
    await page.getByRole('button', { name: 'Agregar parcela · Próximamente' }).click();
    await page.locator('#add-notice[open]').waitFor();
    await page.getByRole('button', { name: 'Entendido' }).click();
    if (process.env.DASHBOARD_SCREENSHOT) await page.screenshot({ path: process.env.DASHBOARD_SCREENSHOT, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    mode = 'empty'; await page.reload();
    await page.getByText('Todavía no tienes parcelas asociadas.', { exact: false }).waitFor();
    mode = 'error'; await page.reload();
    await page.locator('#farms-retry:not([hidden])').waitFor();
    mode = 'full'; await page.locator('#farms-retry').click();
    await page.locator('.provider-farm').first().waitFor();
    mode = 'expired'; await page.reload();
    await page.waitForURL('**/acceso.html');
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    console.log('OK: listado, desplegables, perfil, aviso de alta, móvil, vacío, error, reintento, sesión vencida y solo lectura.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
