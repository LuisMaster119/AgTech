// Usa la sesión demo real en memoria; no consulta ni escribe Firestore.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = process.env.AUTH_TEST_URL || 'http://127.0.0.1:8011';
    await page.goto(`${base}/proveedor.html`);
    await page.waitForURL('**/acceso.html');
    await page.getByRole('button', { name: 'Entrar como proveedor demo' }).click();
    await page.waitForURL('**/proveedor.html');
    await page.getByRole('heading', { name: 'Cooperativa Demo TerraSync' }).waitFor();
    await page.reload();
    await page.locator('#provider-content:not([hidden])').waitFor();
    if (process.env.AUTH_SCREENSHOT) await page.screenshot({ path: process.env.AUTH_SCREENSHOT, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.waitForURL('**/acceso.html');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('agtech.demo.session')), null);
    await page.goto(`${base}/proveedor.html`);
    await page.waitForURL('**/acceso.html');
    await page.evaluate(() => sessionStorage.setItem('agtech.demo.session', 'invalid'));
    await page.goto(`${base}/proveedor.html`);
    await page.waitForURL('**/acceso.html');
    await page.route('**/auth/demo/session', route => route.fulfill({ status: 503, json: {} }));
    await page.getByRole('button', { name: 'Entrar como proveedor demo' }).click();
    await page.getByText('El acceso de demostración está desactivado en este servidor.', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('OK: acceso directo sin sesión, entrada demo real, recarga, móvil, cierre, token inválido y servicio desactivado.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
