/* Capa de consulta independiente del motor de análisis y del alta de parcelas. */
window.BufferView = {
  async init(farmId) {
    const map = MapModule.map;
    const panel = document.createElement('div');
    panel.className = 'buffer-controls';
    panel.innerHTML = '<div class="buffer-legend"><span><i class="parcel-swatch"></i>Parcela</span><span><i class="buffer-swatch"></i>Entorno de 500 m · rayado</span></div><label><input type="checkbox" checked disabled> Mostrar entorno de 500 m</label><p role="status"></p><button type="button" class="button outline" hidden>Reintentar entorno</button>';
    document.getElementById('map').before(panel);
    const toggle = panel.querySelector('input');
    const status = panel.querySelector('p');
    const retry = panel.querySelector('button');
    let layer;
    toggle.addEventListener('change', () => {
      if (!layer) return;
      layer.eachLayer(part => { part.getElement().style.display = toggle.checked ? '' : 'none'; });
    });
    async function load() {
      retry.hidden = true;
      status.textContent = 'Consultando el entorno de 500 m…';
      try {
        const data = await API.readPublic(`/farms/${encodeURIComponent(farmId)}/buffer`);
        if (data.farmId !== farmId || data.distanciaMetros !== 500
          || !['Polygon', 'MultiPolygon'].includes(data.geojson?.type)) throw new Error('Geometría inválida');
        const renderer = L.svg();
        layer = L.geoJSON(data.geojson, { renderer, interactive: false,
          style: { color: '#c78b2c', weight: 2, dashArray: '6 4', fillOpacity: .65,
            fillColor: '#e9b95d', className: 'buffer-zone' } });
        if (!layer.getBounds().isValid()) throw new Error('Sin geometría');
        layer.addTo(map);
        const path = panel.parentElement.querySelector('.buffer-zone');
        const svg = path?.ownerSVGElement;
        if (!svg) throw new Error('Sin renderizador');
        const ns = 'http://www.w3.org/2000/svg';
        const defs = document.createElementNS(ns, 'defs');
        const pattern = document.createElementNS(ns, 'pattern');
        for (const [key, value] of Object.entries({ id: 'buffer-hatching', width: 10, height: 10, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' })) pattern.setAttribute(key, value);
        const background = document.createElementNS(ns, 'rect');
        for (const [key, value] of Object.entries({ width: 10, height: 10, fill: '#f6d795', 'fill-opacity': .35 })) background.setAttribute(key, value);
        const stripe = document.createElementNS(ns, 'rect');
        for (const [key, value] of Object.entries({ width: 3, height: 10, fill: '#c78b2c' })) stripe.setAttribute(key, value);
        pattern.append(background, stripe); defs.append(pattern); svg.prepend(defs);
        layer.eachLayer(part => { part.getElement().style.fill = 'url(#buffer-hatching)'; });
        layer.bringToBack();
        map.fitBounds(layer.getBounds(), { padding: [35, 35], maxZoom: 17 });
        toggle.disabled = false;
        status.textContent = 'Anillo de 500 m fuera de la parcela. No representa propiedad ni una zona de restricción.';
      } catch (error) {
        if (layer) map.removeLayer(layer);
        status.textContent = 'No pudimos mostrar el entorno. La parcela y sus resultados siguen disponibles.';
        retry.hidden = false;
      }
    }
    retry.addEventListener('click', load);
    await load();
  }
};
