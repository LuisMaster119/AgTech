# AgTech — Certificación de Impacto Ecológico Agrícola vía Imágenes Satelitales 🛰️🌱

Backend y pipeline de análisis geoespacial satelital para la **pre-evaluación de impacto ecológico** en predios agrícolas, diseñado para apoyar procesos de certificación de exportación.

---

## 📌 Contexto y Arquitectura

El sistema evalúa si una granja está degradando el ecosistema a su alrededor a lo largo del tiempo. Para evitar sesgos por factores climáticos globales o estacionales (como sequías regionales), se implementa un **control ecológico diferencial**:

1. **Polígono de la Granja**: Geometría GeoJSON del predio a evaluar.
2. **Buffer Circundante (500m)**: Zona anular generada a 500 metros alrededor de la granja, excluyendo el área interna de la misma (`buffer.difference(farm)`).
3. **Colección Satelital**: Sentinel-2 Surface Reflectance (`COPERNICUS/S2_SR_HARMONIZED`) en Google Earth Engine con enmascaramiento de nubes y sombras (`SCL` / `QA60`) y compuesto temporal por mediana (`median()`).
4. **Índices Espectrales Evaluados**:
   - **NDVI** (Salud y densidad vegetal): $\frac{B8 - B4}{B8 + B4}$
   - **NDMI** (Humedad y estrés hídrico): $\frac{B8 - B11}{B8 + B11}$
   - **NDBI** (Suelo desnudo y degradación): $\frac{B11 - B8}{B11 + B8}$
5. **Deltas y Comparación Temporal**: Comparación entre un periodo reciente y uno de referencia (~2 años atrás) calculando el cambio relativo ($\Delta \text{Granja} - \Delta \text{Buffer}$).
6. **Almacenamiento**: Google Cloud Firestore en modo Native, base de datos Enterprise `ag-tech`.

---

## 🧮 Fórmula de Scoring Explicable (0 a 100)

El score no es una caja negra; cada componente tiene una justificación auditable:

$$\text{Delta Relativo } (Rel\Delta_X) = \Delta X_{\text{Granja}} - \Delta X_{\text{Buffer}}$$

### Ponderación y Penalizaciones (Base 100 pts)
* **NDVI (Peso máx: 45%)**: Si $Rel\Delta_{\text{NDVI}} < 0$, la granja perdió cobertura vegetal a mayor ritmo que su entorno natural.
  $$\text{Penalización}_{\text{NDVI}} = \min(45.0, |Rel\Delta_{\text{NDVI}}| \times 150.0)$$
* **NDMI (Peso máx: 30%)**: Si $Rel\Delta_{\text{NDMI}} < 0$, la granja perdió humedad o sufrió estrés hídrico mayor al del entorno.
  $$\text{Penalización}_{\text{NDMI}} = \min(30.0, |Rel\Delta_{\text{NDMI}}| \times 120.0)$$
* **NDBI (Peso máx: 25%)**: Si $Rel\Delta_{\text{NDBI}} > 0$, la granja aumentó su proporción de suelo descubierto o degradado más rápido que su entorno.
  $$\text{Penalización}_{\text{NDBI}} = \min(25.0, Rel\Delta_{\text{NDBI}} \times 100.0)$$

$$\text{Score} = \max(0, \min(100, 100 - (\text{Penalización}_{\text{NDVI}} + \text{Penalización}_{\text{NDMI}} + \text{Penalización}_{\text{NDBI}})))$$

### Niveles de Riesgo
* 🟢 **Bajo ($\ge 75$)**: Sin evidencia de degradación acelerada. Favorable para pre-evaluación.
* 🟡 **Medio ($50 \le \text{Score} < 75$)**: Variaciones moderadas respecto al entorno. Requiere auditoría técnica de campo.
* 🔴 **Alto ($< 50$)**: Alerta de degradación ambiental significativa en comparación con el entorno circundante.

---

## ⚙️ Configuración y Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto (este archivo y cualquier archivo `*.json` están protegidos en `.gitignore`):

```env
# Ruta local al archivo JSON de la Service Account (con roles Earth Engine Resource Writer y Cloud Datastore User)
GOOGLE_APPLICATION_CREDENTIALS=credentials/service-account.json

# ID de la base de datos Firestore Enterprise
FIRESTORE_DATABASE_ID=ag-tech

# Configuración del servidor
PORT=8000
HOST=0.0.0.0
```

---

## 🚀 Instalación y Ejecución

1. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Ejecutar el servidor FastAPI**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

3. **Acceder a la documentación interactiva**:
   - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 📡 Endpoints de la API

### 1. `POST /farms`
Registra una nueva granja con su polígono GeoJSON.

**Ejemplo de Request Body:**
```json
{
  "nombre": "Finca Agroexportadora El Porvenir",
  "geojson": {
    "type": "Polygon",
    "coordinates": [
      [
        [-74.0060, 4.7110],
        [-74.0010, 4.7110],
        [-74.0010, 4.7060],
        [-74.0060, 4.7060],
        [-74.0060, 4.7110]
      ]
    ]
  }
}
```

---

### 2. `POST /farms/{id}/analyze`
Ejecuta el pipeline satelital en Earth Engine (Sentinel-2), calcula los índices para la granja y el buffer de 500m, evalúa deltas y score, y persiste el resultado en Firestore (`ag-tech`).

**Ejemplo de Request Body (opcional, defaults a últimos 6 meses vs 2 años atrás):**
```json
{
  "periodoReciente": {
    "inicio": "2024-01-01",
    "fin": "2024-06-30"
  },
  "periodoReferencia": {
    "inicio": "2022-01-01",
    "fin": "2022-06-30"
  }
}
```

---

### 3. `GET /farms/{id}/certificate`
Devuelve el certificado de pre-evaluación más reciente para la granja con todo el desglose técnico, score, nivel de riesgo y resumen ejecutivo.

---

## 🧪 Pruebas Automatizadas

Ejecuta la suite de pruebas unitarias:
```bash
pytest
```
