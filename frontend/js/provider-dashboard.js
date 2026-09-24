document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('provider-farms');
  const status = document.getElementById('farms-status');
  const retry = document.getElementById('farms-retry');
  let providerId = null;
  let generation = 0;
  let analyzing = false;
  const analysisButtons = new Set();
  window.addEventListener('beforeunload', event => {
    if (analyzing) { event.preventDefault(); event.returnValue = ''; }
  });
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function card(farm) {
    const details = node('details', null, 'provider-farm');
    const summary = node('summary');
    summary.append(node('span', farm.nombre, 'provider-farm-name'));
    summary.append(node('span', 'Ver información', 'expand-label'));
    const body = node('div', null, 'provider-farm-body');
    const dl = node('dl');
    for (const [label, value] of [['Productor', farm.productor], ['Actividad económica', farm.actividadEconomica],
      ['Ciudad', farm.ciudad], ['Municipio', farm.municipio], ['Estado', farm.estado], ['País', farm.pais]]) {
      dl.append(node('dt', label), node('dd', value || 'No disponible'));
    }
    body.append(dl, node('h3', 'Historia'), node('p', farm.historia || 'Historia no disponible.', 'farm-story'));
    if (farm.ubicacionAtribucion) body.append(node('p', farm.ubicacionAtribucion, 'attribution'));
    const link = node('a', 'Ver perfil público y análisis disponible', 'button outline');
    link.href = `/parcela.html?id=${encodeURIComponent(farm.farmId)}`;
    body.append(link);
    const analysis = node('section', null, 'provider-analysis');
    const run = node('button', 'Ejecutar análisis', 'button');
    run.type = 'button';
    analysisButtons.add(run);
    const message = node('p', 'Usa los periodos predeterminados del motor satelital. El resultado se guardará y será visible en el perfil público.');
    message.setAttribute('role', 'status');
    const result = node('div', null, 'provider-analysis-result');
    analysis.append(node('h3', 'Análisis satelital'), run, message, result);
    if (farm.esDemostracion) analysis.append(node('p', 'Caso de demostración: este botón ejecuta el motor satelital sobre el polígono registrado; no genera datos de ejemplo.', 'attribution'));
    body.append(analysis);
    run.addEventListener('click', async () => {
      if (analyzing) return;
      analyzing = true;
      for (const button of analysisButtons) button.disabled = true;
      document.dispatchEvent(new Event('provider-analysis-start'));
      analysis.setAttribute('aria-busy', 'true');
      result.replaceChildren();
      message.textContent = 'Comprobando la sesión…';
      let submitted = false;
      try {
        const provider = await ProviderAuth.currentProvider();
        if (provider.providerId !== providerId) throw new Error('La sesión cambió');
        message.textContent = 'Procesando imágenes satelitales y guardando el resultado… Puede tardar varios minutos. Mantén esta página abierta.';
        submitted = true;
        const data = await ProviderAuth.request(`/farms/${encodeURIComponent(farm.farmId)}/analyze`, 'POST', {}, 180000);
        if (data.farmId !== farm.farmId || !data.analysisId || !Number.isFinite(data.score)) throw new Error('Respuesta inválida');
        result.append(node('p', `Score ecológico: ${data.score.toLocaleString('es-MX', { maximumFractionDigits: 2 })} / 100 · Riesgo: ${data.nivelRiesgo}`, 'analysis-metric'));
        result.append(node('p', data.resumenEjecutivo || 'Resumen no disponible.'));
        for (const [label, period] of [['Referencia', data.periodoReferencia], ['Reciente', data.periodoReciente]]) {
          result.append(node('p', `${label}: ${period?.inicio || 'No disponible'} — ${period?.fin || 'No disponible'}`));
        }
        message.textContent = 'Análisis guardado. Abre el perfil público para consultar los índices y el detalle.';
        run.textContent = 'Ejecutar nuevo análisis';
      } catch (error) {
        if (error.status === 401) {
          window.location.replace('/acceso.html');
          return;
        }
        message.textContent = !submitted ? 'No pudimos comprobar la sesión. Inténtalo de nuevo.'
          : error.status === 502 ? 'El servicio satelital no pudo completar el análisis. Puedes intentarlo de nuevo.'
          : error.status === 404 ? 'La parcela ya no está disponible. Recarga Mis parcelas.'
          : 'No pudimos confirmar el resultado. El servidor podría seguir procesando o haberlo guardado. Consulta el perfil público antes de ejecutar otro análisis.';
      } finally {
        analyzing = false;
        analysis.setAttribute('aria-busy', 'false');
        for (const button of analysisButtons) button.disabled = false;
        document.dispatchEvent(new Event('provider-analysis-end'));
      }
    });
    details.append(summary, body);
    return details;
  }
  async function load() {
    const current = ++generation;
    list.replaceChildren();
    analysisButtons.clear();
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
