const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../frontend/js/catalog.js');
const farms = [
  { nombre: 'Milpa Uno', productor: 'María López', estado: 'Yucatán', pais: 'México', actividadEconomica: 'Maíz' },
  { nombre: 'Huerto Dos', productor: 'Pedro', estado: 'Jalisco', actividadEconomica: 'Frutas' },
  { nombre: 'Parcela antigua' }
];
test('búsqueda por palabras ignora acentos y mayúsculas', () => {
  assert.deepEqual(catalog.filter(farms, 'MARIA mexico', '', ''), [farms[0]]);
});
test('combina búsqueda y ambos filtros', () => {
  assert.deepEqual(catalog.filter(farms, 'huerto', 'Jalisco', 'Frutas'), [farms[1]]);
  assert.deepEqual(catalog.filter(farms, 'huerto', 'Yucatán', 'Frutas'), []);
});
test('registros antiguos sin campos nuevos siguen visibles', () => {
  assert.equal(catalog.filter(farms, '', '', '').length, 3);
  assert.equal(catalog.location(farms[2]), 'Ubicación no disponible');
});
test('ubicación parcial no duplica ciudad y municipio', () => {
  assert.equal(catalog.location({ ciudad: 'Bacalar', municipio: 'Bacalar', pais: 'México' }), 'Bacalar, México');
});
