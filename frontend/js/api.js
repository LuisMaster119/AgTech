/**
 * AgTech — API Client Module
 * Handles communication with the FastAPI backend and external Nominatim geocoding.
 */

const API_BASE = window.location.origin;

const API = {
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
  async searchNominatim(query) {
    if (!query || query.trim().length < 2) return [];

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim error HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Geocoding Warning (Nominatim):', error);
      return [];
    }
  }
};

window.API = API;
