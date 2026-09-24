const test = require('node:test');
const assert = require('node:assert/strict');
const preview = require('../frontend/js/parcel-preview.js');
const ring = [[-88.40,18.70],[-88.39,18.70],[-88.39,18.71],[-88.40,18.70]];
test('encuadra la parcela con imagen y contorno en la misma proyección, sin buffer', () => {
  const result = preview.geometry({ type: 'Polygon', coordinates: [ring] });
  const url = new URL(result.url);
  assert.equal(url.searchParams.get('bboxSR'), '3857');
  assert.equal(url.searchParams.get('imageSR'), '3857');
  assert.equal(url.searchParams.get('size'), '640,360');
  const [left, bottom, right, top] = result.bbox;
  assert.ok(Math.abs((right-left)/(top-bottom) - 640/360) < 1e-8);
  for (const [, x, y] of result.path.matchAll(/[ML]([\d.]+),([\d.]+)/g)) {
    assert.ok(+x > 0 && +x < 640); assert.ok(+y > 0 && +y < 360);
  }
  const small = preview.geometry({ type: 'Polygon', coordinates: [ring.map(([x,y]) => [-88.4+(x+88.4)/100,18.7+(y-18.7)/100])] });
  assert.ok(small.bbox[2]-small.bbox[0] < 30, 'sin expansión fija de 500 m');
});
test('conserva huecos y componentes MultiPolygon', () => {
  const result = preview.geometry({ type: 'MultiPolygon', coordinates: [[ring,ring], [ring]] });
  assert.equal((result.path.match(/M/g)||[]).length, 3);
});
test('geometría ausente, abierta, inválida o degenerada muestra alternativa', () => {
  for (const geometry of [undefined, {}, { type:'Point',coordinates:[0,0] }, { type:'Polygon', coordinates:[] },
    { type:'Polygon', coordinates:[ring.slice(0,3)] }, { type:'Polygon', coordinates:[[[0,0],[0,0],[0,0],[0,0]]] },
    { type:'Polygon', coordinates:[[[0,91],[1,91],[1,92],[0,91]]] }]) assert.equal(preview.geometry(geometry), null);
});
