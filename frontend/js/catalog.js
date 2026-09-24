/* Catálogo público: únicamente consulta GET /farms. */
const Catalog = {
  normalize(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  },
  filter(farms, query, state, activity) {
    const terms = this.normalize(query).split(/\s+/).filter(Boolean);
    return farms.filter(farm => {
      const text = this.normalize([farm.nombre, farm.productor, farm.actividadEconomica,
        farm.ciudad, farm.municipio, farm.estado, farm.pais].filter(Boolean).join(' '));
      return terms.every(term => text.includes(term)) && (!state || farm.estado === state)
        && (!activity || farm.actividadEconomica === activity);
    });
  },
  location(farm) {
    return [...new Set([farm.ciudad, farm.municipio, farm.estado, farm.pais].filter(Boolean))].join(', ')
      || 'Ubicación no disponible';
  }
};

if (typeof module !== 'undefined') module.exports = Catalog;
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  let farms = [];
  let loaded = false;
  let selectedId = null;
  let mapReady = false;
  const layers = new Map();

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function notice(title, copy) {
    $('notice-title').textContent = title;
    $('notice-copy').textContent = copy;
    $('notice').showModal();
  }

  function state(title, description, retry = false) {
    $('catalog-state').hidden = false;
    $('state-title').textContent = title;
    $('state-description').textContent = description;
    $('retry').hidden = !retry;
  }

  try {
    if (window.L) {
      MapModule.init('map', null, { readOnly: true });
      mapReady = true;
    }
  } catch (error) {
    console.warn('Mapa no disponible', error);
  }
  if (!mapReady) $('map-status').textContent = 'El mapa no está disponible. Puedes seguir consultando las tarjetas.';

  function selectFarm(farm, scroll = true) {
    selectedId = farm.farmId;
    document.querySelectorAll('.parcel-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.farmId === selectedId);
    });
    layers.forEach((layer, id) => layer.setStyle({ weight: id === selectedId ? 5 : 2 }));
    const layer = layers.get(selectedId);
    if (!layer) {
      notice('Mapa no disponible', 'No pudimos mostrar la geometría de esta parcela. Su información sigue disponible en la tarjeta.');
      return;
    }
    MapModule.map.fitBounds(layer.getBounds(), { padding: [35, 35], maxZoom: 17 });
    layer.openPopup();
    $('map-status').textContent = `Parcela seleccionada: ${farm.nombre}`;
    if (scroll) $('map-section').scrollIntoView({ block: 'start' });
  }

  function renderMap(visible) {
    if (!mapReady) return;
    MapModule.clearDrawnLayers();
    layers.clear();
    for (const farm of visible) {
      try {
        const layer = L.geoJSON(farm.geojson, {
          style: { color: '#a1f4c8', fillColor: '#116c4a', fillOpacity: .4, weight: 2 }
        });
        if (!layer.getBounds().isValid()) continue;
        const popup = element('div');
        popup.append(element('strong', farm.nombre), element('p', Catalog.location(farm)));
        layer.bindPopup(popup);
        layer.on('click', () => selectFarm(farm, false));
        MapModule.drawnItems.addLayer(layer);
        layers.set(farm.farmId, layer);
      } catch (error) {
        console.warn('Geometría no disponible para una parcela');
      }
    }
    const bounds = MapModule.drawnItems.getBounds();
    if (bounds.isValid()) MapModule.map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
    $('map-status').textContent = layers.size
      ? 'Selecciona una parcela en el mapa o desde su tarjeta.'
      : 'No hay geometrías disponibles para los resultados actuales.';
  }

  function card(farm) {
    const article = element('article', null, 'parcel-card');
    article.dataset.farmId = farm.farmId;
    const heading = element('div', null, 'card-heading');
    heading.append(element('span', 'PARCELA', 'parcel-label'));
    heading.append(element('h3', farm.nombre));
    const body = element('div', null, 'card-body');
    const dl = element('dl');
    for (const [label, value] of [['Productor', farm.productor || 'Productor no disponible'],
      ['Actividad económica', farm.actividadEconomica || 'Actividad no disponible'],
      ['Ubicación', Catalog.location(farm)]]) {
      dl.append(element('dt', label), element('dd', value));
    }
    body.append(dl);
    if (farm.ubicacionAtribucion) body.append(element('p', farm.ubicacionAtribucion, 'attribution'));
    const actions = element('div', null, 'card-actions');
    const mapButton = element('button', 'Ver en mapa', 'button');
    mapButton.setAttribute('aria-label', `Ver ${farm.nombre} en mapa`);
    mapButton.addEventListener('click', () => selectFarm(farm));
    const profileButton = element('a', 'Conocer parcela', 'button outline');
    profileButton.setAttribute('aria-label', `Conocer ${farm.nombre}`);
    profileButton.href = `/parcela.html?id=${encodeURIComponent(farm.farmId)}`;
    actions.append(mapButton, profileButton);
    article.append(heading, body, actions);
    return article;
  }

  function render() {
    if (!loaded) return;
    const visible = Catalog.filter(farms, $('catalog-search').value, $('state-filter').value, $('activity-filter').value);
    selectedId = null;
    $('farm-grid').replaceChildren(...visible.map(card));
    $('result-count').textContent = `${visible.length} de ${farms.length} parcelas`;
    $('catalog-state').hidden = true;
    if (!farms.length) state('Todavía no hay parcelas', 'Las parcelas aparecerán aquí cuando estén disponibles.');
    else if (!visible.length) state('No encontramos coincidencias', 'Prueba con otra búsqueda o limpia los filtros.');
    renderMap(visible);
  }

  function populateFilter(id, key, label) {
    const select = $(id);
    const previous = select.value;
    select.replaceChildren(new Option(label, ''));
    [...new Set(farms.map(farm => farm[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
      .forEach(value => select.add(new Option(value, value)));
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
  }

  async function load() {
    loaded = false;
    $('farm-grid').setAttribute('aria-busy', 'true');
    state('Estamos preparando el catálogo', 'Consultando las parcelas disponibles.');
    $('result-count').textContent = 'Cargando parcelas…';
    try {
      const result = await API.getFarms();
      if (!Array.isArray(result)) throw new Error('Respuesta de catálogo inválida');
      farms = result;
      populateFilter('state-filter', 'estado', 'Todos los estados');
      populateFilter('activity-filter', 'actividadEconomica', 'Todas las actividades');
      loaded = true;
      render();
    } catch (error) {
      $('farm-grid').replaceChildren();
      $('result-count').textContent = 'Catálogo no disponible';
      state('No pudimos cargar las parcelas', 'Revisa tu conexión e inténtalo de nuevo.', true);
    } finally {
      $('farm-grid').setAttribute('aria-busy', 'false');
    }
  }

  $('filters').addEventListener('submit', event => event.preventDefault());
  $('filters').addEventListener('input', render);
  $('filters').addEventListener('change', render);
  $('filters').addEventListener('reset', () => setTimeout(render, 0));
  $('retry').addEventListener('click', load);
  $('provider-login').addEventListener('click', () => { window.location.href = '/acceso.html'; });
  load();
});
