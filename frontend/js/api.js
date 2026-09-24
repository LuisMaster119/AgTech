/**
 * AgTech — API Client Module
 * Handles communication with the FastAPI backend and external Nominatim geocoding.
 */

const API_BASE = window.location.origin;

const API = {
  _nominatimQueue: Promise.resolve(),
  _nominatimLastRequest: 0,
  _locationCache: new Map(),
  // Búsqueda e inversa comparten separación de peticiones en esta pantalla.
  nominatimRequest(url) {
    const request = this._nominatimQueue.then(async () => {
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 1100 - (Date.now() - this._nominatimLastRequest))));
      this._nominatimLastRequest = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Nominatim error HTTP ${response.status}`);
        return await response.json();
      } finally { clearTimeout(timer); }
    });
    this._nominatimQueue = request.catch(() => {});
    return request;
  },
  async reverseNominatim(geometry) {
    // Misma referencia aproximada que el servicio existente: primer vértice.
    const [lon, lat] = geometry.coordinates[0][0];
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) throw new Error('Coordenadas inválidas');
    const key = `${lon},${lat}`;
    if (this._locationCache.has(key)) return this._locationCache.get(key);
    const payload = await this.nominatimRequest(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lon=${lon}&lat=${lat}&addressdetails=1&accept-language=es`);
    const address = payload?.address;
    if (!address || typeof address !== 'object' || Array.isArray(address)) throw new Error('Ubicación no disponible');
    const location = {};
    for (const [field, keys] of Object.entries({ ciudad: ['city', 'town', 'village'], municipio: ['municipality'], estado: ['state'], pais: ['country'] })) {
      const value = keys.map(key => address[key]).find(value => typeof value === 'string' && value.trim() && value.trim().length <= 150);
      if (value) location[field] = value.trim();
    }
    if (this._locationCache.size >= 30) this._locationCache.delete(this._locationCache.keys().next().value);
    this._locationCache.set(key, location);
    return location;
  },
  // Lecturas del micrositio; conservan el estado HTTP para distinguir ausencia y fallo.
  async readPublic(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal
      });
      if (!response.ok) {
        const error = new Error('No se pudo consultar la información pública');
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  },
  getFarm(farmId) {
    return this.readPublic(`/farms/${encodeURIComponent(farmId)}`);
  },
  getFarmAnalysis(farmId) {
    // El endpoint existente devuelve el último análisis almacenado; no genera uno.
    return this.readPublic(`/farms/${encodeURIComponent(farmId)}/certificate`);
  },
  getFarmSeal(farmId) {
    return this.readPublic(`/farms/${encodeURIComponent(farmId)}/seal`);
  },
  /**
   * Crea una nueva granja en Firestore a partir del nombre y la geometría GeoJSON.
   * @param {string} nombre - Nombre del predio
   * @param {Object} geojson - Geometría GeoJSON (Polygon)
   * @returns {Promise<Object>} Datos de la granja creada ({ farmId, nombre, geojson, fechaCreacion })
   */
  async createFarm(nombre, geojson) {
    try {
      const response = await fetch(`${API_BASE}/farms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ nombre, geojson })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Error al crear granja (HTTP ${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error (createFarm):', error);
      throw error;
    }
  },

  /**
   * Ejecuta el pipeline satelital de Google Earth Engine para una granja.
   * @param {string} farmId - ID de la granja
   * @param {Object} [payload={}] - Opciones de rango de fechas (opcional)
   * @returns {Promise<Object>} Resultado del análisis y scoring
   */
  async analyzeFarm(farmId, payload = {}) {
    try {
      const response = await fetch(`${API_BASE}/farms/${farmId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Error al procesar análisis satelital (HTTP ${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error (analyzeFarm):', error);
      throw error;
    }
  },

  /**
   * Consulta el certificado de pre-evaluación más reciente de una granja.
   * @param {string} farmId - ID de la granja
   * @returns {Promise<Object>} Certificado con métricas y desglose
   */
  async getFarmCertificate(farmId) {
    try {
      const response = await fetch(`${API_BASE}/farms/${farmId}/certificate`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Error al consultar certificado (HTTP ${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error (getFarmCertificate):', error);
      throw error;
    }
  },

  /**
   * Obtiene la lista de todas las granjas registradas en el sistema.
   * @returns {Promise<Array>} Lista de granjas
   */
  async getFarms() {
    try {
      const response = await fetch(`${API_BASE}/farms`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Error al listar granjas (HTTP ${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error (getFarms):', error);
      throw error;
    }
  },

  /**
   * Geocodificación con Nominatim (OpenStreetMap).
   * Respeta límites y retorna lugares encontrados.
   * @param {string} query - Nombre del municipio o región
   * @returns {Promise<Array>} Resultados geocodificados [{ display_name, lat, lon, boundingbox }]
   */
  async searchNominatim(query, { throwOnError = false } = {}) {
    if (!query || query.trim().length < 2) return [];

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
      return await this.nominatimRequest(url);
    } catch (error) {
      console.warn('Geocoding Warning (Nominatim):', error);
      if (throwOnError) throw error;
      return [];
    }
  }
};

window.API = API;
