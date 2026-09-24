# AgTech — Certificación de Impacto Ecológico Agrícola vía Imágenes Satelitales 🛰️🌱

## Perfiles públicos de parcelas

La portada `/` es el catálogo público TerraSync: tarjetas con datos de `GET /farms`,
búsqueda sin distinguir acentos y filtros combinados por estado y actividad.
Los polígonos se muestran en el mapa satelital existente en modo de consulta.
No permite crear parcelas ni ejecutar análisis. «Conocer parcela» abre el
micrositio público; el acceso de proveedor ofrece una sesión simulada. No se generan datos de
demostración en el navegador: para verlos hay que cargar las semillas manualmente.

La página usa Plus Jakarta Sans, JetBrains Mono y Material Symbols desde Google
Fonts, Leaflet desde su CDN y las capas Esri existentes. Si el mapa no carga,
las tarjetas y filtros siguen disponibles. Los módulos anteriores de dibujo y
análisis permanecen en el repositorio, pero no se cargan en la portada pública.

Pruebas del catálogo:

```powershell
node --test tests/catalog.test.cjs
# Con Playwright y Microsoft Edge disponibles, iniciar primero el servidor:
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010
# En otra terminal:
node tests/catalog.browser.cjs
```

La prueba de navegador intercepta `/farms` con datos de prueba. Cubre filtros,
registros antiguos, contenido tratado como texto, avisos, selección, ancho móvil,
vacío, error y reintento; verifica que no haya solicitudes de escritura. La carga
real del mapa depende del acceso a los servicios externos.

### Micrositio público

Cada tarjeta enlaza a `/parcela.html?id=<farmId>`, accesible directamente y al
recargar. Consulta el perfil mediante `GET /farms/{farm_id}` y muestra historia,
productor, actividad, ubicación y polígono. No requiere sesión.

El último análisis se consulta con `GET /farms/{farm_id}/certificate`, sin
modificar su contrato ni ejecutar análisis nuevos. Se muestran score, riesgo,
fecha, resumen, periodos y los índices registrados. No se implementan sellos
ni generación de certificados. La ausencia de análisis (404) se distingue de
un fallo de consulta; los errores permiten reintentar. Los datos incompletos
se indican explícitamente, sin valores inventados. El perfil permanece visible
cuando el análisis o el mapa no están disponibles.

Prueba adicional con el servidor de pruebas anterior en 8010:
`node tests/parcel.browser.cjs`. Usa respuestas simuladas y comprueba navegación,
mapa, resultados, vista móvil, errores, datos antiguos y ausencia de escrituras.

### Acceso de proveedor de demostración

En `.env`, configurar `DEMO_AUTH_ENABLED=true` y reiniciar Uvicorn. Por defecto
está desactivado. Desde el catálogo, «Iniciar sesión como proveedor» abre
`/acceso.html`; el formulario «Iniciar sesión» abre la sesión de una cooperativa
ficticia y permite cerrarla en `/proveedor.html`. Solo acepta el correo público `proveedor@demo.test` y la contraseña ficticia `demo123`. No
verifica identidades; cualquiera puede entrar. No usarlo para proteger datos reales.

Los tokens aleatorios vencen en una hora, residen en memoria del servidor y se
conservan en `sessionStorage` durante la pestaña. Reiniciar el servidor invalida
las sesiones; usar un solo worker. La pantalla revalida la sesión al recargar,
recuperar la pestaña y cada minuto. El backend verifica el vencimiento en cada
consulta protegida. El adaptador `frontend/js/auth.js` queda separado para
sustituirlo por Firebase Auth.

- `POST /auth/demo/session`: iniciar sesión con JSON `{"email":"proveedor@demo.test","password":"demo123"}`. Credenciales incorrectas: 401; cuerpo ausente: 422. Sustituye expresamente el acceso demo anterior sin campos.
- `GET /providers/me`: requiere `Authorization: Bearer <token>` vigente.
- `DELETE /auth/demo/session`: revocar el token; cierre idempotente.

La plantilla HTML es pública y no contiene información privada. Los endpoints
existentes de parcelas y análisis mantienen sus contratos y permisos; este
cambio no los protege. La sesión no escribe en Firestore y usa el mismo ID
`demo-provider-001` que las semillas. Después del login se abre «Mis parcelas».

### Mis parcelas

`/proveedor.html` consulta `GET /providers/me/farms` con el token de sesión.
El backend filtra por el proveedor de la sesión y devuelve únicamente sus
parcelas, de más reciente a más antigua. No acepta seleccionar otro proveedor
por parámetros. Las parcelas antiguas sin `providerId` siguen en el catálogo
público pero no se asignan automáticamente al proveedor demo.

El listado permite desplegar datos y abrir el perfil público con el análisis
disponible. Incluye carga, vacío, errores y reintento. «Agregar parcela» abre
el formulario de alta mediante dibujo descrito a continuación.
Si no hay parcelas asociadas a `demo-provider-001`, el listado estará vacío.
Para datos ficticios puede ejecutarse manualmente la carga de semillas descrita
abajo; esta etapa no las carga automáticamente.

Prueba del dashboard: con servidor en 8010 y Playwright/Edge disponibles,
`node tests/dashboard.browser.cjs`. Los datos se simulan sin escribir en Firestore.

### Agregar parcela

Después del login, abrir «Agregar parcela» en Mis parcelas. Acercar el mapa al
terreno, pulsar «Dibujar parcela», marcar las esquinas y cerrar en el primer punto.
Confirmar el polígono, completar el nombre y los datos opcionales, y guardar.
Se pueden descartar o redibujar polígonos antes de guardar. No hay importadores.

El formulario usa `POST /providers/me/farms` con la sesión actual. El servidor
asigna el proveedor y el marcador demo, valida la geometría con el modelo
existente y reutiliza la geocodificación configurada para ubicación faltante.
No requiere cargar semillas; la identidad del proveedor demo viene de la sesión.
La parcela se guarda realmente en Firestore y aparece también en el catálogo
público. El endpoint anterior `POST /farms` conserva su contrato.

Guardar no ejecuta Earth Engine ni genera análisis, sellos o certificados.
Ante error o timeout se conserva el formulario: revisar Mis parcelas antes
de repetir, ya que un reintento podría crear otro registro si el anterior se
guardó pero su respuesta no llegó. Tras éxito se bloquea el envío y se ofrecen
enlaces al listado y al perfil público.

Prueba de navegador: `node tests/add-parcel.browser.cjs`, con servidor en 8010
y Playwright/Edge. Dibuja mediante clics y simula el guardado sin escribir en nube.

Prueba de navegador: iniciar el servidor con demo habilitado en puerto 8011 y
ejecutar `node tests/auth.browser.cjs` con Playwright y Edge disponibles.
`AUTH_TEST_URL` permite cambiar la dirección. La prueba usa el backend de sesiones
real en memoria, sin escribir en Firestore. Las pruebas Python se ejecutan con
`.\venv\Scripts\python.exe -m pytest -q`.

`POST /farms` sigue aceptando únicamente `nombre` y `geojson` (Polygon o Feature
con Polygon). También acepta `providerId`, `productor`, `historia`,
`actividadEconomica`, `ciudad`, `municipio`, `estado` y `pais`, todos opcionales.
Si se proporciona `providerId`, debe existir en `providers`; de lo contrario
responde 422. La relación no prueba identidad ni concede autorización.

`GET /farms` devuelve un arreglo ordenado por fecha descendente y
`GET /farms/{farm_id}` devuelve el detalle (404 si no existe). Ambos son públicos
y de solo lectura: incluyen los cuatro campos anteriores de respuesta
(`farmId`, `nombre`, `geojson`, `fechaCreacion`), los campos del perfil,
`esDemostracion` y `ubicacionAtribucion`. No exponen `providerId` ni campos
adicionales internos del documento. Los registros antiguos siguen siendo legibles;
los datos nuevos faltantes aparecen como null y `esDemostracion` como false.
No hay nuevos estados de publicación ni autenticación en esta etapa.

El modelo `Provider` contiene `providerId`, `nombrePublico`, `fechaCreacion`
y `esDemostracion`. No se añadieron endpoints de administración de proveedores.

### Ubicación opcional

Para activar Nominatim, configurar en `.env`:

```env
GEOCODING_ENABLED=true
GEOCODING_URL=https://nominatim.openstreetmap.org/reverse
GEOCODING_USER_AGENT=AgTech/1.0 (contacto: correo-del-responsable)
GEOCODING_TIMEOUT_SECONDS=5
```

Está desactivado por defecto. Al activarlo se envía el primer vértice válido del
perímetro al servicio; es una referencia aproximada, no una determinación catastral.
Solo se completan campos faltantes durante la creación. No se sobrescriben datos
manuales ni se rellenan registros antiguos al consultarlos. Se aceptan resultados
parciales; errores HTTP, timeout o JSON inválido no impiden guardar la parcela.
`municipality` se usa para municipio; no se asume que `county` sea equivalente.

Se mantiene una caché de hasta 256 consultas por proceso y como máximo una solicitud
por segundo por proceso. Usar **un único worker** con el servicio público y coordinar
el consumo total con cualquier otro cliente; para escalar, configurar una instancia
propia o un servicio con límites apropiados. Al mostrar datos derivados, conservar
la atribución `© OpenStreetMap contributors (ODbL)` incluida en la respuesta.
Referencias: [API inversa de Nominatim](https://nominatim.org/release-docs/latest/api/Reverse/)
y [política del servicio](https://operations.osmfoundation.org/policies/nominatim/).

### Semillas de demostración

Ejecutar manualmente desde la raíz, con credenciales Firestore configuradas:

```powershell
.\venv\Scripts\python.exe -m scripts.seed_demo
```

Usa la base configurada (`ag-tech` por defecto). Crea un proveedor y dos parcelas
ficticias con identificadores `demo-*` y `esDemostracion=true`. Sus nombres, historias,
actividades, ubicación y polígonos son ejemplos, no perfiles verificados.
No consulta geocodificación ni Earth Engine. Repetir la carga no duplica registros;
una colisión con un documento distinto detiene la carga sin sobrescribirlo.
La carga no es transaccional: si falla puede repetirse y continuar con los faltantes.
No se ejecuta automáticamente al arrancar la aplicación.

Pruebas locales: `.\venv\Scripts\python.exe -m pytest -q`. Las pruebas usan
Firestore y geocodificación simulados; no acreditan conectividad con servicios reales.

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
