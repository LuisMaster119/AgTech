/**
 * AgTech — UI Components & Views Manager Module
 */

const UI = {
  loadingInterval: null,

  /**
   * Muestra una notificación Toast flotante.
   * @param {string} message - Texto del mensaje
   * @param {'success'|'error'|'info'} [type='info'] - Tipo de notificación
   * @param {number} [duration=4000] - Tiempo en ms antes de desaparecer
   */
  showToast(message, type = 'info', duration = 4500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="#10b981" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="#ef4444" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="#3b82f6" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-text">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Abre el modal para nombrar y confirmar la granja dibujada.
   * @param {number} vertexCount - Cantidad de vértices del polígono
   */
  openFarmModal(vertexCount = 4) {
    const modal = document.getElementById('farm-modal');
    const verticesCountEl = document.getElementById('summary-vertices-count');
    const nameInput = document.getElementById('farm-name-input');

    if (verticesCountEl) {
      verticesCountEl.textContent = `${vertexCount} vértices`;
    }
    if (nameInput) {
      nameInput.value = '';
    }

    modal?.classList.remove('hidden');
    setTimeout(() => nameInput?.focus(), 100);
  },

  /**
   * Cierra el modal de registro de granja.
   */
  closeFarmModal() {
    document.getElementById('farm-modal')?.classList.add('hidden');
  },

  /**
   * Muestra la pantalla de carga con simulación de progreso en las etapas satelitales.
   */
  showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');

    const steps = [
      { id: 'step-1', text: 'Registrando polígono del predio en Firestore...' },
      { id: 'step-2', text: 'Descargando compuestos Sentinel-2 (Reciente y Referencia en GEE)...' },
      { id: 'step-3', text: 'Calculando índices multiespectrales NDVI, NDMI, NDBI y buffer de 500m...' },
      { id: 'step-4', text: 'Evaluando deltas diferenciales y generando certificado técnico...' }
    ];

    // Reset step styles
    steps.forEach((s, idx) => {
      const el = document.getElementById(s.id);
      if (el) {
        el.className = 'p-step' + (idx === 0 ? ' active' : '');
      }
    });

    let currentStepIdx = 0;
    const descEl = document.getElementById('loading-step-description');
    if (descEl) descEl.textContent = steps[0].text;

    clearInterval(this.loadingInterval);
    this.loadingInterval = setInterval(() => {
      if (currentStepIdx < steps.length - 1) {
        // Mark previous as done
        const prevEl = document.getElementById(steps[currentStepIdx].id);
        if (prevEl) prevEl.className = 'p-step done';

        currentStepIdx++;
        const curEl = document.getElementById(steps[currentStepIdx].id);
        if (curEl) curEl.className = 'p-step active';
        if (descEl) descEl.textContent = steps[currentStepIdx].text;
      }
    }, 4500);
  },

  /**
   * Oculta la pantalla de carga.
   */
  hideLoading() {
    clearInterval(this.loadingInterval);
    document.getElementById('loading-overlay')?.classList.add('hidden');
  },

  /**
   * Despliega el Certificado de Pre-evaluación con todos los datos y desglose explicable.
   * @param {Object} data - Objeto CertificateResponse o AnalysisResponse del backend
   */
  openCertificateModal(data) {
    const modal = document.getElementById('certificate-modal');
    if (!modal || !data) return;

    // 1. Cabecera y Metadatos
    const dateFormatted = data.fechaCreacion 
      ? new Date(data.fechaCreacion).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('es-ES');
    
    document.getElementById('cert-date').textContent = `Fecha: ${dateFormatted}`;
    document.getElementById('cert-farm-name').textContent = data.farmNombre || 'Predio Agrícola';
    document.getElementById('cert-farm-id').textContent = `ID Granja: ${data.farmId}`;
    document.getElementById('cert-analysis-id').textContent = `Analysis ID: ${data.analysisId || data.farmId}`;

    if (data.periodoReciente) {
      document.getElementById('cert-recent-period').textContent = 
        `${data.periodoReciente.inicio} a ${data.periodoReciente.fin}`;
    }
    if (data.periodoReferencia) {
      document.getElementById('cert-ref-period').textContent = 
        `${data.periodoReferencia.inicio} a ${data.periodoReferencia.fin}`;
    }

    // 2. Score y Nivel de Riesgo
    const scoreVal = Math.round(data.score ?? 0);
    document.getElementById('cert-score-number').textContent = scoreVal;

    const riskBanner = document.getElementById('cert-score-banner');
    const riskBadge = document.getElementById('cert-risk-badge');
    const riskLevel = data.nivelRiesgo || 'Bajo';

    // Normalizar clases de riesgo
    riskBanner.className = 'score-banner';
    riskBadge.className = 'risk-badge';

    if (riskLevel === 'Bajo') {
      riskBanner.classList.add('risk-bajo');
      riskBadge.classList.add('badge-bajo');
      riskBadge.textContent = 'Riesgo Bajo';
    } else if (riskLevel === 'Medio') {
      riskBanner.classList.add('risk-medio');
      riskBadge.classList.add('badge-medio');
      riskBadge.textContent = 'Riesgo Medio';
    } else {
      riskBanner.classList.add('risk-alto');
      riskBadge.classList.add('badge-alto');
      riskBadge.textContent = 'Riesgo Alto';
    }

    // Resumen Ejecutivo
    document.getElementById('cert-executive-summary').textContent = 
      data.resumenEjecutivo || 'Pre-evaluación técnica satelital procesada con éxito.';

    // 3. Desglose de Índices Espectrales (NDVI, NDMI, NDBI)
    const indicesContainer = document.getElementById('cert-indices-container');
    if (indicesContainer && Array.isArray(data.desglose)) {
      indicesContainer.innerHTML = '';

      data.desglose.forEach((item) => {
        const impactClass = item.impacto === 'Positivo' 
          ? 'impact-positivo' 
          : item.impacto === 'Negativo' 
            ? 'impact-negativo' 
            : 'impact-neutro';

        const deltaRelSign = item.delta_relativo > 0 ? '+' : '';
        const deltaRelFormatted = `${deltaRelSign}${(item.delta_relativo).toFixed(3)}`;
        
        let deltaClass = 'neutral';
        if (item.indice === 'NDBI') {
          // Para NDBI (suelo desnudo/degradación), menor es mejor
          deltaClass = item.delta_relativo <= 0 ? 'positive' : 'negative';
        } else {
          // Para NDVI y NDMI, mayor es mejor
          deltaClass = item.delta_relativo >= 0 ? 'positive' : 'negative';
        }

        const card = document.createElement('div');
        card.className = 'index-card';
        card.innerHTML = `
          <div class="index-card-header">
            <div>
              <div class="index-code">${item.indice}</div>
              <div class="index-full-name">${item.nombre}</div>
            </div>
            <span class="index-impact-badge ${impactClass}">${item.impacto}</span>
          </div>

          <div class="index-values-row">
            <div class="val-item">
              <span class="val-label">Línea Base:</span>
              <span class="val-num">${item.valor_referencia_granja.toFixed(3)}</span>
            </div>
            <div class="val-item">
              <span class="val-label">Reciente:</span>
              <span class="val-num">${item.valor_reciente_granja.toFixed(3)}</span>
            </div>
          </div>

          <div class="delta-relative-row">
            <span class="delta-label">Diferencial vs Buffer (500m):</span>
            <span class="delta-val ${deltaClass}">${deltaRelFormatted}</span>
          </div>

          <div class="index-interpretation">
            ${item.interpretacion}
          </div>
        `;

        indicesContainer.appendChild(card);
      });
    }

    modal.classList.remove('hidden');
  },

  /**
   * Cierra el modal del certificado.
   */
  closeCertificateModal() {
    document.getElementById('certificate-modal')?.classList.add('hidden');
  },

  /**
   * Abre el Drawer lateral de Mis Granjas.
   */
  openDrawer() {
    document.getElementById('farms-drawer')?.classList.remove('hidden');
  },

  /**
   * Cierra el Drawer lateral de Mis Granjas.
   */
  closeDrawer() {
    document.getElementById('farms-drawer')?.classList.add('hidden');
  },

  /**
   * Actualiza el badge numérico con la cantidad de granjas guardadas.
   * @param {number} count - Número de granjas
   */
  updateFarmsCountBadge(count) {
    const badge = document.getElementById('farms-count-badge');
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },

  /**
   * Renderiza la lista de granjas registradas en el panel lateral.
   * @param {Array} farms - Lista de objetos de granja
   * @param {Function} onViewMap - Handler para centrar en el mapa
   * @param {Function} onViewCertificate - Handler para consultar certificado
   */
  renderFarmsList(farms, onViewMap, onViewCertificate) {
    const container = document.getElementById('farms-list-container');
    if (!container) return;

    if (!farms || farms.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🌾</div>
          <h4>No hay granjas registradas</h4>
          <p>Usa el botón "Dibujar mi parcela" sobre el mapa satelital para registrar tu primer predio.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    farms.forEach((farm) => {
      const card = document.createElement('div');
      card.className = 'farm-card';

      const dateStr = farm.fechaCreacion 
        ? new Date(farm.fechaCreacion).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Reciente';

      card.innerHTML = `
        <div class="farm-card-header">
          <div>
            <h4 class="farm-name">${farm.nombre || 'Granja Sin Nombre'}</h4>
            <span class="farm-date">Registrada: ${dateStr}</span>
          </div>
        </div>
        <div class="farm-card-actions">
          <button class="btn btn-sm btn-glass btn-farm-map" title="Ver en el mapa">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
            </svg>
            <span>Mapa</span>
          </button>
          <button class="btn btn-sm btn-primary btn-farm-cert" title="Consultar certificado satelital">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span>Certificado</span>
          </button>
        </div>
      `;

      card.querySelector('.btn-farm-map')?.addEventListener('click', () => {
        onViewMap(farm);
      });

      card.querySelector('.btn-farm-cert')?.addEventListener('click', () => {
        onViewCertificate(farm);
      });

      container.appendChild(card);
    });
  }
};

window.UI = UI;
