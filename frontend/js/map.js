/**
 * AgTech — Map Management Module (Leaflet + Esri World Imagery + Leaflet.draw)
 */

const MapModule = {
  map: null,
  drawnItems: null,
  drawControl: null,
  polygonDrawer: null,
  currentPolygonLayer: null,
  currentGeoJSON: null,
  onPolygonCreatedCallback: null,

  /**
   * Inicializa el mapa Leaflet centrado en México con capa satelital Esri World Imagery.
   * @param {string} containerId - ID del elemento contenedor (#map)
   * @param {Function} onPolygonCreated - Callback ejecutado al cerrar un polígono
   */
  init(containerId = 'map', onPolygonCreated = null, { readOnly = false } = {}) {
    this.onPolygonCreatedCallback = onPolygonCreated;

    // Centro por defecto: Región Central de México (lat: 20.5, lng: -99.5), Zoom: 6
    const defaultCenter = [20.5, -99.5];
    const defaultZoom = 6;

    this.map = L.map(containerId, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true,
      minZoom: 3,
      maxZoom: 19
    });

    // Capa base satelital: Esri World Imagery (gratuito, sin API Key)
    const esriWorldImagery = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      }
    );
    esriWorldImagery.addTo(this.map);

    // Opcional: Capa de referencia de límites y etiquetas para mayor contexto geográfico
    const esriReferenceLabels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '',
        maxZoom: 19,
        opacity: 0.75
      }
    );
    esriReferenceLabels.addTo(this.map);

    // FeatureGroup para almacenar las capas dibujadas
    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);

    // El catálogo reutiliza el mapa sin cargar ni activar Leaflet.draw.
    if (readOnly) return;

    // Configuración del objeto de dibujo de polígono con estilos visuales esmeralda
    const polygonOptions = {
      allowIntersection: false,
      showArea: true,
      drawError: {
        color: '#ef4444',
        message: '<strong>Error:</strong> Los bordes del polígono no pueden cruzarse.'
      },
      shapeOptions: {
        color: '#10b981',
        weight: 3,
        opacity: 0.9,
        fillColor: '#10b981',
        fillOpacity: 0.28
      }
    };

    this.polygonDrawer = new L.Draw.Polygon(this.map, polygonOptions);

    // Suscripción a eventos de Leaflet.draw
    this.map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer;
      this.clearDrawnLayers();
      
      this.currentPolygonLayer = layer;
      this.drawnItems.addLayer(layer);

      // Convertir a GeoJSON estricto
      const rawGeoJSON = layer.toGeoJSON();
      // Garantizar estructura Polygon
      this.currentGeoJSON = rawGeoJSON.geometry || rawGeoJSON;

      // Calcular vértices
      const latlngs = layer.getLatLngs();
      const outerRing = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
      const vertexCount = outerRing.length;

      // Ocultar banner de dibujo
      document.getElementById('drawing-banner')?.classList.add('hidden');

      // Notificar al controlador principal
      if (typeof this.onPolygonCreatedCallback === 'function') {
        this.onPolygonCreatedCallback({
          geojson: this.currentGeoJSON,
          vertexCount: vertexCount,
          bounds: layer.getBounds()
        });
      }
    });

    this.map.on('draw:drawstart', () => {
      document.getElementById('drawing-banner')?.classList.remove('hidden');
    });

    this.map.on('draw:drawstop', () => {
      // Si no se creó un polígono, ocultar banner
      if (!this.currentPolygonLayer) {
        document.getElementById('drawing-banner')?.classList.add('hidden');
      }
    });
  },

  /**
   * Activa el modo de dibujo de polígono para que el usuario trace su predio.
   */
  startDrawing() {
    this.clearDrawnLayers();
    if (this.polygonDrawer) {
      this.polygonDrawer.enable();
      document.getElementById('drawing-banner')?.classList.remove('hidden');
    }
  },

  /**
   * Cancela el modo de dibujo en curso.
   */
  cancelDrawing() {
    if (this.polygonDrawer) {
      this.polygonDrawer.disable();
    }
    document.getElementById('drawing-banner')?.classList.add('hidden');
  },

  /**
   * Limpia las capas de dibujo y polígonos cargados en el mapa.
   */
  clearDrawnLayers() {
    if (this.drawnItems) {
      this.drawnItems.clearLayers();
    }
    this.currentPolygonLayer = null;
    this.currentGeoJSON = null;
  },

  /**
   * Carga y muestra un polígono GeoJSON existente en el mapa (ej. al seleccionar de Mis Granjas).
   * @param {Object} geojson - Geometría GeoJSON del polígono
   * @param {string} [title=""] - Nombre opcional para el popup
   */
  showGeoJSON(geojson, title = '') {
    this.clearDrawnLayers();

    try {
      const layer = L.geoJSON(geojson, {
        style: {
          color: '#10b981',
          weight: 3,
          opacity: 0.95,
          fillColor: '#10b981',
          fillOpacity: 0.3
        }
      });

      if (title) {
        layer.bindPopup(`<strong>${title}</strong><br>Polígono registrado`);
      }

      this.drawnItems.addLayer(layer);
      this.currentPolygonLayer = layer;
      this.currentGeoJSON = geojson;

      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
      }
    } catch (e) {
      console.error('Error al renderizar GeoJSON en mapa:', e);
    }
  },

  /**
   * Centra el mapa suavemente en una ubicación geocodificada.
   * @param {number} lat - Latitud
   * @param {number} lon - Longitud
   * @param {Array} [bbox] - Bounding box opcional [minLat, maxLat, minLon, maxLon]
   */
  flyToLocation(lat, lon, bbox = null) {
    if (bbox && bbox.length === 4) {
      const southWest = L.latLng(bbox[0], bbox[2]);
      const northEast = L.latLng(bbox[1], bbox[3]);
      const bounds = L.latLngBounds(southWest, northEast);
      this.map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      this.map.flyTo([lat, lon], 14, { duration: 1.5 });
    }
  }
};

window.MapModule = MapModule;
