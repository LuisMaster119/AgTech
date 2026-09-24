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
    const heading = node('div', null, 'provider-farm-heading');
    const title = node('h3', null, 'provider-farm-name');
    const link = node('a', farm.nombre, 'provider-farm-link');
    link.href = `/parcela.html?id=${encodeURIComponent(farm.farmId)}&vista=proveedor`;
    title.append(link);
    heading.append(title, node('span', 'Ver parcela', 'provider-farm-hint'));
    const info = node('dl', null, 'provider-farm-info');
    for (const [label, value] of [['Actividad económica', farm.actividadEconomica],
      ['Municipio', farm.municipio], ['Estado', farm.estado], ['País', farm.pais]]) {
      const item = node('div');
      item.append(node('dt', label), node('dd', value || 'No disponible'));
      info.append(item);
    }
    article.append(heading, info, ParcelPreview.create(farm));
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
