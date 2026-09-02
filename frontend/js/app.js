/**
 * AgTech — Main Application Controller
 * Orchestrates mapping, user interactions, satellite analysis pipeline, and certificate views.
 */

document.addEventListener('DOMContentLoaded', () => {
  let pendingPolygonGeoJSON = null;
  let allFarms = [];
  let currentActiveFarm = null;
  let searchDebounceTimeout = null;

  // 1. Inicialización del mapa Leaflet
  MapModule.init('map', (drawnData) => {
    pendingPolygonGeoJSON = drawnData.geojson;
    UI.openFarmModal(drawnData.vertexCount);
  });

  // 2. Cargar granjas registradas al inicio
  loadFarmsList();

  // =========================================================================
  // Control de Dibujo de Parcelas
  // =========================================================================
  const btnDrawParcel = document.getElementById('btn-draw-parcel');
  const btnCancelDraw = document.getElementById('btn-cancel-draw');
  const btnCancelFarm = document.getElementById('btn-cancel-farm');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  btnDrawParcel?.addEventListener('click', () => {
    UI.closeDrawer();
    UI.closeCertificateModal();
    UI.closeFarmModal();
    MapModule.startDrawing();
    UI.showToast('Haz clic en el mapa para marcar los vértices de tu predio.', 'info');
  });

  btnCancelDraw?.addEventListener('click', () => {
    MapModule.cancelDrawing();
    UI.showToast('Dibujo cancelado.', 'info');
  });

  btnCancelFarm?.addEventListener('click', () => {
    pendingPolygonGeoJSON = null;
    MapModule.clearDrawnLayers();
    UI.closeFarmModal();
    UI.showToast('Polígono descartado.', 'info');
  });

  modalCloseBtn?.addEventListener('click', () => {
    pendingPolygonGeoJSON = null;
    MapModule.clearDrawnLayers();
    UI.closeFarmModal();
  });

  // =========================================================================
  // Envío del Formulario de Registro y Ejecución del Análisis Satelital
  // =========================================================================
  const farmForm = document.getElementById('farm-form');
  const farmNameInput = document.getElementById('farm-name-input');

  farmForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const farmName = farmNameInput.value.trim();
    if (!farmName) {
      UI.showToast('Por favor escribe un nombre para tu granja.', 'error');
      return;
    }

    if (!pendingPolygonGeoJSON) {
      UI.showToast('No se encontró la geometría del predio. Intenta dibujarlo de nuevo.', 'error');
      return;
    }

    // Cerrar modal de nombramiento e iniciar pantalla de carga
    UI.closeFarmModal();
    UI.showLoading();

    try {
      // Paso A: Guardar la granja en Firestore
      console.log('Registrando granja en backend:', farmName);
      const createdFarm = await API.createFarm(farmName, pendingPolygonGeoJSON);
      const farmId = createdFarm.farmId;

      // Paso B: Ejecutar el análisis multiespectral satelital en Earth Engine
      console.log('Iniciando análisis multitemporal satelital para:', farmId);
      const analysisResult = await API.analyzeFarm(farmId, {});

      // Paso C: Consultar certificado oficial formateado
      let certData;
      try {
        certData = await API.getFarmCertificate(farmId);
      } catch (certErr) {
        // Fallback al resultado directo del análisis con el nombre de la granja
        certData = { ...analysisResult, farmNombre: farmName };
      }

      currentActiveFarm = {
        farmId: farmId,
        nombre: farmName,
        geojson: pendingPolygonGeoJSON
      };

      // Paso D: Ocultar carga y presentar certificado
      UI.hideLoading();
      UI.openCertificateModal(certData);
      UI.showToast('¡Certificado satelital generado exitosamente!', 'success');

      // Actualizar lista histórica de granjas
      loadFarmsList();
    } catch (error) {
      UI.hideLoading();
      console.error('Error durante el flujo de análisis:', error);
      UI.showToast(`Error en el análisis: ${error.message}`, 'error', 6000);
    }
  });

  // =========================================================================
  // Búsqueda Geográfica (Nominatim OpenStreetMap con Debounce)
  // =========================================================================
  const searchInput = document.getElementById('location-search-input');
  const searchResultsList = document.getElementById('search-results-list');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const searchSubmitBtn = document.getElementById('search-submit-btn');

  const executeSearch = async (query) => {
    if (!query || query.trim().length < 2) {
      searchResultsList.classList.add('hidden');
      return;
    }

    const results = await API.searchNominatim(query);
    if (!results || results.length === 0) {
      searchResultsList.innerHTML = `
        <li style="color: #94a3b8; font-style: italic;">No se encontraron ubicaciones</li>
      `;
      searchResultsList.classList.remove('hidden');
      return;
    }

    searchResultsList.innerHTML = '';
    results.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <svg class="search-result-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <span class="search-result-text" title="${item.display_name}">${item.display_name}</span>
      `;

      li.addEventListener('click', () => {
        searchInput.value = item.display_name.split(',')[0];
        searchResultsList.classList.add('hidden');
        searchClearBtn?.classList.remove('hidden');

        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const bbox = item.boundingbox ? item.boundingbox.map(Number) : null;
        MapModule.flyToLocation(lat, lon, bbox);
        UI.showToast(`Centrado en: ${item.display_name.split(',')[0]}`, 'info');
      });

      searchResultsList.appendChild(li);
    });

    searchResultsList.classList.remove('hidden');
  };

  searchInput?.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.length > 0) {
      searchClearBtn?.classList.remove('hidden');
    } else {
      searchClearBtn?.classList.add('hidden');
      searchResultsList.classList.add('hidden');
    }

    clearTimeout(searchDebounceTimeout);
    // Debounce de 700ms para respetar políticas de uso razonable de Nominatim
    searchDebounceTimeout = setTimeout(() => {
      executeSearch(val);
    }, 700);
  });

  searchSubmitBtn?.addEventListener('click', () => {
    executeSearch(searchInput.value);
  });

  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch(searchInput.value);
    }
  });

  searchClearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.classList.add('hidden');
    searchResultsList.classList.add('hidden');
  });

  // Cerrar sugerencias al hacer clic fuera del buscador
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      searchResultsList?.classList.add('hidden');
    }
  });

  // =========================================================================
  // Acciones en el Certificado
  // =========================================================================
  const btnPrintCert = document.getElementById('btn-print-certificate');
  const btnViewOnMap = document.getElementById('btn-view-on-map');
  const btnCloseCert = document.getElementById('btn-close-certificate');

  btnPrintCert?.addEventListener('click', () => {
    window.print();
  });

  btnViewOnMap?.addEventListener('click', () => {
    UI.closeCertificateModal();
    if (currentActiveFarm && currentActiveFarm.geojson) {
      MapModule.showGeoJSON(currentActiveFarm.geojson, currentActiveFarm.nombre);
      UI.showToast(`Visualizando predio '${currentActiveFarm.nombre}' en el mapa.`, 'info');
    }
  });

  btnCloseCert?.addEventListener('click', () => {
    UI.closeCertificateModal();
  });

  // =========================================================================
  // Panel "Mis Granjas"
  // =========================================================================
  const btnMyFarms = document.getElementById('btn-my-farms');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const filterFarmsInput = document.getElementById('filter-farms-input');

  btnMyFarms?.addEventListener('click', () => {
    UI.openDrawer();
    loadFarmsList();
  });

  btnCloseDrawer?.addEventListener('click', () => {
    UI.closeDrawer();
  });

  filterFarmsInput?.addEventListener('input', (e) => {
    const filterText = e.target.value.toLowerCase();
    const filtered = allFarms.filter((f) => 
      (f.nombre || '').toLowerCase().includes(filterText)
    );
    renderFarms(filtered);
  });

  /**
   * Carga la lista de granjas del backend y actualiza la vista.
   */
  async function loadFarmsList() {
    try {
      allFarms = await API.getFarms();
      UI.updateFarmsCountBadge(allFarms.length);
      renderFarms(allFarms);
    } catch (err) {
      console.warn('No se pudieron recuperar las granjas:', err);
    }
  }

  /**
   * Renderiza las granjas con los callbacks correspondientes.
   */
  function renderFarms(farms) {
    UI.renderFarmsList(
      farms,
      // Callback: Ver en Mapa
      (farm) => {
        currentActiveFarm = farm;
        UI.closeDrawer();
        MapModule.showGeoJSON(farm.geojson, farm.nombre);
        UI.showToast(`Centrado en predio: ${farm.nombre}`, 'info');
      },
      // Callback: Ver Certificado
      async (farm) => {
        currentActiveFarm = farm;
        UI.closeDrawer();
        UI.showLoading();

        try {
          let certData;
          try {
            certData = await API.getFarmCertificate(farm.farmId);
          } catch (e) {
            // Si la granja no tiene análisis previo, ejecutarlo ahora
            UI.showToast('Calculando análisis satelital inicial para la granja...', 'info');
            const analysis = await API.analyzeFarm(farm.farmId, {});
            certData = { ...analysis, farmNombre: farm.nombre };
          }

          UI.hideLoading();
          UI.openCertificateModal(certData);
        } catch (err) {
          UI.hideLoading();
          UI.showToast(`Error al obtener certificado: ${err.message}`, 'error');
        }
      }
    );
  }
});
