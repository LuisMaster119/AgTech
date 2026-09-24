/* Micrositio público: lee perfil y análisis almacenado, nunca los modifica. */
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const farmId = new URLSearchParams(window.location.search).get('id')?.trim();
  const text = (id, value) => { $(id).textContent = value; };
  const number = value => typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('es-MX', { maximumFractionDigits: 4 }) : 'No disponible';
  const period = value => value?.inicio && value?.fin ? `${value.inicio} — ${value.fin}` : 'No disponible';
  let mapInitialized = false;
  let analysisReady = false, sealReady = false, shareReady = false;
  function updateReport() {
    const ready = analysisReady && sealReady && shareReady;
    $('print-report').disabled = !ready;
    document.body.classList.toggle('report-ready', ready);
    text('report-status', ready ? 'Documento listo. Puedes imprimirlo o elegir Guardar como PDF en el diálogo de impresión.'
      : 'Se requiere un análisis almacenado, la evaluación del perfil y el QR para imprimir.');
  }
  async function loadShare() {
    shareReady = false; updateReport();
    $('share-content').hidden = true;
    $('share-retry').hidden = true;
    text('share-status', 'Preparando enlace…');
    try {
      const share = await API.readPublic(`/farms/${encodeURIComponent(farmId)}/share`);
      const url = new URL(share.publicUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Enlace inválido');
      $('profile-url').href = url.href;
      $('profile-url').textContent = url.href;
      $('profile-qr').src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(share.qrSvg)}`;
      await $('profile-qr').decode();
      text('share-note', ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        ? 'Este QR apunta a este equipo (localhost). Para abrirlo desde un celular necesitas una dirección accesible y configurar PUBLIC_BASE_URL en el servidor.'
        : 'El dispositivo que escanee el QR debe tener acceso a esta dirección.');
      $('share-content').hidden = false;
      text('share-status', 'Enlace y QR disponibles.');
      shareReady = true;
    } catch (error) {
      text('share-status', 'No pudimos preparar el enlace y QR.');
      $('share-retry').hidden = false;
    } finally { updateReport(); }
  }

  function showState(title, copy, retry = false) {
    text('state-title', title);
    text('state-copy', copy);
    $('parcel-state').hidden = false;
    $('parcel-retry').hidden = !retry;
  }

  function showMap(farm) {
    try {
      if (!window.L) throw new Error('Mapa no disponible');
      if (!mapInitialized) {
        MapModule.init('map', null, { readOnly: true });
        mapInitialized = true;
      }
      MapModule.clearDrawnLayers();
      const polygon = L.geoJSON(farm.geojson, {
        style: { color: '#a1f4c8', fillColor: '#116c4a', fillOpacity: .4, weight: 3 }
      });
      if (!polygon.getBounds().isValid()) throw new Error('Sin geometría');
      MapModule.drawnItems.addLayer(polygon);
      MapModule.map.invalidateSize();
      MapModule.map.fitBounds(polygon.getBounds(), { padding: [35, 35], maxZoom: 17 });
      text('map-status', 'Polígono registrado de la parcela.');
      if (!document.querySelector('.buffer-controls')) BufferView.init(farmId);
    } catch (error) {
      text('map-status', 'No pudimos mostrar el mapa o la geometría. El resto de la información sigue disponible.');
    }
  }

  function showProfile(farm) {
    document.title = `${farm.nombre} · Tlalli · Quetzalcode`;
    text('parcel-name', farm.nombre);
    text('parcel-producer', farm.productor ? `Productor: ${farm.productor}` : 'Productor no disponible');
    text('parcel-activity', farm.actividadEconomica || 'Actividad económica no disponible');
    text('parcel-story', farm.historia || 'La historia de esta parcela todavía no está disponible.');
    $('demo-label').hidden = !farm.esDemostracion;
    $('parcel-location').replaceChildren();
    for (const [label, key] of [['Ciudad', 'ciudad'], ['Municipio', 'municipio'], ['Estado', 'estado'], ['País', 'pais']]) {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = farm[key] || 'No disponible';
      $('parcel-location').append(dt, dd);
    }
    text('location-attribution', farm.ubicacionAtribucion || '');
    $('location-attribution').hidden = !farm.ubicacionAtribucion;
    $('parcel-state').hidden = true;
    $('parcel-content').hidden = false;
    showMap(farm);
  }

  async function loadSeal() {
    sealReady = false; updateReport();
    $('seal-content').hidden = true;
    $('seal-retry').hidden = true;
    text('seal-status', 'Consultando la evaluación del perfil…');
    try {
      const evaluation = await API.getFarmSeal(farmId);
      if (evaluation.farmId !== farmId || !['cumple', 'faltan_datos'].includes(evaluation.estado)
        || !Array.isArray(evaluation.criterios)) throw new Error('Respuesta inválida');
      text('seal-status', evaluation.estado === 'cumple'
        ? 'Nivel I Base · Perfil documentado' : 'Nivel I Base · Faltan datos');
      text('seal-demo', evaluation.esDemostracion ? 'Caso de demostración · Evaluación con datos de ejemplo' : '');
      $('seal-demo').hidden = !evaluation.esDemostracion;
      text('seal-scope', evaluation.alcance);
      text('seal-version', `Criterios ${evaluation.versionCriterios} · Evaluado el ${new Date(evaluation.fechaEvaluacion).toLocaleDateString('es-MX')}`);
      $('seal-criteria').replaceChildren();
      for (const criterion of evaluation.criterios) {
        const item = document.createElement('li');
        item.textContent = `${criterion.cumple ? 'Cumple' : 'Falta o requiere corrección'}: ${criterion.descripcion}`;
        $('seal-criteria').append(item);
      }
      $('seal-pending').replaceChildren();
      for (const level of evaluation.nivelesPendientes) {
        const item = document.createElement('li');
        item.textContent = level;
        $('seal-pending').append(item);
      }
      $('seal-content').hidden = false;
      sealReady = true;
    } catch (error) {
      text('seal-status', 'No pudimos consultar la evaluación del perfil.');
      $('seal-retry').hidden = false;
    } finally { updateReport(); }
  }

  async function loadAnalysis() {
    analysisReady = false; updateReport();
    $('analysis-content').hidden = true;
    $('analysis-retry').hidden = true;
    document.querySelector('.analysis-section').setAttribute('aria-busy', 'true');
    text('analysis-status', 'Consultando el análisis almacenado…');
    try {
      const analysis = await API.getFarmAnalysis(farmId);
      if (!analysis || analysis.farmId !== farmId) throw new Error('Respuesta inválida');
      text('analysis-score', `${number(analysis.score)}${typeof analysis.score === 'number' ? ' / 100' : ''}`);
      text('analysis-risk', `Riesgo ecológico: ${analysis.nivelRiesgo || 'No disponible'}`);
      const date = analysis.fechaCreacion ? new Date(analysis.fechaCreacion) : null;
      text('analysis-date', date && !Number.isNaN(date.getTime())
        ? `Análisis registrado el ${date.toLocaleDateString('es-MX')}` : 'Fecha del análisis no disponible');
      text('analysis-summary', analysis.resumenEjecutivo || 'Resumen no disponible.');
      text('reference-period', `Periodo de referencia: ${period(analysis.periodoReferencia)}`);
      text('recent-period', `Periodo reciente: ${period(analysis.periodoReciente)}`);
      $('indices-body').replaceChildren();
      for (const index of ['ndvi', 'ndmi', 'ndbi']) {
        const row = document.createElement('tr');
        const heading = document.createElement('th');
        heading.scope = 'row';
        heading.textContent = index.toUpperCase();
        row.append(heading);
        for (const [range, area] of [['referencia', 'granja'], ['reciente', 'granja'], ['referencia', 'buffer'], ['reciente', 'buffer']]) {
          const cell = document.createElement('td');
          cell.textContent = number(analysis.indices?.[range]?.[`${index}_${area}`]);
          row.append(cell);
        }
        $('indices-body').append(row);
      }
      $('analysis-content').hidden = false;
      text('analysis-status', 'Resultados del último análisis almacenado.');
      text('report-analysis-id', `Análisis: ${analysis.analysisId || 'Identificador no disponible'} · Fecha: ${analysis.fechaCreacion || 'No disponible'}`);
      analysisReady = Boolean(analysis.analysisId);
    } catch (error) {
      text('analysis-status', error.status === 404 ? 'No hay un análisis disponible para esta parcela.'
        : 'No pudimos consultar el análisis. Puedes seguir consultando la información de la parcela.');
      $('analysis-retry').hidden = error.status === 404;
    } finally {
      document.querySelector('.analysis-section').setAttribute('aria-busy', 'false');
      updateReport();
    }
  }

  async function load() {
    $('parcel-main').setAttribute('aria-busy', 'true');
    $('parcel-content').hidden = true;
    showState('Cargando parcela…', 'Consultando su información pública.');
    try {
      const farm = await API.getFarm(farmId);
      if (!farm || farm.farmId !== farmId || !farm.nombre) throw new Error('Respuesta inválida');
      showProfile(farm);
      // Fallos del análisis no impiden consultar el perfil.
      loadAnalysis();
      loadSeal();
      loadShare();
    } catch (error) {
      showState(error.status === 404 ? 'Parcela no encontrada' : 'No pudimos cargar la parcela',
        error.status === 404 ? 'Revisa el enlace o vuelve al catálogo para elegir otra parcela.'
          : 'Revisa tu conexión e inténtalo de nuevo.', error.status !== 404);
    } finally {
      $('parcel-main').setAttribute('aria-busy', 'false');
    }
  }
  $('parcel-retry').addEventListener('click', load);
  $('analysis-retry').addEventListener('click', loadAnalysis);
  $('seal-retry').addEventListener('click', loadSeal);
  $('share-retry').addEventListener('click', loadShare);
  $('print-report').addEventListener('click', () => {
    if (analysisReady && sealReady && shareReady) window.print();
  });
  if (!farmId || farmId.includes('/') || farmId === '.' || farmId === '..') {
    showState('Enlace de parcela incompleto', 'Vuelve al catálogo y selecciona una parcela.');
    $('parcel-main').setAttribute('aria-busy', 'false');
  } else load();
});
