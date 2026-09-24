const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
async function setup() {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, { value: '', disabled: false, textContent: '', handlers: {}, addEventListener(e, fn) { this.handlers[e] = fn; }, focus() {}, scrollIntoView() {} });
    return elements.get(id);
  };
  let start, created, resolve, reject, payload;
  const context = vm.createContext({
    document: { getElementById: get, addEventListener(e, fn) { start = fn; } },
    window: { L: { Draw: {} }, addEventListener() {} },
    ProviderAuth: { token: () => 'demo', currentProvider: async () => ({}), request: async (path, method, data) => { payload = data; return { nombre: data.nombre, farmId: 'test' }; } },
    MapModule: { init(id, fn) { created = fn; }, map: { on() {} }, cancelDrawing() {}, clearDrawnLayers() {}, startDrawing() {} },
    LocalitySearch: { init() {} },
    API: { reverseNominatim: () => new Promise((res, rej) => { resolve = res; reject = rej; }) }
  });
  vm.runInContext(fs.readFileSync('frontend/js/add-parcel.js', 'utf8'), context);
  await start();
  const draw = () => created({ vertexCount: 3, geojson: { type: 'Polygon', coordinates: [[[-88,18],[-88,19],[-89,18],[-88,18]]] } });
  return { get, draw, confirm: () => get('confirm-polygon').handlers.click(), resolve: value => resolve(value), reject: () => reject(new Error('offline')), payload: () => payload };
}
test('completa ubicación, conserva edición durante consulta y guarda los valores', async () => {
  const s = await setup(); s.draw(); const pending = s.confirm();
  assert.equal(s.get('save-parcel').disabled, true);
  s.get('ciudad').value = 'Manual'; s.get('ciudad').handlers.input();
  s.resolve({ ciudad: 'Bacalar', estado: 'Quintana Roo', pais: 'México' }); await pending;
  assert.equal(s.get('ciudad').value, 'Manual'); assert.equal(s.get('estado').value, 'Quintana Roo');
  assert.equal(s.get('pais').value, 'México'); assert.equal(s.get('save-parcel').disabled, false);
  s.get('nombre').value = 'Prueba'; await s.get('parcel-form').handlers.submit({ preventDefault() {} });
  assert.equal(s.payload().pais, 'México');
});
test('redibujar borra solo valores automáticos e ignora respuestas anteriores', async () => {
  const s = await setup(); s.draw(); let pending = s.confirm();
  s.resolve({ ciudad: 'Bacalar', estado: 'Quintana Roo', pais: 'México' }); await pending;
  s.get('ciudad').value = 'Manual'; s.get('ciudad').handlers.input();
  s.get('start-draw').handlers.click();
  assert.equal(s.get('estado').value, ''); assert.equal(s.get('ciudad').value, 'Manual');
  s.draw(); pending = s.confirm(); s.get('cancel-draw').handlers.click();
  s.resolve({ estado: 'Antiguo' }); await pending;
  assert.equal(s.get('estado').value, ''); assert.equal(s.get('save-parcel').disabled, true);
});
test('ubicación parcial y fallo permiten guardado manual', async () => {
  const s = await setup(); s.draw(); let pending = s.confirm();
  s.resolve({ pais: 'México' }); await pending;
  assert.equal(s.get('ciudad').value, ''); assert.match(s.get('location-status').textContent, /parcial/);
  s.get('cancel-draw').handlers.click(); s.draw(); pending = s.confirm(); s.reject(); await pending;
  assert.match(s.get('location-status').textContent, /manualmente/); assert.equal(s.get('save-parcel').disabled, false);
});
test('cliente mapea respuesta, consulta lon/lat correctos y reutiliza caché', async () => {
  let calls = 0, url;
  const context = vm.createContext({ window: { location: { origin: 'http://localhost' } }, AbortController, setTimeout, clearTimeout, console,
    fetch: async target => { calls++; url = target; return { ok: true, json: async () => ({ address: { village: 'Bacalar', state: 'Quintana Roo', country: 'México', county: 'No es municipio' } }) }; } });
  vm.runInContext(fs.readFileSync('frontend/js/api.js', 'utf8'), context);
  const geometry = { coordinates: [[[-88, 18]]] };
  const result = await context.window.API.reverseNominatim(geometry);
  assert.equal(result.ciudad, 'Bacalar'); assert.equal(result.municipio, undefined);
  assert.match(url, /lon=-88&lat=18/);
  await context.window.API.reverseNominatim(geometry); assert.equal(calls, 1);
});
