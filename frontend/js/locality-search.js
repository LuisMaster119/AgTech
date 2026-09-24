/* Búsqueda explícita: no consulta mientras se escribe ni cambia el polígono. */
window.LocalitySearch = {
  init(map) {
    const control = L.control({ position: 'topright' });
    control.onAdd = () => {
      const panel = L.DomUtil.create('div', 'locality-search');
      panel.innerHTML = '<form><label for="locality-query">Buscar localidad</label><div class="locality-row"><input id="locality-query" type="search" placeholder="Ej. Bacalar, Quintana Roo" minlength="2" maxlength="200" required autocomplete="off"><button type="submit" class="button">Buscar</button></div></form><p role="status" aria-live="polite"></p><ul aria-label="Localidades encontradas"></ul><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap · Nominatim</a>';
      L.DomEvent.disableClickPropagation(panel);
      L.DomEvent.disableScrollPropagation(panel);
      panel.addEventListener('keydown', event => event.stopPropagation());
      const input = panel.querySelector('input'), button = panel.querySelector('button');
      const status = panel.querySelector('p'), results = panel.querySelector('ul');
      const cache = new Map();
      let busy = false, lastRequest = 0;
      panel.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        const query = input.value.trim();
        if (busy || query.length < 2) return;
        if (!cache.has(query) && Date.now() - lastRequest < 1100) {
          status.textContent = 'Espera un momento antes de buscar otra localidad.'; return;
        }
        busy = true; button.disabled = true; results.replaceChildren();
        status.textContent = 'Buscando localidades…';
        try {
          let items = cache.get(query);
          if (!items) {
            lastRequest = Date.now();
            items = await API.searchNominatim(query, { throwOnError: true });
            if (!Array.isArray(items)) throw new Error('Respuesta inválida');
            if (cache.size >= 30) cache.delete(cache.keys().next().value);
            cache.set(query, items);
          }
          items = items.filter(item => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon))
            && Math.abs(Number(item.lat)) <= 90 && Math.abs(Number(item.lon)) <= 180);
          status.textContent = items.length ? 'Selecciona una localidad para acercar el mapa.' : 'No encontramos localidades. Prueba incluyendo municipio, estado o país.';
          for (const item of items) {
            const li = document.createElement('li'), select = document.createElement('button');
            select.type = 'button'; select.textContent = item.display_name || 'Localidad';
            select.addEventListener('click', () => {
              map.setView([Number(item.lat), Number(item.lon)], 14, { animate: false });
              status.textContent = `Ubicación seleccionada: ${item.display_name || 'Localidad'}. Puedes dibujar tu parcela.`;
              results.replaceChildren();
            });
            li.append(select); results.append(li);
          }
        } catch {
          status.textContent = 'No pudimos consultar las localidades. Revisa tu conexión y pulsa Buscar para reintentar.';
        } finally { busy = false; button.disabled = false; }
      });
      return panel;
    };
    control.addTo(map);
  }
};
