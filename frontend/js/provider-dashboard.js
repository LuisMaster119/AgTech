document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('provider-farms');
  const status = document.getElementById('farms-status');
  const retry = document.getElementById('farms-retry');
  let providerId = null;
  let generation = 0;
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function card(farm) {
    const article = node('article', null, 'provider-farm');
    const details = node('details', null, 'provider-farm-details');
    const summary = node('summary');
    summary.append(node('span', farm.nombre, 'provider-farm-name'));
    const label = node('span', 'Mostrar información', 'expand-label');
    summary.append(label);
    details.addEventListener('toggle', () => { label.textContent = details.open ? 'Ocultar información' : 'Mostrar información'; });
    const body = node('div', null, 'provider-farm-body');
    const dl = node('dl');
    for (const [label, value] of [['Productor', farm.productor], ['Actividad económica', farm.actividadEconomica],
      ['Ciudad', farm.ciudad], ['Municipio', farm.municipio], ['Estado', farm.estado], ['País', farm.pais]]) {
      dl.append(node('dt', label), node('dd', value || 'No disponible'));
    }
    body.append(dl, node('h3', 'Historia'), node('p', farm.historia || 'Historia no disponible.', 'farm-story'));
    if (farm.ubicacionAtribucion) body.append(node('p', farm.ubicacionAtribucion, 'attribution'));
    const link = node('a', 'Ver perfil público y análisis disponible', 'button outline');
    link.href = `/parcela.html?id=${encodeURIComponent(farm.farmId)}&vista=proveedor`;
    body.append(link);
    details.append(summary, body);
    article.append(details, ParcelPreview.create(farm));
    return article;
  }
  async function load() {
    const current = ++generation;
    list.replaceChildren();

    list.setAttribute('aria-busy', 'true');
    retry.hidden = true;
    status.textContent = 'Cargando tus parcelas…';
    try {
      const farms = await ProviderAuth.request('/providers/me/farms');
      if (current !== generation) return;
      if (!Array.isArray(farms)) throw new Error('Respuesta inválida');
      list.replaceChildren(...farms.map(card));
      status.textContent = farms.length ? `${farms.length} parcelas asociadas a tu proveedor.`
        : 'Todavía no tienes parcelas asociadas. Las parcelas aparecerán aquí cuando estén registradas a nombre de este proveedor.';
    } catch (error) {
      if (current !== generation) return;
      if (error.status === 401) {
        document.getElementById('provider-content').hidden = true;
        window.location.replace('/acceso.html');
        return;
      }
      status.textContent = 'No pudimos cargar tus parcelas. Inténtalo de nuevo.';
      retry.hidden = false;
    } finally {
      if (current === generation) list.setAttribute('aria-busy', 'false');
    }
  }
  document.addEventListener('provider-ready', event => {
    if (providerId === event.detail.providerId) return;
    providerId = event.detail.providerId;
    load();
  });
  document.addEventListener('provider-unavailable', () => {
    generation++;
    providerId = null;
    list.replaceChildren();
  });
  retry.addEventListener('click', load);
  document.getElementById('add-parcel').addEventListener('click', () => { window.location.href = '/agregar-parcela.html'; });
});
