/* Vista estática de Esri World Imagery: solo geometría de la parcela, sin buffer. */
const ParcelPreview = {
  geometry(geometry) {
    try {
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
        : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
      if (!polygons.length) return null;
      const rings = polygons.flatMap(polygon => {
        if (!Array.isArray(polygon) || !polygon.length) throw new Error('Polígono vacío');
        return polygon;
      });
      let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
      const projected = rings.map(ring => {
        if (!Array.isArray(ring) || ring.length < 4) throw new Error('Anillo inválido');
        const first = ring[0], last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) throw new Error('Anillo abierto');
        return ring.map(([lon, lat]) => {
          if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 85.05112878) throw new Error('Coordenadas inválidas');
          const x = 6378137 * lon * Math.PI / 180;
          const y = 6378137 * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
          xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
          ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
          return [x, y];
        });
      });
      // No mostrar una extensión mundial para parcelas que cruzan el antimeridiano.
      if (xmax <= xmin || ymax <= ymin || xmax - xmin > Math.PI * 6378137) return null;
      const width = 640, height = 360;
      const scale = Math.max((xmax - xmin) / width, (ymax - ymin) / height) * 1.18;
      const cx = (xmin + xmax) / 2, cy = (ymin + ymax) / 2;
      const bbox = [cx - scale * width / 2, cy - scale * height / 2, cx + scale * width / 2, cy + scale * height / 2];
      const path = projected.map(ring => ring.map(([x, y], i) => `${i ? 'L' : 'M'}${((x - bbox[0]) / scale).toFixed(2)},${((bbox[3] - y) / scale).toFixed(2)}`).join(' ') + ' Z').join(' ');
      const params = new URLSearchParams({ bbox: bbox.join(','), bboxSR: '3857', imageSR: '3857', size: `${width},${height}`, format: 'jpg', f: 'image' });
      return { url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${params}`, path, bbox };
    } catch { return null; }
  },
  create(farm) {
    const figure = document.createElement('figure');
    figure.className = 'parcel-preview';
    const status = document.createElement('p');
    status.className = 'preview-status';
    figure.append(status);
    const preview = this.geometry(farm.geojson);
    if (!preview) {
      status.textContent = 'Vista satelital no disponible';
      return figure;
    }
    status.textContent = 'Cargando vista satelital…';
    const img = document.createElement('img');
    img.alt = `Vista satelital de ${farm.nombre}`;
    img.width = 640; img.height = 360;
    img.loading = 'lazy'; img.decoding = 'async';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 640 360');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', preview.path);
    path.setAttribute('fill-rule', 'evenodd');
    svg.append(path);
    const attribution = document.createElement('a');
    attribution.className = 'preview-attribution';
    attribution.textContent = 'Esri, Maxar, Earthstar Geographics y comunidad GIS';
    attribution.href = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
    attribution.target = '_blank'; attribution.rel = 'noopener';
    img.addEventListener('load', () => { figure.classList.add('ready'); status.hidden = true; });
    img.addEventListener('error', () => {
      figure.classList.remove('ready'); img.hidden = true; status.hidden = false;
      status.textContent = 'No se pudo cargar la vista satelital';
    });
    figure.append(img, svg, attribution);
    img.src = preview.url;
    return figure;
  }
};
if (typeof module !== 'undefined') module.exports = ParcelPreview;
