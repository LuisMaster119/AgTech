document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);
  let geometry = null, confirmed = false, saving = false, saved = false;
  const draw = $('start-draw'), confirm = $('confirm-polygon'), cancel = $('cancel-draw');
  function resetPolygon() {
    geometry = null; confirmed = false;
    confirm.disabled = true; $('save-parcel').disabled = true;
    $('coordinate-preview').textContent = '';
  }
  function sessionError(error) {
    if (error.status === 401) {
      $('save-status').textContent = 'Tu sesión venció. Vuelve a iniciar sesión y abre de nuevo Agregar parcela. Los datos sin guardar se perderán al salir.';
      $('login-link').hidden = false;
    } else $('save-status').textContent = error.status === 422
      ? 'Revisa el nombre y el polígono. No se pudo validar la información.'
      : 'No pudimos confirmar el guardado. Revisa Mis parcelas antes de reintentar para evitar duplicados.';
  }
  try {
    if (!ProviderAuth.token()) { window.location.replace('/acceso.html'); return; }
    await ProviderAuth.currentProvider();
    $('add-content').hidden = false;
    $('session-status').textContent = '';
  } catch (error) {
    if (error.status === 401) window.location.replace('/acceso.html');
    else $('session-status').textContent = 'No pudimos comprobar la sesión. Recarga la página para reintentar.';
    return;
  }
  try {
    if (!window.L?.Draw) throw new Error('Mapa no disponible');
    MapModule.init('map', data => {
      geometry = data.geojson;
      confirmed = false;
      confirm.disabled = false;
      $('save-parcel').disabled = true;
      $('polygon-status').textContent = `Polígono de ${data.vertexCount} vértices. Revisa su forma y confirma para continuar.`;
      $('coordinate-preview').textContent = geometry.coordinates[0].map(point => `${point[0]}, ${point[1]}`).join('\n');
    });
    draw.disabled = false;
    MapModule.map.on('draw:drawstop', () => {
      if (!geometry) $('polygon-status').textContent = 'No hay un polígono confirmado. Pulsa Dibujar parcela para comenzar.';
    });
  } catch (error) {
    $('polygon-status').textContent = 'No pudimos cargar el mapa de dibujo. Recarga la página para reintentar.';
  }
  draw.addEventListener('click', () => {
    MapModule.cancelDrawing(); resetPolygon(); MapModule.startDrawing();
    $('polygon-status').textContent = 'Marca cada esquina y pulsa el primer punto para cerrar el polígono.';
  });
  cancel.addEventListener('click', () => {
    MapModule.cancelDrawing(); MapModule.clearDrawnLayers(); resetPolygon();
    $('polygon-status').textContent = 'Polígono descartado. Puedes dibujar otro.';
  });
  confirm.addEventListener('click', () => {
    if (!geometry) return;
    confirmed = true; confirm.disabled = true; $('save-parcel').disabled = false;
    $('polygon-status').textContent = 'Polígono confirmado. Completa los datos y guarda la parcela.';
    $('nombre').focus();
  });
  $('parcel-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!confirmed || !geometry || saving || saved) return;
    saving = true;
    $('save-status').textContent = 'Guardando parcela…';
    $('login-link').hidden = true;
    const payload = { geojson: geometry };
    for (const key of ['nombre', 'productor', 'historia', 'actividadEconomica', 'ciudad', 'municipio', 'estado', 'pais']) {
      payload[key] = $(key).value.trim() || null;
    }
    $('form-fields').disabled = true;
    draw.disabled = cancel.disabled = confirm.disabled = true;
    try {
      const farm = await ProviderAuth.request('/providers/me/farms', 'POST', payload);
      saved = true;
      $('save-status').textContent = '';
      $('save-result').hidden = false;
      $('saved-name').textContent = `${farm.nombre} se guardó correctamente.`;
      $('saved-profile').href = `/parcela.html?id=${encodeURIComponent(farm.farmId)}`;
      $('save-result').scrollIntoView();
    } catch (error) {
      sessionError(error);
      $('form-fields').disabled = false;
      draw.disabled = cancel.disabled = false;
    } finally { saving = false; }
  });
  window.addEventListener('beforeunload', event => {
    if (!saved && (geometry || $('nombre').value)) { event.preventDefault(); event.returnValue = ''; }
  });
});
